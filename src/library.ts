import { VMFun } from '@tejo/akso-script';
import { Gesture, Layer, TextLayer, Transaction, View } from './ui';
import { ExprFactory } from './expr-factory';
import { Def, evalExpr, Expr, FormVar, makeStdRefs, RawExpr } from './model';
import { initFormVarsTab } from './form-vars';
import { DefsView } from './defs-view';
import config from './config';
import { HelpTagged } from './help/help-tag';
import { Vec2 } from './spring';
import { ScrollView } from './scroll-view';
import { ComponentView, VNode } from './ui/component-view';

export interface Tab {
    id: string;
    view: ScrollView;
    itemList: ItemList;
}

/// This is the library of objects on the left-hand side.
export class Library extends View implements HelpTagged {
    defs: DefsView;
    layer: Layer;
    sideTabs: SideTabs;
    tabs: Record<string, Tab>;
    formVarsTab: { update(): void };

    constructor (defs: DefsView) {
        super();

        this.defs = defs;
        this.layer.background = config.library.background;

        this.sideTabs = new SideTabs(config.library.items, item => {
            this.toggleSelected(item);
        });

        this.tabs = {};
        for (const t in config.library.items) {
            const itemList = new ItemList({ items: [] });
            const view = new ScrollView();
            view.contentView.addSubview(itemList);

            this.tabs[t] = {
                id: t,
                view,
                itemList,
            };

            this.createTab(this.tabs[t]);
        }

        this.toggleSelected(Object.keys(config.library.items)[0]);
    }

    open () {
        if (this.pseudoSelected) this.toggleSelected(this.pseudoSelected);
    }

    get isOpen () {
        return !!this.selected;
    }

    get helpHidden () {
        return !this.isOpen;
    }

    close () {
        if (!this.selected) return;
        this.toggleSelected(this.selected);
        this.needsLayout = true;
        this.flushSubviews();
    }

    setRawExprMode () {
        // this is most probably the tab you want to use in this mode
        if (this.selected !== 'references') this.toggleSelected('references');
    }

    selected = null;
    pseudoSelected = null;

    toggleSelected (item) {
        if (this.selected === item) {
            this.selected = null;
        } else {
            this.selected = item;
            this.pseudoSelected = this.selected;
        }

        this.sideTabs.selected = this.selected;
        this.sideTabs.needsLayout = true;
        this.needsLayout = true;
        this.flushSubviews();
    }

    createTab (tab) {
        if (tab.id === 'primitives') {
            tab.itemList.update({
                items: [
                    new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'u' })),
                    new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'b', value: true })),
                    new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'n', value: 0 })),
                    new ExprFactory(this, ctx => ({ ctx, parent: null, type: 's', value: '' })),
                    new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'm', value: [] })),
                    new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'l', items: [] })),
                    new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'w', matches: [] })),
                ],
            });
        } else if (tab.id === 'stdlib') {
            const stdRefs = makeStdRefs();
            const items = [];
            for (const categoryName in config.stdlibCategories) {
                const category = config.stdlibCategories[categoryName];
                items.push(new SectionHeader(config.stdlibCategoryNames[categoryName]));
                for (const id of category) {
                    items.push(new ExprFactory(this, ctx => {
                        const expr: Expr.Call = {
                            ctx,
                            parent: null,
                            type: 'c',
                            func: {
                                ctx,
                                parent: null,
                                type: 'r',
                                name: id,
                                refNode: stdRefs.get(id),
                            },
                            args: [],
                        };
                        expr.func.parent = expr;
                        return expr;
                    }));
                }
            }
            tab.itemList.update({ items });
        } else if (tab.id === 'formVars') {
            this.formVarsTab = initFormVarsTab(this, tab);
            tab.view.stretchX = true;
            tab.itemList.needsLayout = true;
        }
    }

    updateTab (tab: Tab) {
        if (tab.id === 'references') {
            const items = [];

            if (!tab.itemList._byFormVar) tab.itemList._byFormVar = new WeakMap();
            if (!tab.itemList._byExtDef) tab.itemList._byExtDef = new WeakMap();
            if (!tab.itemList._byDef) tab.itemList._byDef = new WeakMap();
            const byFormVar = tab.itemList._byFormVar;
            const byExtDef = tab.itemList._byExtDef;
            const byDef = tab.itemList._byDef;

            for (const fvar of this.defs.defs.ctx.formVars) {
                if (!byFormVar.has(fvar)) byFormVar.set(fvar, {});
                const state = byFormVar.get(fvar);
                const name = '@' + fvar.name;

                if (name !== state.name) {
                    state.name = name;
                    if (!state.refExpr) {
                        state.refExpr = new ExprFactory(this, ctx => ({
                            ctx,
                            parent: null,
                            type: 'r',
                            name,
                        }));
                    } else {
                        state.refExpr.update(ctx => ({ ctx, type: 'r', name }));
                    }
                }

                if (state.refExpr) items.push(state.refExpr);
            }

            for (const script of this.defs.defs.ctx.externalDefs) {
                for (const name in script) {
                    if (typeof name !== 'string' || name.startsWith('_')) continue;
                    const def = script[name];
                    if (!byExtDef.has(def)) byExtDef.set(def, {});
                    const state = byExtDef.get(def);

                    if (name !== state.name) {
                        state.name = name;
                        if (!state.refExpr) {
                            state.refExpr = new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'r', name }));
                        } else {
                            state.refExpr.update(ctx => ({ ctx, type: 'r', name }));
                        }
                    }

                    // TODO: isCallable? arity? function calls

                    if (state.refExpr) items.push(state.refExpr);
                }
            }

            // TODO: defs from previous scripts (use section headers)
            for (const def of this.defs.defs.defs) {
                if (!byDef.has(def)) byDef.set(def, {});
                const state = byDef.get(def);
                const name = def.name;

                if (name !== state.name) {
                    state.name = name;
                    if (!state.refExpr) {
                        state.refExpr = new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'r', name }));
                    } else {
                        state.refExpr.update(ctx => ({ ctx, type: 'r', name }));
                    }
                }

                let isCallable = false;
                {
                    // check if it's a function
                    const ctx = this.defs.defs.ctx;
                    const refExpr: Expr.Ref = {
                        ctx,
                        parent: null,
                        type: 'r',
                        name,
                    };
                    refExpr.parent = {
                        ctx,
                        parent: this.defs.defs,
                        type: 'ds',
                        name: '__vmRefTemp',
                        expr: refExpr,
                    };

                    const evr = evalExpr(refExpr);
                    isCallable = evr && evr.result instanceof VMFun;
                }

                if (isCallable) {
                    const makeFn = (ctx, isDemo) => {
                        const funcRef: Expr.Ref = {
                            ctx,
                            parent: null,
                            type: 'r',
                            name,
                        };
                        const expr: Expr.Call = {
                            ctx,
                            parent: null,
                            type: 'c',
                            func: funcRef,
                            args: [],
                        };
                        funcRef.parent = expr;
                        if (isDemo) funcRef.refNode = def;
                        return expr;
                    };

                    if (!state.callExpr) {
                        state.callExpr = new ExprFactory(this, makeFn);
                    } else {
                        state.callExpr.update(makeFn);
                    }
                } else state.callExpr = null;

                if (state.refExpr) items.push(state.refExpr);
                if (state.callExpr) items.push(state.callExpr);
            }

            tab.itemList.update({ items });
        } else if (tab.id === 'formVars') {
            this.formVarsTab.update();
        }
    }

    isMinimized () {
        return this.selected === null;
    }

    getIntrinsicSize(): Vec2 {
        const sideTabsSize = this.sideTabs.getIntrinsicSize();
        const contentsWidth = this.isMinimized() ? 0 : config.sidebarWidth;

        return new Vec2(sideTabsSize.x + contentsWidth, 0);
    }

    layout () {
        this.needsLayout = false;

        this.sideTabs.height = this.size.y;
        this.sideTabs.size = this.sideTabs.layout();

        const contentsWidth = this.size.x - this.sideTabs.size.x;

        for (const t in this.tabs) {
            const tab = this.tabs[t];

            this.updateTab(tab);

            tab.view.position = [this.sideTabs.size.x, 0];
            tab.view.size = [contentsWidth, this.size.y];
            tab.view.layoutIfNeeded();
        }

        return this.size;
    }

    *iterSubviews () {
        yield this.sideTabs;

        const tab = this.tabs[this.pseudoSelected];
        if (tab) yield tab.view;
    }
}

type SideTabsOptions = { [k: string]: { title: string } };
type SideTabLayer = {
    id: string,
    bg: Layer,
    labelContainer: Layer,
    label: TextLayer,
};
class SideTabs extends View {
    selected = null;
    height = 0;
    options: SideTabsOptions;
    onSelect: (item: string) => void;
    tabLayers: SideTabLayer[];

    constructor (options: SideTabsOptions, onSelect: (item: string) => void) {
        super();
        this.options = options;
        this.onSelect = onSelect;

        this.layer.clipContents = true;
        this.layer.background = config.library.sideTabs.background;

        this.tabLayers = [];
        for (const k in this.options) {
            const bg = new Layer();
            bg.cornerRadius = 4;
            const labelContainer = new Layer();
            labelContainer.rotation = -90;
            const label = new TextLayer();
            labelContainer.addSublayer(label);
            label.text = this.options[k].title;
            label.font = config.identFont;

            this.tabLayers.push({
                id: k,
                bg,
                labelContainer,
                label,
            });
        }

        Gesture.onTap(this, null, this.onTapStart);
    }

    eventBounds = [];

    getIntrinsicSize(): Vec2 {
        let width = 0;
        let height = 0;

        for (const layer of this.tabLayers) {
            const textSize = layer.label.getNaturalSize();
            width = Math.max(width, 4 + textSize.y + 8);
            height += 16 + textSize.x + 16;
        }
        return new Vec2(width, height);
    }

    layout () {
        this.needsLayout = false;

        this.eventBounds = [];

        let width = 0;
        let y = 0;
        for (const layer of this.tabLayers) {
            const textSize = layer.label.getNaturalSize();
            const active = this.selected === layer.id;
            layer.bg.background = active
                ? config.library.sideTabs.activeTab
                : config.library.sideTabs.tab;
            const x = active ? 4 : 6;
            layer.bg.position = [x, y];
            layer.bg.size = [4 + textSize[1] + 8, 16 + textSize[0] + 16];
            layer.labelContainer.position = [x + 4 + textSize[1] / 2, y + 16 + textSize[0]];
            y += layer.bg.size[1];
            width = layer.bg.size[0];

            this.eventBounds.push({
                y: y - layer.bg.size[1],
                endY: y,
                id: layer.id,
            });
        }

        return new Vec2(width, this.height);
    }

    getItemAtY = (y: number) => {
        for (const bound of this.eventBounds) {
            if (bound.y <= y && bound.endY > y) {
                return bound.id;
            }
        }
    };

    onTapStart = ({ y }: { y: number }) => {
        const t = new Transaction(1, 0.3);
        const item = this.getItemAtY(y);
        if (item) this.onSelect(item);
        t.commitAfterLayout(this.ctx);
    };

    *iterSublayers () {
        for (const layer of this.tabLayers) {
            yield layer.bg;
            yield layer.labelContainer;
        }
    }
}

class SectionHeader extends View {
    labelLayer: TextLayer;

    constructor (label: string) {
        super();

        this.labelLayer = new TextLayer();
        this.labelLayer.text = label;
        this.labelLayer.font = config.sectionFont;
        this.addSublayer(this.labelLayer);
        this.needsLayout = true;
    }

    getIntrinsicSize(): Vec2 {
        const labelSize = this.labelLayer.getNaturalSize();
        return new Vec2(labelSize[0], labelSize[1] + 8);
    }

    layout () {
        this.needsLayout = false;
        const labelSize = this.labelLayer.getNaturalSize();
        this.labelLayer.position = [0, 8 + labelSize[1] / 2];
        return this.size;
    }
}

class ItemList extends ComponentView<{ items: View[] }> {
    wantsChildLayout = true;

    _byFormVar?: WeakMap<FormVar, { name?: string, refExpr?: ExprFactory }>;
    _byExtDef?: WeakMap<RawExpr, { name?: string, refExpr?: ExprFactory }>;
    _byDef?: WeakMap<Def, { name?: string, refExpr?: ExprFactory, callExpr?: ExprFactory }>;

    constructor(props) {
        super(props);

        this.layoutProps.layout = 'flex';
        this.layoutProps.direction = 'vertical';
        this.layoutProps.crossAlign = 'start';
        this.layoutProps.padding = new Vec2(8, 8);
        this.layoutProps.gap = 8;
    }

    renderContents(): VNode<any> | VNode<any>[] {
        return this.props.items;
    }
}


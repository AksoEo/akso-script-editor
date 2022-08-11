import { VMFun } from '@tejo/akso-script';
import { Gesture, Layer, TextLayer, Transaction, View } from './ui';
import { ExprFactory } from './expr-factory';
import { evalExpr, Expr, makeStdRefs } from './model';
import { Scrollbar } from './scrollbar';
import { initFormVarsTab } from './form-vars';
import { DefsView } from './defs-view';
import config from './config';
import { HelpTagged } from './help/help-tag';

/// This is the library of objects on the left-hand side.
export class Library extends View implements HelpTagged {
    defs: DefsView;
    layer: Layer;
    sideTabs: SideTabs;
    tabs: { [k: string]: { id: string, view: Scrollable, itemList: ItemList } };
    onRequestLinearView: (() => void) | null = null;
    formVarsTab: { update(): void };

    constructor (defs) {
        super();

        this.defs = defs;
        this.layer.background = config.library.background;

        this.sideTabs = new SideTabs(config.library.items, item => {
            this.toggleSelected(item);
        });

        this.tabs = {};
        for (const t in config.library.items) {
            const itemList = new ItemList();
            const view = new Scrollable(itemList);

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
            if (this.defs.useGraphView) {
                if (this.onRequestLinearView) this.onRequestLinearView();
                else return;
            }
            this.selected = item;
            this.pseudoSelected = this.selected;
        }

        this.sideTabs.selected = this.selected;
        this.sideTabs.needsLayout = true;
        if (this.parent) this.parent.needsLayout = true;
        this.needsLayout = true;
        this.flushSubviews();
    }

    createTab (tab) {
        if (tab.id === 'primitives') {
            tab.itemList.items = [
                new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'u' })),
                new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'b', value: true })),
                new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'n', value: 0 })),
                new ExprFactory(this, ctx => ({ ctx, parent: null, type: 's', value: '' })),
                new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'm', value: [] })),
                new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'r', name: '' })),
                new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'l', items: [] })),
                new ExprFactory(this, ctx => {
                    const expr: Expr.FnDef = {
                        ctx,
                        parent: null,
                        type: 'f',
                        params: [],
                        body: {
                            ctx,
                            parent: null,
                            type: 'd',
                            defs: new Set(),
                            floatingExpr: new Set(),
                        },
                    };
                    expr.body.parent = expr;
                    return expr;
                }),
                new ExprFactory(this, ctx => ({ ctx, parent: null, type: 'w', matches: [] })),
            ];
            tab.itemList.needsLayout = true;
        } else if (tab.id === 'stdlib') {
            const stdRefs = makeStdRefs();
            tab.itemList.items = [];
            for (const categoryName in config.stdlibCategories) {
                const category = config.stdlibCategories[categoryName];
                tab.itemList.items.push(new SectionHeader(config.stdlibCategoryNames[categoryName]));
                for (const id of category) {
                    tab.itemList.items.push(new ExprFactory(this, ctx => {
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
            tab.itemList.needsLayout = true;
        } else if (tab.id === 'formVars') {
            tab.itemList.items = [];
            this.formVarsTab = initFormVarsTab(this, tab);
            tab.itemList.needsLayout = true;
        }
    }
    updateTab (tab) {
        if (tab.id === 'references') {
            if (!tab.itemList._byExtDef) tab.itemList._byExtDef = new WeakMap();
            if (!tab.itemList._byDef) tab.itemList._byDef = new WeakMap();
            const byExtDef = tab.itemList._byExtDef;
            const byDef = tab.itemList._byDef;
            tab.itemList.items = [];

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

                    if (state.refExpr) tab.itemList.items.push(state.refExpr);
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

                if (state.refExpr) tab.itemList.items.push(state.refExpr);
                if (state.callExpr) tab.itemList.items.push(state.callExpr);
            }

            tab.itemList.needsLayout = true;
        } else if (tab.id === 'formVars') {
            this.formVarsTab.update();
        }
    }

    isMinimized () {
        return this.selected === null;
    }
    getMinimizedWidth () {
        this.sideTabs.layoutIfNeeded();
        return this.sideTabs.size[0];
    }

    layout () {
        super.layout();
        this.sideTabs.height = this.size[1];
        this.sideTabs.layout();

        const contentsWidth = this.size[0] - this.sideTabs.size[0];

        for (const t in this.tabs) {
            const tab = this.tabs[t];

            this.updateTab(tab);

            tab.view.position = [this.sideTabs.size[0], 0];
            tab.view.size = [contentsWidth, this.size[1]];
            tab.view.layoutIfNeeded();
        }
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

    layout () {
        super.layout();

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

        this.layer.size = [width, this.height];
    }

    getItemAtY = y => {
        for (const bound of this.eventBounds) {
            if (bound.y <= y && bound.endY > y) {
                return bound.id;
            }
        }
    };

    onTapStart = ({ y }) => {
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

    constructor (label) {
        super();

        this.labelLayer = new TextLayer();
        this.labelLayer.text = label;
        this.labelLayer.font = config.sectionFont;
        this.addSublayer(this.labelLayer);
        this.needsLayout = true;
    }
    layout () {
        const paddingTop = 8;
        const labelSize = this.labelLayer.getNaturalSize();
        this.labelLayer.position = [0, paddingTop + labelSize[1] / 2];
        this.layer.size = [labelSize[0], labelSize[1] + paddingTop];
    }
}

class Scrollable extends View {
    contents: View;
    scrollbar: Scrollbar;

    constructor (contents: View) {
        super();
        this.contents = contents;
        this.layer.clipContents = true;

        this.scrollbar = new Scrollbar();
        this.scrollbar.onScroll = dy => this.onScroll({ dy });

        Gesture.onScroll(this, this.onScroll);
    }

    scroll = 0;

    didAttach (ctx) {
        super.didAttach(ctx);

        // HACK: force update scrollbar
        setTimeout(() => {
            this.needsLayout = true;
        }, 100);
    }

    layout () {
        super.layout();

        // FIXME: some better way of doing this...
        (this.contents as any).parentWidth = this.size[0];
        this.contents.layoutIfNeeded();

        const scrollMin = 0;
        const scrollMax = Math.max(0, this.contents.size[1] - this.size[1]);

        this.scroll = Math.max(scrollMin, Math.min(this.scroll, scrollMax));

        this.scrollbar.edgeX = this.size[0];
        this.scrollbar.height = this.size[1];
        this.scrollbar.scrollMax = scrollMax;
        this.scrollbar.scroll = this.scroll;
        this.scrollbar.layout();

        // FIXME: ditto
        (this.contents as any).visibleBoundsY = [this.scroll, this.scroll + this.size[1]];
        this.contents.position = [0, -this.scroll];
        this.contents.flushSubviews();
    }

    onScroll = ({ dy }) => {
        this.scroll += dy;
        this.needsLayout = true;
    };

    *iterSubviews () {
        yield this.contents;
        yield this.scrollbar;
    }
}

class ItemList extends View {
    wantsChildLayout = true;
    parentWidth = 0;
    visibleBoundsY: [number, number] | null = null;

    items = [];

    layout () {
        super.layout();

        let width = 0;
        let y = 8;

        for (const item of this.items) {
            item.parentWidth = this.parentWidth - 32;
            item.layoutIfNeeded();
            item.position = [16, y];
            y += item.size[1] + 8;
            width = Math.max(width, 32 + item.size[0]);
        }

        this.layer.size = [width, y];
    }

    *iterSubviews () {
        for (const item of this.items) {
            if (this.visibleBoundsY) {
                const boundMin = item.position[1];
                const boundMax = item.position[1] + item.size[1];
                const isVisible = boundMax > this.visibleBoundsY[0] && boundMin < this.visibleBoundsY[1];
                if (!isVisible) continue;
            }
            yield item;
        }
    }
}


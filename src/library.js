import { VMFun } from '@tejo/akso-script';
import { View, Layer, TextLayer, Transaction } from './ui';
import { ExprView } from './expr-view';
import { getProtoView } from './proto-pool';
import { makeStdRefs, createContext, evalExpr } from './model';
import Scrollbar from './scrollbar';
import config from './config';

/// This is the library of objects on the left-hand side.
export class Library extends View {
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

    close () {
        if (!this.selected) return;
        this.toggleSelected(this.selected);
        this.needsLayout = true;
        this.flushSubviews();
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
                new ExprFactory(this, ctx => ({ ctx, type: 'u' })),
                new ExprFactory(this, ctx => ({ ctx, type: 'b', value: true })),
                new ExprFactory(this, ctx => ({ ctx, type: 'n', value: 0 })),
                new ExprFactory(this, ctx => ({ ctx, type: 's', value: '' })),
                new ExprFactory(this, ctx => ({ ctx, type: 'm', value: [] })),
                new ExprFactory(this, ctx => ({ ctx, type: 'r', name: '' })),
                new ExprFactory(this, ctx => ({ ctx, type: 'f', params: [], body: {
                    ctx,
                    type: 'd',
                    defs: new Set(),
                    floatingExpr: new Set(),
                } })),
                new ExprFactory(this, ctx => ({ ctx, type: 'w', matches: [] })),
            ];
            tab.itemList.needsLayout = true;
        } else if (tab.id === 'stdlib') {
            const stdRefs = makeStdRefs();
            tab.itemList.items = [];
            for (const categoryName in config.stdlibCategories) {
                const category = config.stdlibCategories[categoryName];
                for (const id of category) {
                    tab.itemList.items.push(new ExprFactory(this, ctx => ({
                        ctx,
                        type: 'c',
                        func: { ctx, type: 'r', name: id, refNode: stdRefs.get(id) },
                        args: [],
                    })));
                }
            }
            tab.itemList.needsLayout = true;
        }
    }
    updateTab (tab) {
        if (tab.id === 'references') {
            if (!tab.itemList._byDef) tab.itemList._byDef = new WeakMap();
            const byDef = tab.itemList._byDef;
            tab.itemList.items = [];
            for (const def of this.defs.defs.defs) {
                if (!byDef.has(def)) byDef.set(def, {});
                const state = byDef.get(def);
                const name = def.name;

                if (name !== state.name) {
                    state.name = name;
                    if (!state.refExpr) {
                        state.refExpr = new ExprFactory(this, ctx => ({ ctx, type: 'r', name }));
                    } else {
                        state.refExpr.update(ctx => ({ ctx, type: 'r', name }));
                    }
                }

                let isCallable = false;
                {
                    // check if it's a function
                    const ctx = this.defs.defs.ctx;
                    const refExpr = { ctx, type: 'r', name };
                    const tmpDef = { ctx, type: 'ds', name: '__vmRefTemp', expr: refExpr };
                    tmpDef.parent = this.defs.defs;
                    refExpr.parent = tmpDef;

                    const evr = evalExpr(refExpr);
                    isCallable = evr && evr.result instanceof VMFun;
                }

                if (isCallable) {
                    const makeFn = (ctx, isDemo) => {
                        const expr = {
                            ctx,
                            type: 'c',
                            func: { ctx, type: 'r', name },
                            args: [],
                        };
                        if (isDemo) expr.func.refNode = def;
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

class SideTabs extends View {
    selected = null;
    height = 0;

    constructor (options, onSelect) {
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

        this.needsLayout = true;
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

    onPointerStart ({ y }) {
        const t = new Transaction(1, 0.3);
        for (const bound of this.eventBounds) {
            if (bound.y <= y && bound.endY > y) {
                this.onSelect(bound.id);
            }
        }
        t.commitAfterLayout(this.ctx);
    }

    *iterSublayers () {
        for (const layer of this.tabLayers) {
            yield layer.bg;
            yield layer.labelContainer;
        }
    }
}

class Scrollable extends View {
    constructor (contents) {
        super();
        this.contents = contents;
        this.layer.clipContents = true;

        this.scrollbar = new Scrollbar();
        this.scrollbar.onScroll = dy => this.onScroll({ dy });
    }

    scroll = 0;

    layout () {
        super.layout();

        this.contents.layoutIfNeeded();

        const scrollMin = 0;
        const scrollMax = Math.max(0, this.contents.size[1] - this.size[1]);

        this.scroll = Math.max(scrollMin, Math.min(this.scroll, scrollMax));

        this.scrollbar.edgeX = this.size[0];
        this.scrollbar.height = this.size[1];
        this.scrollbar.scrollMax = scrollMax;
        this.scrollbar.scroll = this.scroll;
        this.scrollbar.layout();

        this.contents.visibleBoundsY = [this.scroll, this.scroll + this.size[1]];
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

    items = [];

    layout () {
        super.layout();

        let width = 0;
        let y = 8;

        for (const item of this.items) {
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

class ExprFactory extends View {
    constructor (lib, makeExpr) {
        super();
        this.lib = lib;
        this.makeExpr = makeExpr;
        this.exprCtx = createContext();
        this.exprCtx.onMutation(() => {
            this.needsLayout = true;
        });
        this.expr = makeExpr(this.exprCtx, true);
    }

    wantsChildLayout = true;

    update = makeExpr => {
        this.makeExpr = makeExpr;
        this.expr = makeExpr(this.exprCtx, true);
        this.needsLayout = true;
    };

    layout () {
        super.layout();
        const exprView = getProtoView(this.expr, ExprView);
        exprView.noInteraction = true;
        exprView._isDemo = true;
        exprView.decorationOnly = true;
        exprView.layoutIfNeeded();
        this.layer.size = exprView.size;
    }

    #dragStartPos = [0, 0];
    #createdDragRef = null;

    onPointerStart ({ absX, absY }) {
        this.#dragStartPos = [absX, absY];
        this.#createdDragRef = false;
    }

    createInstance () {
        const expr = this.makeExpr(this.lib.defs.defs.ctx);
        const exprView = getProtoView(expr, ExprView);
        exprView.dragController = this.lib.defs.dragController;
        exprView.decorationOnly = true;
        this.lib.defs.addFloatingExpr(expr);
        const defsPos = this.lib.defs.absolutePosition;
        const ownPos = this.absolutePosition;
        exprView.position = [ownPos[0] - defsPos[0], ownPos[1] - defsPos[1]];
        return expr;
    }

    onPointerDrag ({ absX, absY }) {
        if (this.#createdDragRef) {
            this.lib.defs.dragController.moveExprDrag(absX, absY);
        } else {
            const distance = Math.hypot(absX - this.#dragStartPos[0], absY - this.#dragStartPos[1]);
            if (distance > 6) {
                this.#createdDragRef = this.createInstance();
                const t = new Transaction(1, 0.3);
                this.lib.defs.dragController.beginExprDrag(this.#createdDragRef, absX, absY);
                this.lib.defs.showTrash = false; // don't show trash on initial drag
                t.commitAfterLayout(this.ctx);
            }
        }
    }

    onPointerEnd () {
        if (this.#createdDragRef) {
            const exprView = getProtoView(this.#createdDragRef, ExprView);
            exprView.decorationOnly = false;
            this.lib.defs.dragController.endExprDrag();
        } else {
            const expr = this.createInstance();
            const exprView = getProtoView(expr, ExprView);
            exprView.decorationOnly = false;

            const t = new Transaction(0.8, 0.5);
            exprView.position = [16, 16];
            t.commit();
        }
    }

    *iterSubviews () {
        yield getProtoView(this.expr, ExprView);
    }
}

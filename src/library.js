import { View } from './view';
import { ExprView } from './expr-view';
import { Layer, TextLayer, Transaction } from './layer';
import { getProtoView } from './proto-pool';
import { makeStdRefs } from './model';
import config from './config';

export class Library extends View {
    constructor (defs) {
        super();

        this.defs = defs;

        this.sideTabs = new SideTabs(config.library.items, item => {
            this.toggleSelected(item);
        });

        this.toggleSelected(Object.keys(config.library.items)[0]);

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
        if (this.parent) this.parent.needsLayout = true;
        this.needsLayout = true;
        this.flushSubviews();
    }

    createTab (tab) {
        const ctx = this.defs.defs.ctx;
        if (tab.id === 'primitives') {
            tab.itemList.items = [
                new ExprFactory({ ctx, type: 'u' }),
                new ExprFactory({ ctx, type: 'b', value: true }),
                new ExprFactory({ ctx, type: 'n', value: 0 }),
                new ExprFactory({ ctx, type: 's', value: '' }),
                new ExprFactory({ ctx, type: 'm', value: [] }),
                new ExprFactory({ ctx, type: 'r', name: '' }),
                new ExprFactory({ ctx, type: 'f', params: [], body: {} }),
                new ExprFactory({
                    ctx,
                    type: 'w',
                    matches: [],
                }),
            ];
            tab.itemList.needsLayout = true;
        } else if (tab.id === 'stdlib') {
            const stdRefs = makeStdRefs();
            tab.itemList.items = [];
            for (const categoryName in config.stdlibCategories) {
                const category = config.stdlibCategories[categoryName];
                for (const id of category) {
                    tab.itemList.items.push(new ExprFactory({
                        ctx,
                        type: 'c',
                        func: {
                            ctx,
                            type: 'r',
                            name: id,
                            refNode: stdRefs.get(id),
                        },
                        args: [],
                    }));
                }
            }
            tab.itemList.needsLayout = true;
        }
    }
    updateTab (tab) {
        // TODO
        void tab;
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
        this.sideTabs.layoutIfNeeded();

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

        this.tabLayers = [];
        for (const k in this.options) {
            const bg = new Layer();
            bg.eventTarget = this;
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
                ? config.library.sideTabs.activeBackground
                : config.library.sideTabs.background;
            layer.bg.position = [0, y];
            layer.bg.size = [4 + textSize[1] + 4, 16 + textSize[0] + 16];
            layer.labelContainer.position = [4 + textSize[1] / 2, y + 16 + textSize[0]];
            y += layer.bg.size[1];
            width = layer.bg.size[0];

            this.eventBounds.push({
                y: y - layer.bg.size[1],
                endY: y,
                id: layer.id,
            });
        }

        this.layer.size = [width, y];
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
    }

    scroll = 0;

    layout () {
        super.layout();

        this.contents.layoutIfNeeded();

        const scrollMin = 0;
        const scrollMax = Math.max(0, this.contents.size[1] - this.size[1]);
        this.scroll = Math.max(scrollMin, Math.min(this.scroll, scrollMax));

        this.contents.position = [0, -this.scroll];
    }

    onScroll ({ dy }) {
        this.scroll += dy;
        this.needsLayout = true;
    }

    *iterSubviews () {
        yield this.contents;
    }
}

class ItemList extends View {
    items = [];

    layout () {
        super.layout();

        let width = 0;
        let y = 8;

        for (const item of this.items) {
            item.layout();
            item.position = [16, y];
            y += item.size[1] + 8;
            width = Math.max(width, 32 + item.size[0]);
        }

        this.layer.size = [width, y];
    }

    *iterSubviews () {
        for (const item of this.items) yield item;
    }
}

class ExprFactory extends View {
    constructor (expr) {
        super();
        this.expr = expr;
    }

    layout () {
        super.layout();
        const exprView = getProtoView(this.expr, ExprView);
        exprView.layout();
        this.size = exprView.size;
    }

    *iterSubviews () {
        yield getProtoView(this.expr, ExprView);
    }
}

import dagre from 'dagre';
import { View, TextLayer, ArrowLayer, Transaction, Gesture } from './ui';
import { viewPool, getProtoView } from './proto-pool';
import { Scrollbar } from './scrollbar';
import config from './config';
import { ExprSlot, ExprView } from './expr-view';
import { remove as removeNode } from './model';

/// Renders a set of definitions.
export class DefsView extends View {
    scroll = [0, 0];

    dragController = new DragController(this);

    constructor (defs) {
        super();

        this.layer.background = config.defs.background;

        this.scrollAnchor = new DefsAnchorView();
        this.defs = defs;

        this.scrollbar = new Scrollbar();
        this.scrollbar.onScroll = this.onScrollbarScrollY;

        this.trash = new Trash();
        this.trash.dragController = this.dragController;

        this.addDefView = new AddDefView(this.addDef);

        Gesture.onScroll(this, this.onScroll);
    }

    /// List of arrows by source
    #arrows = new Map();

    addDef = () => {
        const newDef = {
            ctx: this.defs.ctx,
            type: 'ds',
            name: config.defs.newDefName(this.defs.defs.size),
            expr: null,
            parent: this.defs,
        };

        const newDefView = getProtoView(newDef, DefView);
        newDefView.position = this.addDefView.position;
        newDefView.size = this.addDefView.size;

        const t = new Transaction(1, 0.3);

        this.defs.defs.add(newDef);
        this.defs.ctx.notifyMutation(this.defs);
        t.commitAfterLayout(this.ctx);
    };

    onScroll = ({ dx, dy }) => {
        this.scroll[0] += dx;
        this.scroll[1] += dy;
        this.needsLayout = true;
    };

    onScrollbarScrollY = (dy) => {
        this.scroll[1] += dy;
        this.needsLayout = true;
    };

    get offset () {
        const pos = this.layer.absolutePosition;
        return [-pos[0] + this.scroll[0], -pos[1] + this.scroll[1]];
    }

    #useGraphView = false;
    get useGraphView () {
        return this.#useGraphView;
    }
    set useGraphView (value) {
        this.#useGraphView = value;
        this.needsLayout = true;
    }

    #showTrash = false;
    get showTrash () {
        return this.#showTrash;
    }
    set showTrash (value) {
        this.#showTrash = value;
        this.needsLayout = true;
    }

    layout () {
        super.layout();

        let t;
        if (this.leftTrash !== this._wasLeftTrash) t = new Transaction(1, 0);
        else t = new Transaction(1, 0.3);
        this._wasLeftTrash = this.leftTrash;
        if (this.leftTrash) {
            this.trash.size = [
                this.leftTrashWidth,
                this.size[1],
            ];
            this.trash.position = [-this.trash.size[0], 0];
        } else {
            this.trash.size = [
                186,
                Math.min(this.size[1] * 0.5, 100),
            ];
            this.trash.position = [
                8,
                this.showTrash
                    ? this.size[1] - this.trash.size[1] - 8
                    : this.size[1],
            ];
            this.trash.layer.opacity = 1;
        }
        this.trash.isLeftTrash = this.leftTrash;
        this.trash.shouldShow = this.showTrash;
        this.trash.decorationOnly = !this.showTrash;
        this.trash.layout();
        t.commit();

        this.layer.clipContents = this.useGraphView;

        // perform layout on all defs so we have their sizes
        for (const item of this.defs.defs) {
            const itemView = getProtoView(item, DefView);
            itemView.usingGraphView = this.useGraphView;
            itemView.parentWidth = this.size[0];
            itemView.dragController = this.dragController;
            itemView.layout();
        }

        if (this.useGraphView) {
            this.scrollAnchor.position = [-this.scroll[0], -this.scroll[1]];
            this.performGraphLayout();

            const offset = this.offset;

            // calculate arrows
            for (const item of this.defs.defs) {
                const itemView = getProtoView(item, DefView);
                if (!this.#arrows.has(item)) this.#arrows.set(item, new Map());
                const arrows = this.#arrows.get(item);
                const refSources = new Set();
                for (const ref of item.referencedBy) {
                    refSources.add(ref.source);
                    const view = viewPool.get(ref.source);
                    if (!view) continue;
                    const absPos = [
                        view.absolutePosition[0] + view.size[0] / 2 + offset[0],
                        view.absolutePosition[1] + offset[1],
                    ];

                    let t;
                    if (!arrows.has(ref.source)) {
                        arrows.set(ref.source, new ArrowLayer());
                        t = new Transaction(1, 0);
                    }
                    const arrow = arrows.get(ref.source);

                    arrow.stroke = [0, 0, 0, 0.5];

                    arrow.strokeWidth = 4;
                    arrow.start = [
                        itemView.position[0] + itemView.size[0] / 2,
                        itemView.position[1] + itemView.size[1],
                    ];
                    arrow.end = absPos;
                    const deltaY = arrow.end[1] - arrow.start[1];
                    const controlDY = deltaY < 0
                        ? 35 - deltaY / 3
                        : 35 + deltaY / 10;
                    arrow.control1 = [arrow.start[0], arrow.start[1] + controlDY];
                    arrow.control2 = [arrow.end[0], arrow.end[1] - controlDY];
                    if (t) t.commit();
                }

                for (const k of arrows.keys()) {
                    if (!refSources.has(k)) {
                        arrows.delete(k);
                    }
                }
            }

            for (const k of this.#arrows.keys()) {
                if (!this.defs.defs.has(k)) {
                    this.#arrows.delete(k);
                }
            }
        } else {
            const { maxWidth, y } = this.performLinearLayout();
            this.#arrows.clear();

            const minX = 0;
            const maxX = Math.max(0, maxWidth - this.size[0]);
            const minY = 0;
            const maxY = Math.max(0, y - this.size[1]);
            this.scroll[0] = Math.max(minX, Math.min(this.scroll[0], maxX));
            this.scroll[1] = Math.max(minY, Math.min(this.scroll[1], maxY));

            this.scrollbar.edgeX = this.size[0];
            this.scrollbar.height = this.size[1];
            this.scrollbar.scroll = this.scroll[1];
            this.scrollbar.scrollMax = maxY;
            this.scrollbar.layout();

            this.scrollAnchor.position = [-this.scroll[0], -this.scroll[1]];
        }

        this.scrollAnchor.defs = this.defs;
        this.scrollAnchor.addDefView = !this.useGraphView ? this.addDefView : null;
        this.scrollAnchor.arrows = this.#arrows;
        this.scrollAnchor.flushSubviews();
        this.scrollAnchor.layout();
    }

    tentativeDef = null;
    tentativeInsertPos = null;

    performLinearLayout () {
        let maxWidth = 0;
        let y = 0;
        let i = 0;
        this.tentativeInsertPos = null;
        for (const def of this.defs.defs) {
            const defView = getProtoView(def, DefView);
            if (defView._isBeingDragged) continue;

            if (this.tentativeDef) {
                const [ty, theight] = this.tentativeDef;
                const py = ty + theight / 2;
                if (y <= py && y + defView.size[1] + 1 >= py) {
                    y += theight;
                    this.tentativeInsertPos = i;
                }
            }

            defView.position = [0, y];
            y += defView.size[1] + 1;
            maxWidth = Math.max(maxWidth, defView.size[0]);
            i++;
        }

        this.addDefView.parentWidth = this.size[0];
        this.addDefView.layout();
        this.addDefView.position = [0, y];
        y += this.addDefView.size[1] + 24;

        if (this.tentativeDef && this.tentativeInsertPos === null) {
            // did not find an insertion point; probably because it’s out of bounds
            this.tentativeInsertPos = this.defs.defs.size;
        }
        return { maxWidth, y };
    }

    performGraphLayout () {
        this.tentativeInsertPos = null;

        const id2def = new Map();
        const def2id = new Map();
        let idCounter = 0;
        for (const def of this.defs.defs) {
            const id = `cats${idCounter++}`;
            id2def.set(id, def);
            def2id.set(def, id);
        }

        const g = new dagre.graphlib.Graph();
        g.setGraph({
            rankdir: 'TB',
            marginx: 8,
            marginy: 8,
            nodesep: 16,
        });
        g.setDefaultEdgeLabel(() => ({}));

        for (const [id, def] of id2def) {
            const defView = getProtoView(def, DefView);

            g.setNode(id, {
                id,
                width: defView.size[0],
                height: defView.size[1],
            });

            for (const ref of def.references) {
                if (!ref.target) continue;
                const targetId = def2id.get(ref.target);
                if (!targetId) continue; // probably an stdlib item
                g.setEdge(targetId, id);
            }
        }

        dagre.layout(g);

        for (const id of g.nodes()) {
            const node = g.node(id);
            const def = id2def.get(id);

            const defView = getProtoView(def, DefView);
            if (defView._isBeingDragged) continue;
            defView.position = [node.x - defView.size[0] / 2, node.y - defView.size[1] / 2];
        }
    }

    addFloatingExpr (expr) {
        this.defs.floatingExpr.add(expr);
        this.defs.ctx.notifyMutation(this.defs);
        this.addSubview(getProtoView(expr, ExprView));
        this.flushSubviews();
    }
    removeFloatingExpr (expr) {
        this.defs.floatingExpr.delete(expr);
        this.removeSubview(getProtoView(expr, ExprView));
        this.defs.ctx.notifyMutation(this.defs);
    }

    putTentative (y, height) {
        if (this.useGraphView) return;
        this.tentativeDef = [y, height];
        this.needsLayout = true;
    }
    endTentative (def) {
        if (def && this.tentativeInsertPos !== null) {
            const defs = [...this.defs.defs];
            defs.splice(this.tentativeInsertPos, 0, def);
            this.defs.defs = new Set(defs);
            def.parent = this.defs;
            this.defs.ctx.notifyMutation(def);
            this.defs.ctx.notifyMutation(this.defs);
        }
        this.tentativeDef = null;
        this.needsLayout = true;
    }

    *iterSubviews () {
        this.scrollAnchor.flushSubviews();
        yield this.scrollAnchor;
        yield this.trash;
        if (!this.useGraphView) yield this.scrollbar;
    }
}

class DefsAnchorView extends View {
    defs = { defs: [] };
    floatingExpr = [];
    arrows = [];
    arrowContainer = new DefsArrows();
    layout () {
        super.layout();
        this.arrowContainer.arrows = this.arrows;
        this.arrowContainer.flushSubviews();
    }
    *iterSubviews () {
        this.arrowContainer.flushSubviews();
        yield this.arrowContainer;
        for (const item of this.defs.defs) {
            yield getProtoView(item, DefView);
        }
        if (this.addDefView) yield this.addDefView;
        for (const expr of this.floatingExpr) yield getProtoView(expr, ExprView);
    }
}

class DefsArrows extends View {
    arrows = [];
    *iterSublayers () {
        for (const arrows of this.arrows.values()) for (const arrow of arrows.values()) yield arrow;
    }
}

/// Renders a single definition.
class DefView extends View {
    wantsChildLayout = true;

    constructor (def) {
        super();

        this.def = def;

        this.refView = new ExprView({
            type: 'r',
            name: '',
        });
        this.refView.isDef = true;
        this.refView.onDefRename = this.onRename;
        this.refView.dragController = this;

        this.eqLayer = new TextLayer();
        this.eqLayer.font = config.identFont;
        this.eqLayer.text = '=';

        this.layer.background = config.def.background;

        this.exprSlot = new ExprSlot(expr => {
            this.def.expr = expr;
            expr.parent = this.def;
            this.def.ctx.notifyMutation(expr);
            this.def.ctx.notifyMutation(this.def);
        }, this.def.ctx);
        this.needsLayout = true;
    }

    #usingGraphView = false;
    get usingGraphView () {
        return this.#usingGraphView;
    }
    set usingGraphView (value) {
        if (value === this.usingGraphView) return;
        this.#usingGraphView = value;
        this.needsLayout = true;
    }

    onPointerStart ({ absX, absY }) {
        this.dragController.beginDefDrag(this.def, absX, absY);
    }
    onPointerDrag ({ absX, absY }) {
        this.dragController.moveDefDrag(absX, absY);
    }
    onPointerEnd () {
        this.dragController.endDefDrag();
    }

    // fake dragcontroller interface for the left hand side
    #dragStartPos = [0, 0];
    #createdDragRef = false;
    beginExprDrag (expr, x, y) {
        this.#dragStartPos = [x, y];
        this.#createdDragRef = false;
    }
    createDragRef (x, y) {
        const ref = { ctx: this.def.ctx, type: 'r', name: this.def.name };
        const refView = getProtoView(ref, ExprView);
        const transaction = new Transaction(1, 0);
        refView.dragController = this.dragController;
        const refPos = this.refView.absolutePosition;
        const defsPos = this.dragController.defs.absolutePosition;
        refView.position = [refPos[0] - defsPos[0], refPos[1] - defsPos[1]];
        this.dragController.defs.addFloatingExpr(ref);
        this.dragController.beginExprDrag(ref, x, y);
        transaction.commit();
    }
    moveExprDrag (x, y) {
        if (this.#createdDragRef) {
            this.dragController.moveExprDrag(x, y);
        } else {
            const distance = Math.hypot(x - this.#dragStartPos[0], y - this.#dragStartPos[1]);
            if (distance > 6) {
                this.createDragRef(x, y);
                this.#createdDragRef = true;
            }
        }
    }
    endExprDrag () {
        if (this.#createdDragRef) {
            this.dragController.endExprDrag();
        }
    }

    onRename = name => {
        if (name === this.def.name) return; // nothing to do
        if (name.startsWith('@') || name.startsWith('_')) {
            // TODO: handle better
            alert('illegal identifier');
            return;
        }

        let isDup = false;
        for (const category in config.stdlibCategories) {
            if (config.stdlibCategories[category].includes(name)) {
                isDup = true;
                break;
            }
        }

        if (this.def.parent && !isDup) {
            const defs = this.def.parent;
            for (const def of defs.defs) {
                if (def.name === name) {
                    isDup = true;
                    break;
                }
            }
        }
        if (isDup) {
            // TODO: handle better
            alert('duplicate identifier');
            return;
        }

        this.def.name = name;

        const refSources = new Set();
        for (const ref of this.def.referencedBy) {
            refSources.add(ref.source);
            if (ref.source.type === 'r') {
                ref.source.name = this.def.name;
            } else if (ref.source.type === 'c') {
                ref.source.func.name = this.def.name;
            } else {
                console.warn(`Failed to rename to ${name} in ref with type ${ref.source.type}`);
            }
            ref.source.ctx.notifyMutation(ref.source);
        }


        this.def.ctx.notifyMutation(this.def);

        setTimeout(() => {
            // a bit hacky: wait for refs to update
            // refs have now updated; do we have any new ones?
            for (const ref of this.def.referencedBy) {
                if (!refSources.has(ref.source)) {
                    // they need updating too
                    ref.source.ctx.notifyMutation(ref.source);
                }
            }
        }, 10);

        new Transaction(1, 0.3).commitAfterLayout(this.ctx);
    };

    set needsLayout (v) {
        super.needsLayout = v;
    }

    layout () {
        super.layout();
        this.refView.expr.name = this.def.name;
        this.refView.layoutIfNeeded();
        const nameSize = this.refView.size;

        // try to align left hand side if this is the linear view
        const nameAlignedSize = this.usingGraphView ? nameSize[0] : Math.max(nameSize[0], config.lhsAlignWidth);
        this.layer.cornerRadius = this.usingGraphView ? config.def.cornerRadius : 0;

        const eqSize = this.eqLayer.getNaturalSize();

        this.exprSlot.expr = this.def.expr;
        this.exprSlot.exprCtx = this.def.ctx;
        this.exprSlot.dragController = this.dragController;
        this.exprSlot.layoutIfNeeded();

        const { padding } = config.def;

        const height = padding + Math.max(nameSize[1], this.exprSlot.size[1]) + padding;

        let width = padding + (nameAlignedSize - nameSize[0]);
        this.refView.position = [width, (height - nameSize[1]) / 2];
        width += nameSize[0];
        width += padding;

        this.eqLayer.position = [width, height / 2];
        width += eqSize[0];
        width += padding;

        this.exprSlot.position = [width, (height - this.exprSlot.size[1]) / 2];
        width += this.exprSlot.size[0];
        width += padding;

        this.layer.size = [
            this.usingGraphView ? width : Math.max(width, this.parentWidth),
            height,
        ];
    }

    *iterSublayers () {
        yield this.eqLayer;
    }

    *iterSubviews () {
        yield this.refView;
        yield this.exprSlot;
    }
}

class AddDefView extends View {
    constructor (onAdd) {
        super();
        this.onAdd = onAdd;
        this.layer.background = config.def.background;
        this.label = new TextLayer();
        this.label.font = config.identFont;
        this.label.text = '+';
        this.label.align = 'center';
        this.needsLayout = true;
    }

    layout () {
        super.layout();

        const height = 32;

        this.layer.size = [this.parentWidth, height];
        this.label.position = [this.layer.size[0] / 2, this.layer.size[1] / 2];
    }

    *iterSublayers () {
        yield this.label;
    }

    onPointerStart () {
        this.onAdd();
    }
}

class Trash extends View {
    constructor () {
        super();

        this.layer.background = config.trash.background;
        this.layer.cornerRadius = config.cornerRadius;

        this.titleLayer = new TextLayer();
        this.titleLayer.font = config.identFont;
        this.titleLayer.text = config.trash.title;
        this.titleLayer.baseline = 'top';
    }

    didUnmount () {
        this.dragController.unregisterTarget(this);
    }

    get isEmpty () {
        return true; // always hungry
    }
    get acceptsDef () {
        return true; // accepts everything
    }
    beginTentative (expr) {
        void expr;
        const t = new Transaction(1, 0.3);
        this.active = true;
        this.layout();
        t.commit();
    }
    endTentative () {
        const t = new Transaction(1, 0.3);
        this.active = false;
        this.layout();
        t.commit();
    }
    insertExpr (expr) {
        const t = new Transaction(1, 0.3);
        this.active = false;
        this.layout();
        t.commit();
        void expr;
    }
    insertDef (def) {
        const t = new Transaction(1, 0.3);
        this.active = false;
        this.layout();
        t.commit();
        removeNode(def);
    }

    layout () {
        super.layout();
        this.dragController.registerTarget(this);
        const titleSize = this.titleLayer.getNaturalSize();
        this.titleLayer.position = [
            (this.size[0] - titleSize[0]) / 2,
            (this.size[1] - titleSize[1]) / 2,
        ];

        this.layer.background = this.isLeftTrash
            ? (this.active ? config.trash.bigActiveBackground : config.trash.bigBackground)
            : (this.active ? config.trash.activeBackground : config.trash.background);

        this.layer.opacity = !this.isLeftTrash || this.shouldShow ? 1 : 0;
    }

    *iterSublayers () {
        yield this.titleLayer;
    }
}

class DragController {
    #draggingNode = null;
    #dragOffset = [0, 0];
    #currentSlot = null;
    #onlyY = false;
    #onlyYXPos = null;
    targets = new Set();

    constructor (defs) {
        this.defs = defs;
    }

    beginDefDrag (def, x, y) {
        this.defs.showTrash = true;
        this.#draggingNode = def;
        this.#currentSlot = null;
        const defView = getProtoView(def, DefView);
        if (!this.defs.useGraphView) {
            removeNode(def);
            // FIXME: don't do this
            this.worldHandle = this.defs.ctx.push(defView);
        }
        defView._isBeingDragged = true;
        this.#onlyY = !defView.usingGraphView;
        this.#onlyYXPos = defView.absolutePosition[0];
        if (this.defs.useGraphView) {
            this.#dragOffset = [
                defView.position[0] - x,
                defView.position[1] - y,
            ];
        } else {
            this.#dragOffset = [
                defView.position[0] - x - this.defs.offset[0],
                defView.position[1] - y - this.defs.offset[1],
            ];
        }
        const t = new Transaction(1, 0);
        defView.position = [
            this.#onlyY ? this.#onlyYXPos : x + this.#dragOffset[0],
            y + this.#dragOffset[1],
        ];
        t.commit();
        this.defs.putTentative(defView.position[1] + this.defs.offset[1], defView.size[1]);
        //new Transaction(1, 0.3).commitAfterLayout(this.defs.ctx);
    }
    moveDefDrag (x, y) {
        this.moveDrag(x, y, DefView, slot => slot.acceptsDef);
        const defView = getProtoView(this.#draggingNode, DefView);
        this.defs.putTentative(defView.position[1] + this.defs.offset[1], defView.size[1]);
    }
    endDefDrag () {
        this.defs.showTrash = false;
        this.endDrag(DefView, () => {
            const defView = getProtoView(this.#draggingNode, DefView);
            delete defView._isBeingDragged;
            if (this.worldHandle) {
                this.worldHandle.pop();
                this.worldHandle = null;

                // draggingnode will be inserted into defs, so accomodate for scroll pos
                const t = new Transaction(1, 0);
                defView.position = [
                    defView.position[0] + this.defs.offset[0],
                    defView.position[1] + this.defs.offset[1],
                ];
                t.commit();

                this.defs.endTentative(this.#draggingNode);
            } else {
                this.defs.endTentative();
            }
            if (this.#currentSlot) {
                this.#currentSlot.insertDef(this.#draggingNode);
            }
        });
    }

    beginExprDrag (expr, x, y) {
        this.#draggingNode = expr;
        this.#currentSlot = null;
        this.#onlyY = false;
        this.defs.showTrash = true;
        const exprView = getProtoView(expr, ExprView);

        if (expr.parent) {
            {
                // remove from parent
                const transaction = new Transaction(1, 0);
                const pos = exprView.absolutePosition;
                const defsPos = this.defs.absolutePosition;
                exprView.position = [
                    pos[0] - defsPos[0],
                    pos[1] - defsPos[1],
                ];
                removeNode(expr);
                this.defs.addFloatingExpr(expr);
                transaction.commit();
            }

            // set parent in hovering-over state
            const transaction = new Transaction(1, 0.3);
            const parentView = exprView.parent;
            if (parentView.beginTentative) {
                parentView.beginTentative(exprView);
                this.#currentSlot = parentView;
            }
            transaction.commitAfterLayout(this.defs.ctx);
        }
        this.#dragOffset = [
            exprView.position[0] - x,
            exprView.position[1] - y,
        ];
    }
    moveExprDrag (x, y) {
        this.moveDrag(x, y, ExprView);
    }
    endExprDrag () {
        this.defs.showTrash = false;
        this.endDrag(ExprView, () => {
            if (this.#currentSlot) {
                this.defs.removeFloatingExpr(this.#draggingNode);
                this.#currentSlot.insertExpr(this.#draggingNode);
            }
        });
    }
    moveDrag (x, y, TypeClass, condition = (() => true)) {
        if (!this.#draggingNode) return;

        const slot = this.getProspectiveSlot(x, y, condition);

        const exprView = getProtoView(this.#draggingNode, TypeClass);

        let newPos = [
            this.#onlyY ? this.#onlyYXPos : x + this.#dragOffset[0],
            y + this.#dragOffset[1],
        ];
        let newScale = 1;

        if (slot !== this.#currentSlot) {
            if (this.#currentSlot) {
                this.#currentSlot.endTentative();
            }
            this.#currentSlot = slot;
            if (this.#currentSlot) {
                this.#currentSlot.beginTentative(exprView);
            }
        }

        if (this.#currentSlot) {
            const slotPos = this.#currentSlot.absolutePosition;
            const defsPos = this.defs.absolutePosition;
            const slotSize = this.#currentSlot.size;
            const center = [
                slotPos[0] - defsPos[0] + slotSize[0] / 2,
                slotPos[1] - defsPos[1] + slotSize[1] / 2,
            ];

            const unadjustedCenter = [
                x + this.#dragOffset[0] + exprView.size[0] / 2,
                y + this.#dragOffset[1] + exprView.size[1] / 2,
            ];

            const pointerAngle = Math.atan2(unadjustedCenter[1] - center[1], unadjustedCenter[0] - center[0]);
            let pointerDist = Math.hypot(unadjustedCenter[1] - center[1], unadjustedCenter[0] - center[0]);
            pointerDist /= 3;

            newPos = [
                center[0] + Math.cos(pointerAngle) * pointerDist - exprView.size[0] / 2,
                center[1] + Math.sin(pointerAngle) * pointerDist - exprView.size[1] / 2,
            ];

            if (this.#currentSlot instanceof Trash) newScale = 0.5;
        }

        const transaction = new Transaction(1, 0.3);
        exprView.position = newPos;
        exprView.layer.scale = newScale;
        transaction.commitAfterLayout(this.defs.ctx);

        this.defs.needsLayout = true;
    }
    endDrag (TypeClass, commit) {
        if (this.#currentSlot) {
            {
                // move expr view into slot coordinate system
                const transaction = new Transaction(1, 0);
                const exprView = getProtoView(this.#draggingNode, TypeClass);
                const slotPos = this.#currentSlot.absolutePosition;
                const defsPos = this.defs.absolutePosition;
                exprView.position = [
                    exprView.position[0] + defsPos[0] - slotPos[0],
                    exprView.position[1] + defsPos[1] - slotPos[1],
                ];
                transaction.commit();
            }
        }

        const transaction = new Transaction(1, 0.3);
        commit();
        this.defs.flushSubviews();
        transaction.commitAfterLayout(this.defs.ctx);
        this.defs.needsLayout = true;
    }

    getProspectiveSlot (x, y, condition) {
        const slots = this.defs.ctx.nodesAtPoint(x, y);

        // find the last non-empty slot (last because it’ll be on top)
        for (let i = slots.length - 1; i >= 0; i--) {
            if (slots[i] === this.#draggingNode) continue;
            if (slots[i].isEmpty && condition(slots[i])) {
                return slots[i];
            }
        }
        return null;
    }

    registerTarget (target) {
        this.targets.add(target);
    }
    unregisterTarget (target) {
        this.targets.delete(target);
    }
}

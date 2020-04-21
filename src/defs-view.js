import dagre from 'dagre';
import { View } from './view';
import { viewPool, getProtoView } from './proto-pool';
import config from './config';
import { TextLayer, ArrowLayer, Transaction } from './layer';
import { ExprSlot, ExprView } from './expr-view';
import { remove as removeNode, stdlib } from './model';

/// Renders a set of definitions.
export class DefsView extends View {
    scroll = [0, 0];

    dragController = new DragController(this);

    constructor (defs) {
        super();

        this.layer.background = [0.6, 0.6, 0.6, 1];

        this.scrollAnchor = new DefsAnchorView();
        this.defs = defs;

        this.blackHole = new BlackHole();
        this.blackHole.dragController = this.dragController;
    }

    /// List of arrows by source
    #arrows = new Map();

    onScroll ({ dx, dy }) {
        this.scroll[0] += dx;
        this.scroll[1] += dy;
        this.needsLayout = true;
    }

    didPerformAutoLayout = false;

    layout () {
        super.layout();

        this.blackHole.position = [
            this.size[0] - 16 - this.blackHole.size[0],
            this.size[1] - 16 - this.blackHole.size[1],
        ];

        // perform layout on all defs so we have their sizes
        for (const item of this.defs.defs) {
            const itemView = getProtoView(item, DefView);
            itemView.dragController = this.dragController;
            itemView.layoutIfNeeded();
        }

        if (!this.didPerformAutoLayout) {
            // perform initial layout
            this.performInitialLayout();
            this.didPerformAutoLayout = true;
            this.needsLayout = true; // questionable fix for a glitch where arrows don’t update
        }

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
                    view.absolutePosition[0] + view.size[0] / 2 + this.scroll[0],
                    view.absolutePosition[1] + this.scroll[1],
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

        this.scrollAnchor.position = [-this.scroll[0], -this.scroll[1]];
        this.scrollAnchor.defs = this.defs;
        this.scrollAnchor.floatingExpr = this.defs.floatingExpr;
        this.scrollAnchor.arrows = this.#arrows;
        this.scrollAnchor.flushSubviews();
        this.scrollAnchor.layout();
    }

    performInitialLayout () {
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
            defView.position = [node.x - defView.size[0] / 2, node.y - defView.size[1] / 2];
        }
    }

    addFloatingExpr (expr) {
        this.defs.floatingExpr.add(expr);
        this.defs.ctx.notifyMutation(this.defs);
    }
    removeFloatingExpr (expr) {
        this.defs.floatingExpr.delete(expr);
        this.defs.ctx.notifyMutation(this.defs);
    }

    *iterSubviews () {
        this.scrollAnchor.flushSubviews();
        yield this.blackHole;
        yield this.scrollAnchor;
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

        this.layer.cornerRadius = config.def.cornerRadius;
        this.layer.background = config.def.background;

        this.exprSlot = new ExprSlot(expr => {
            this.def.expr = expr;
            expr.parent = this.def;
            this.def.ctx.notifyMutation(expr);
            this.def.ctx.notifyMutation(this.def);
        }, this.def.ctx);
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
        refView.position = [
            this.position[0] + this.refView.position[0],
            this.position[1] + this.refView.position[1],
        ];
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
        } else {
            // TODO: open rename dialog
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
        for (const category in stdlib) {
            if (stdlib[category].includes(name)) {
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

    layout () {
        super.layout();
        this.refView.expr.name = this.def.name;
        this.refView.layout();
        const nameSize = this.refView.size;

        const eqSize = this.eqLayer.getNaturalSize();

        this.exprSlot.expr = this.def.expr;
        this.exprSlot.exprCtx = this.def.ctx;
        this.exprSlot.dragController = this.dragController;
        this.exprSlot.layoutIfNeeded();

        const { padding } = config.def;

        const height = padding + Math.max(nameSize[1], this.exprSlot.size[1]) + padding;

        let width = padding;
        this.refView.position = [width, (height - nameSize[1]) / 2];
        width += nameSize[0];
        width += padding;

        this.eqLayer.position = [width, height / 2];
        width += eqSize[0];
        width += padding;

        this.exprSlot.position = [width, (height - this.exprSlot.size[1]) / 2];
        width += this.exprSlot.size[0];
        width += padding;

        this.layer.size = [width, height];
    }

    *iterSublayers () {
        yield this.eqLayer;
    }

    *iterSubviews () {
        yield this.refView;
        yield this.exprSlot;
    }
}

/// Black hole for throwing stuff away
class BlackHole extends View {
    constructor () {
        super();

        this.layer.background = [0, 0, 0, 1];
        this.layer.size = [64, 64];
        this.layer.cornerRadius = 32;
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
        this.layer.scale = 1.5;
        t.commit();
    }
    endTentative () {
        const t = new Transaction(1, 0.3);
        this.layer.scale = 1;
        t.commit();
    }
    insertExpr (expr) {
        const t = new Transaction(1, 0.3);
        this.layer.scale = 1;
        t.commit();
        void expr;
    }
    insertDef (def) {
        const t = new Transaction(1, 0.3);
        this.layer.scale = 1;
        t.commit();
        removeNode(def);
    }
    layout () {
        super.layout();
        this.dragController.registerTarget(this);
    }
    didUnmount () {
        this.dragController.unregisterTarget(this);
    }
}

class DragController {
    #draggingNode = null;
    #dragOffset = [0, 0];
    #currentSlot = null;
    targets = new Set();

    constructor (defs) {
        this.defs = defs;
    }

    beginDefDrag (def, x, y) {
        this.#draggingNode = def;
        const defView = getProtoView(def, DefView);
        this.#dragOffset = [defView.position[0] - x, defView.position[1] - y];
    }
    moveDefDrag (x, y) {
        this.moveDrag(x, y, DefView, slot => slot.acceptsDef);
    }
    endDefDrag () {
        this.endDrag(DefView, () => {
            this.#currentSlot.insertDef(this.#draggingNode);
        });
    }

    beginExprDrag (expr, x, y) {
        this.#draggingNode = expr;
        this.#currentSlot = null;
        const exprView = getProtoView(expr, ExprView);

        if (expr.parent) {
            {
                // remove from parent
                const transaction = new Transaction(1, 0);
                const pos = exprView.absolutePosition;
                exprView.position = [pos[0] + this.defs.scroll[0], pos[1] + this.defs.scroll[1]];
                removeNode(expr);
                this.defs.addFloatingExpr(expr);
                this.defs.flushSubviews();
                transaction.commit();
            }

            // set parent in hovering-over state
            const transaction = new Transaction(1, 0.3);
            const parentView = exprView.parent;
            parentView.beginTentative(exprView);
            this.#currentSlot = parentView;
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
        this.endDrag(ExprView, () => {
            this.defs.removeFloatingExpr(this.#draggingNode);
            this.#currentSlot.insertExpr(this.#draggingNode);
        });
    }
    moveDrag (x, y, TypeClass, condition = (() => true)) {
        if (!this.#draggingNode) return;

        const slot = this.getProspectiveSlot(x, y, condition);

        let newPos = [x + this.#dragOffset[0], y + this.#dragOffset[1]];

        const exprView = getProtoView(this.#draggingNode, TypeClass);

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
            const slotSize = this.#currentSlot.size;
            const origin = this.defs.scrollAnchor.absolutePosition;
            const center = [
                slotPos[0] - origin[0] + slotSize[0] / 2,
                slotPos[1] - origin[1] + slotSize[1] / 2,
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
        }

        const transaction = new Transaction(1, 0.3);
        getProtoView(this.#draggingNode, TypeClass).position = newPos;
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
                const origin = this.defs.scrollAnchor.absolutePosition;
                exprView.position = [
                    exprView.position[0] + origin[0] - slotPos[0],
                    exprView.position[1] + origin[1] - slotPos[1],
                ];
                transaction.commit();
            }

            const transaction = new Transaction(1, 0.3);
            commit();
            this.defs.flushSubviews();
            transaction.commitAfterLayout(this.defs.ctx);
        }
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

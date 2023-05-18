import { View, Window, Transaction } from './ui';
import { getProtoView } from './proto-pool';
import { DefsView, DefView, Trash } from './defs-view';
import { ExprSlot, ExprView } from './expr-view';
import { AnyNode, Def, Expr, remove as removeNode } from './model';
import { PushedWindow } from './ui/context';

export interface DragSlot {
    isEmpty?: boolean;
    acceptsExpr?: (node: AnyNode) => boolean;
    acceptsDef?: boolean;
}

export interface IExprDragController {
    beginExprDrag(expr: Expr.Any, x: number, y: number);
    moveExprDrag(x: number, y: number);
    endExprDrag();
    cancelExprDrag();
}

export class DragController implements IExprDragController {
    #draggingNode = null;
    #dragOffset = [0, 0];
    #removal = null;
    #currentSlot = null;
    #onlyY = false;
    #onlyYXPos = null;
    targets = new Set<DragSlot>();
    defs: DefsView;
    worldHandle: PushedWindow | null = null;

    constructor (defs: DefsView) {
        this.defs = defs;
    }

    beginDefDrag (def: Def, x: number, y: number) {
        this.defs.showTrash = true;
        this.#removal = null;
        this.#draggingNode = def;
        this.#currentSlot = null;
        const defView = getProtoView(def, DefView);
        this.#onlyYXPos = defView.absolutePosition[0];

        if (!this.defs.useGraphView) {
            this.#removal = removeNode(def);
            defView.parent?.removeSubview(defView);
            // FIXME: don't do this
            const win = new Window();
            const winRoot = new View();
            winRoot.addSubview(defView);
            win.addSubview(winRoot);
            this.worldHandle = this.defs.ctx.push(win);
        }

        defView._isBeingDragged = true;
        this.#onlyY = !defView.usingGraphView;
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
        const transaction = new Transaction(1, this.defs.useGraphView ? 0.3 : 0);
        this.defs.putTentative(defView.position[1] + this.defs.offset[1], defView.size[1]);
        transaction.commitAfterLayout(this.defs.ctx);
    }
    moveDefDrag (x: number, y: number) {
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
                defView.parent.removeSubview(defView);

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

    beginExprDrag (expr: Expr.Any, x: number, y: number) {
        this.#removal = null;
        this.#draggingNode = expr;
        this.#currentSlot = null;
        this.#onlyY = false;
        this.defs.showTrash = true;
        const exprView = getProtoView(expr, ExprView);

        if (expr.parent) {
            const transaction = new Transaction(1, 0.3);
            {
                // remove from parent
                exprView.ctx.history.commitChange('remove-node', () => {
                    const transaction = new Transaction(1, 0);
                    const pos = exprView.absolutePosition;
                    const defsPos = this.defs.absolutePosition;
                    exprView.position = [
                        pos[0] - defsPos[0],
                        pos[1] - defsPos[1],
                    ];
                    transaction.commit();

                    const removal = this.#removal = removeNode(expr);
                    this.defs.addFloatingExpr(expr);

                    return () => {
                        this.defs.removeFloatingExpr(expr);
                        removal.undo();
                    };
                }, expr);
            }

            // set parent in hovering-over state
            const parentView = exprView.parent as ExprSlot;
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
    moveExprDrag (x: number, y: number) {
        this.moveDrag(x, y, ExprView, slot => !slot.acceptsExpr || slot.acceptsExpr(this.#draggingNode));
    }
    endExprDrag () {
        this.defs.showTrash = false;
        this.endDrag(ExprView, () => {
            if (this.#currentSlot) {
                const t = new Transaction(0, 0);
                const node = this.#draggingNode;
                const exprView = getProtoView(node, ExprView);

                this.#currentSlot.ctx.history.commitChange('slot-before-insert', () => {
                    this.defs.removeFloatingExpr(node);

                    return () => {
                        exprView.layer.scale = 1; // reset scaling from trash
                        this.defs.addFloatingExpr(node);
                    };
                }, node);

                this.#currentSlot.insertExpr(node);
                t.commit();
            }
        });
    }
    cancelExprDrag () {
        this.defs.showTrash = false;
        if (this.#removal) {
            const exprView = getProtoView(this.#draggingNode, ExprView);
            exprView.ctx.history.undos.pop();
            this.defs.removeFloatingExpr(this.#draggingNode);
            this.#removal.undo();
            this.#removal = null;
        }
    }
    moveDrag (x: number, y: number, TypeClass, condition: ((v: DragSlot) => boolean) = (() => true)) {
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

        const transaction = new Transaction(1, 0.2);
        exprView.position = newPos;
        exprView.layer.scale = newScale;
        transaction.commitAfterLayout(this.defs.ctx);

        this.defs.needsLayout = true;
    }
    endDrag (TypeClass, commit: () => void) {
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

    getProspectiveSlot (x: number, y: number, condition: (s: DragSlot) => boolean) {
        const slots = this.defs.ctx.nodesAtPoint(x, y, true);

        // find the last non-empty slot (last because it’ll be on top)
        for (let i = slots.length - 1; i >= 0; i--) {
            const slot = slots[i] as DragSlot;
            if (!this.targets.has(slot)) continue;
            if (slot === this.#draggingNode) continue;
            if (slot.isEmpty && condition(slot)) {
                return slot;
            }
        }
        return null;
    }

    registerTarget (target: DragSlot) {
        this.targets.add(target);
    }
    unregisterTarget (target: DragSlot) {
        this.targets.delete(target);
    }
}

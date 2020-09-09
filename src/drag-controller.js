import { View, Window, Transaction } from './ui';
import { getProtoView } from './proto-pool';
import { DefView, Trash } from './defs-view';
import { ExprView } from './expr-view';
import { remove as removeNode } from './model';

export class DragController {
    #draggingNode = null;
    #dragOffset = [0, 0];
    #removal = null;
    #currentSlot = null;
    #onlyY = false;
    #onlyYXPos = null;
    targets = new Set();

    constructor (defs) {
        this.defs = defs;
    }

    beginDefDrag (def, x, y) {
        this.defs.showTrash = true;
        this.#removal = null;
        this.#draggingNode = def;
        this.#currentSlot = null;
        const defView = getProtoView(def, DefView);
        if (!this.defs.useGraphView) {
            this.#removal = removeNode(def);
            // FIXME: don't do this
            const win = new Window();
            const winRoot = new View();
            winRoot.addSubview(defView);
            win.addSubview(winRoot);
            this.worldHandle = this.defs.ctx.push(win);
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
        const transaction = new Transaction(1, 0.3);
        this.defs.putTentative(defView.position[1] + this.defs.offset[1], defView.size[1]);
        transaction.commitAfterLayout(this.defs.ctx);
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

    beginExprDrag (expr, x, y) {
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
                const transaction = new Transaction(1, 0);
                const pos = exprView.absolutePosition;
                const defsPos = this.defs.absolutePosition;
                exprView.position = [
                    pos[0] - defsPos[0],
                    pos[1] - defsPos[1],
                ];
                transaction.commit();
                this.#removal = removeNode(expr);
                this.defs.addFloatingExpr(expr);
            }

            // set parent in hovering-over state
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
                const t = new Transaction(0, 0);
                this.defs.removeFloatingExpr(this.#draggingNode);
                this.#currentSlot.insertExpr(this.#draggingNode);
                t.commit();
            }
        });
    }
    cancelExprDrag () {
        this.defs.showTrash = false;
        if (this.#removal) {
            this.defs.removeFloatingExpr(this.#draggingNode);
            this.#removal.undo();
            this.#removal = null;
        }
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

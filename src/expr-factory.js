import { View, Transaction, Gesture } from './ui';
import { ExprView } from './expr-view';
import { getProtoView } from './proto-pool';
import { createContext } from './model';

export class ExprFactory extends View {
    constructor (lib, makeExpr) {
        super();
        this.lib = lib;
        this.makeExpr = makeExpr;
        this.exprCtx = createContext();
        this.exprCtx.onMutation(() => {
            this.needsLayout = true;
        });
        this.expr = makeExpr(this.exprCtx, true);

        this.exprView = new ExprView(this.expr);
        this.exprView.noInteraction = true;
        this.exprView._isDemo = true;
        this.exprView.decorationOnly = true;
        this.addSubview(this.exprView);

        Gesture.onTap(this, this.onTap);
        Gesture.onDrag(this, this.onDragMove, this.onDragStart, this.onDragEnd, this.onDragCancel);
    }

    wantsChildLayout = true;

    update = makeExpr => {
        this.makeExpr = makeExpr;
        this.expr = makeExpr(this.exprCtx, true);
        this.exprView.expr = this.expr;
        this.exprView.needsLayout = true;
    };

    layout () {
        super.layout();
        this.exprView.layoutIfNeeded();
        this.layer.size = this.exprView.size;
    }

    #dragStartPos = [0, 0];
    #createdDragRef = null;

    onDragStart = ({ absX, absY }) => {
        this.#dragStartPos = [absX, absY];
        this.#createdDragRef = this.createInstance();
        const t = new Transaction(1, 0.3);
        this.lib.defs.dragController.beginExprDrag(this.#createdDragRef, absX, absY);
        this.lib.defs.showTrash = false; // don't show trash on initial drag
        t.commitAfterLayout(this.ctx);
    };

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

    onDragMove = ({ absX, absY }) => {
        this.lib.defs.dragController.moveExprDrag(absX, absY);
    };

    onTap = () => {
        const expr = this.createInstance();
        const exprView = getProtoView(expr, ExprView);
        exprView.decorationOnly = false;

        const t = new Transaction(0.8, 0.5);
        exprView.position = [16, 16];
        t.commit();
    };

    onDragEnd = () => {
        const exprView = getProtoView(this.#createdDragRef, ExprView);
        exprView.decorationOnly = false;
        this.lib.defs.dragController.endExprDrag();
    };
    onDragCancel = () => {
        // TODO: proper behavior
        this.onDragEnd();
    };
}

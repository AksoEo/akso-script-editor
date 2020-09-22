import { View } from './ui';
import { Toolbar } from './toolbar';
import { CanvasView } from './canvas-view';

export class EditorView extends View {
    toolbar = new Toolbar();
    canvasView = new CanvasView();

    layout () {
        super.layout();
        this.toolbar.canvas = this.canvasView;
        this.toolbar.size = [this.size[0], 32];
        this.toolbar.layout();
        this.canvasView.position = [0, this.toolbar.size[1]];
        this.canvasView.size = [this.size[0], this.size[1] - this.toolbar.size[1]];
        this.canvasView.needsLayout = true;
    }

    /// Loads a raw asc root node.
    setRawRoot (data) {
        this.canvasView.setRawRoot(data);
    }
    getRawRoot () {
        return this.canvasView.getRawRoot();
    }

    /// Loads a raw asc root node for raw expr mode.
    /// This mode can be entered but cannot be left!!
    /// In this mode, the only thing being edited is this expression.
    setRawExpr (expr, onClose) {
        this.canvasView.setRawExprMode(onClose);
        this.canvasView.setRawRootExpr(expr);
    }
    getRawExpr () {
        return this.canvasView.getRawRootExpr();
    }

    *iterSubviews () {
        yield this.canvasView;
        yield this.toolbar;
    }

    get wantsRootSize () {
        return true;
    }
}

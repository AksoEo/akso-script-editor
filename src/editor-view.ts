import { View } from './ui';
import { Toolbar } from './toolbar';
import { CanvasView } from './canvas-view';

export class EditorView extends View {
    toolbar: Toolbar;
    canvasView: CanvasView;

    constructor () {
        super();
        this.toolbar = new Toolbar();
        this.canvasView = new CanvasView();

        this.addSubview(this.canvasView);
        this.addSubview(this.toolbar);
    }

    layout () {
        super.layout();
        let y = 0;
        if (this.toolbar) {
            this.toolbar.editor = this;
            this.toolbar.canvas = this.canvasView;
            this.toolbar.size = [this.size[0], 32];
            this.toolbar.layout();
            y += this.toolbar.size[1];
        }
        this.canvasView.position = [0, y];
        this.canvasView.size = [this.size[0], this.size[1] - y];
        this.canvasView.needsLayout = true;
    }

    #onCancel = null;
    get onCancel () {
        return this.#onCancel;
    }
    set onCancel (f) {
        this.#onCancel = f;
        this.toolbar.flushSubviews();
    }

    #onSave = null;
    get onSave () {
        return this.#onSave;
    }
    set onSave (f) {
        this.#onSave = f;
        this.toolbar.flushSubviews();
    }

    /// Loads a raw asc root node.
    setRawRoot (data) {
        this.canvasView.setRawRoot(data);
    }
    getRawRoot () {
        return this.canvasView.getRawRoot();
    }

    setRawExternalDefs (defs) {
        this.canvasView.setRawExternalDefs(defs);
    }
    setFormVars (vars) {
        this.canvasView.setFormVars(vars);
    }

    /// Loads a raw asc root node for raw expr mode.
    /// This mode can be entered but cannot be left!!
    /// In this mode, the only thing being edited is this expression.
    setRawExpr (expr, options) {
        this.removeSubview(this.toolbar);
        this.toolbar = null;
        this.canvasView.setRawExprMode(options);
        this.canvasView.setRawRootExpr(expr);
    }
    getRawExpr () {
        return this.canvasView.getRawRootExpr();
    }

    get wantsRootSize () {
        return true;
    }
}

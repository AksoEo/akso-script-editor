import { Transaction } from './ui';
import { Toolbar } from './toolbar';
import { CanvasView } from './canvas-view';
import { ComponentView, h, VNode } from './ui/component-view';

export class EditorView extends ComponentView<{}> {
    canvasView: CanvasView;

    constructor (props) {
        super(props);

        this.canvasView = new CanvasView();

        this.layoutProps.layout = 'flex';
        this.layoutProps.direction = 'vertical';
    }

    #onCancel = null;
    get onCancel () {
        return this.#onCancel;
    }
    set onCancel (f) {
        this.#onCancel = f;
        this.needsLayout = true;
    }

    #onSave = null;
    get onSave () {
        return this.#onSave;
    }
    set onSave (f) {
        this.#onSave = f;
        this.needsLayout = true;
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
        this.canvasView.setRawExprMode(options);
        this.canvasView.setRawRootExpr(expr);
    }
    getRawExpr () {
        return this.canvasView.getRawRootExpr();
    }

    get wantsRootSize () {
        return true;
    }

    renderContents(): VNode<any> | VNode<any>[] {
        return [
            this.canvasView.isInRawExprMode ? null : h(Toolbar, {
                editor: this,
                codeMode: this.canvasView.isInCodeMode,
                toggleCodeMode: () => {
                    if (this.canvasView.isInCodeMode) this.canvasView.exitCodeMode();
                    else this.canvasView.enterCodeMode();
                    this.needsLayout = true;
                },
                testMode: this.ctx.isInTestMode,
                toggleTestMode: () => {
                    const t = new Transaction(1, 0.3);
                    this.ctx.isInTestMode = !this.ctx.isInTestMode;
                    this.canvasView.didToggleTestMode();
                    this.needsLayout = true;
                    t.commitAfterLayout(this.ctx);
                },
                duplicate: this.ctx.isInDupMode,
                toggleDuplicate: () => {
                    this.ctx.isInDupMode = !this.ctx.isInDupMode;
                    this.needsLayout = true;
                },
                help: this.canvasView.isInHelpMode,
                toggleHelp: () => {
                    if (this.canvasView.isInHelpMode) this.canvasView.exitHelpMode();
                    else this.canvasView.enterHelpMode();

                    this.ctx.helpSheet.onClose = () => {
                        this.canvasView.isInHelpMode = false;
                        this.needsLayout = true;
                    };
                },
            }, {
                order: 0,
            }),
            this.canvasView,
        ];
    }
}

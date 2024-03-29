import { View } from './ui';
import {
    createContext,
    fromRawDefs,
    toRawDefs,
    toRawExpr,
    resolveRefs,
    cloneWithContext, Defs,
} from './model';
import { viewPool } from './proto-pool';
import { DefsView } from './defs-view';
import { Library } from './library';
import { lex } from './asct/lex';
import { parse } from './asct/parse';
import { write } from './asct/write';

/// Root view of the editor canvas.
///
/// This view contains all program nodes and the library.
export class CanvasView extends View {
    /// Model data context.
    modelCtx = null;
    /// Root node of the model data.
    root = null;
    /// Root defs view
    defsView = null;

    library: Library;
    rawExprRoot: Defs;

    wantsChildLayout = true;

    constructor () {
        super();

        this.layoutProps.flexGrow = 1;
        this.layoutProps.layout = 'flex';

        this.modelCtx = createContext();
        this.modelCtx.onMutation(this.#onMutation);
        this.modelCtx.onStartMutation(this.#onStartMutation);
        this.modelCtx.onFlushMutation(this.#onFlushMutation);
        this.modelCtx.onExternalDefsMutation(this.#onExternalDefsMutation);
        this.modelCtx.onFormVarsMutation(this.#onFormVarsMutation);
        this.root = fromRawDefs({}, this.modelCtx);
        this.defsView = new DefsView(this.root);
        this.library = new Library(this.defsView);

        this.addSubview(this.library);
        this.addSubview(this.defsView);
    }

    isInRawExprMode = false;
    setRawExprMode (options) {
        this.isInRawExprMode = true;
        this.library.setRawExprMode();
        this.defsView.setRawExprMode(options);
        this.rawExprRoot = fromRawDefs({}, this.modelCtx);
    }
    setRawRootExpr (expr) {
        const key = 'key';
        this.rawExprRoot = fromRawDefs({ [key]: expr }, this.modelCtx);
        let keyDef;
        for (const def of this.rawExprRoot.defs) {
            if (def.name === key) {
                keyDef = def;
                break;
            }
        }
        if (!keyDef) return; // ???
        this.defsView.rawExprView.expr = keyDef.expr;
        this.resolveRefs(true);
    }
    getRawRootExpr () {
        const expr = this.defsView.rawExprView.expr;
        if (!expr) return { t: 'u' };
        return toRawExpr(expr, () => {});
    }

    #mutations = null;
    #onStartMutation = () => {
        this.#mutations = new Set();
    };
    #onMutation = node => {
        // set needsLayout on the representing view when a model node is mutated
        const view = viewPool.get(node);
        if (view) {
            view.needsLayout = true;
            if (this.#mutations) this.#mutations.add(view);
        }
        this.defsView.needsValueUpdate = true;
        this.defsView.needsLayout = true;
        this.resolveRefs();
    };
    #onExternalDefsMutation = () => {
        this.defsView.needsValueUpdate = true;
        this.defsView.needsLayout = true;
    };
    #onFormVarsMutation = () => {
        this.defsView.needsValueUpdate = true;
        this.defsView.needsLayout = true;
    };
    #onFlushMutation = () => {
        this.defsView.layoutIfNeeded();
        if (this.#mutations) {
            for (const m of this.#mutations) m.layoutIfNeeded();
        }
        this.#mutations = null;
    };

    isInCodeMode = false;
    enterCodeMode () {
        const code = write(this.defsView.defs);
        this.ctx.codeMirrorNode.style.display = '';
        this.isInCodeMode = true;
        this.ctx.codeEditor.setValue(code);
        this.ctx.codeEditor.onAsctChange = this.onCodeMirrorAsctChange;
    }
    onCodeMirrorAsctChange = (data) => {
        if (!this.isInCodeMode) return;
        const parsed = cloneWithContext(data, this.modelCtx);

        const prevRoot = this.root;
        this.ctx.history.commitChange('commit-code', () => {
            this.root = parsed;
            this.resolveRefs();
            this.needsLayout = true;
            setTimeout(() => {
                // hack to fix arrows in graph view
                this.defsView.needsLayout = true;
            }, 10);

            return () => {
                this.root = prevRoot;
                this.resolveRefs();
                this.needsLayout = true;
                setTimeout(() => {
                    this.defsView.needsLayout = true;
                }, 10);
            };
        });
    };
    exitCodeMode () {
        const code = this.ctx.codeEditor.getValue();
        try {
            const data = parse(lex(code), this.modelCtx);
            this.onCodeMirrorAsctChange(data);
            this.ctx.codeMirrorNode.style.display = 'none';
            this.isInCodeMode = false;

            this.modelCtx.notifyMutation(this.root);
        } catch (err) {
            // error will be shown in code editor
            console.error(err);
        }
    }

    didToggleTestMode() {
        this.modelCtx.notifyMutation(this.root);
        this.modelCtx.notifyFormVarsMutation();
        this.modelCtx.flushMutation();
    }

    isInHelpMode = false;
    enterHelpMode() {
        this.isInHelpMode = true;
        this.ctx.helpSheet.open();
    }
    exitHelpMode() {
        this.isInHelpMode = false;
        this.ctx.helpSheet.close();
    }

    getSubCtx () {
        return {
            modelCtx: this.modelCtx,
        };
    }

    layout () {
        this.defsView.leftTrash = !this.library.isMinimized();
        this.defsView.leftTrashWidth = this.library.size.x;
        this.defsView.defs = this.root;

        const absPos = this.absolutePosition;
        if (this.ctx.codeMirrorNode) {
            this.ctx.codeMirrorNode.style.transform = `translate(${absPos[0]}px, ${absPos[1]}px)`;
            this.ctx.codeMirrorNode.style.width = this.size[0] + 'px';
            this.ctx.codeMirrorNode.style.height = this.size[1] + 'px';
        }
        if (this.ctx.helpSheet) {
            this.ctx.helpSheet.node.style.top = absPos[1] + 'px';
        }

        return super.layout();
    }

    /// Loads a raw asc root node.
    setRawRoot (data) {
        this.root = fromRawDefs(data, this.modelCtx);
        this.resolveRefs(true);
    }
    getRawRoot () {
        return toRawDefs(this.root);
    }

    setRawExternalDefs (defs) {
        this.modelCtx.externalDefs = defs;
        this.resolveRefs(true);
    }
    setFormVars (vars) {
        this.modelCtx.formVars = vars;
        this.modelCtx.notifyFormVarsMutation();
    }

    resolveRefs (reducing?: boolean) {
        if (this.isInRawExprMode) {
            resolveRefs(this.rawExprRoot, reducing);
        } else {
            resolveRefs(this.root, reducing);
        }
        this.needsLayout = true;
    }
}

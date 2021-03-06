import { View, Transaction } from './ui';
import { createContext, fromRawDefs, toRawDefs, fromRawExpr, toRawExpr, resolveRefs } from './model';
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

    constructor () {
        super();

        this.modelCtx = createContext();
        this.modelCtx.onMutation(this.#onMutation);
        this.modelCtx.onStartMutation(this.#onStartMutation);
        this.modelCtx.onFlushMutation(this.#onFlushMutation);
        this.modelCtx.onExternalDefsMutation(this.#onExternalDefsMutation);
        this.modelCtx.onFormVarsMutation(this.#onFormVarsMutation);
        this.root = fromRawDefs({}, this.modelCtx);
        this.defsView = new DefsView(this.root);
        this.library = new Library(this.defsView);
        this.library.onRequestLinearView = () => this.exitGraphView();

        this.addSubview(this.library);
        this.addSubview(this.defsView);
    }

    isInRawExprMode = false;
    setRawExprMode (options) {
        this.isInRawExprMode = true;
        this.library.setRawExprMode(options);
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
        for (const m of this.#mutations) m.layoutIfNeeded();
        this.#mutations = null;
    };

    get isInGraphView () {
        return this.defsView.useGraphView;
    }

    exitGraphView () {
        const t = new Transaction(1, 1);
        this.defsView.useGraphView = false;
        if (this._libraryWasOpen) {
            this.library.open();
        }
        t.commitAfterLayout(this.ctx);
    }
    enterGraphView () {
        if (this.isInRawExprMode) return;
        const t = new Transaction(1, 1);
        this.defsView.useGraphView = true;
        this._libraryWasOpen = this.library.isOpen;
        this.library.close();
        t.commitAfterLayout(this.ctx);
    }

    isInCodeMode = false;
    enterCodeMode () {
        const code = write(this.defsView.defs);
        this.ctx.codeMirrorNode.style.display = '';
        this.isInCodeMode = true;
        this.ctx.codeMirror.setValue(code);
    }
    exitCodeMode () {
        const code = this.ctx.codeMirror.getValue();
        try {
            const parsed = parse(lex(code), this.modelCtx);

            this.root = parsed;
            this.resolveRefs();
            this.needsLayout = true;
            setTimeout(() => {
                // hack to fix arrows in graph view
                this.defsView.needsLayout = true;
            }, 10);

            this.ctx.codeMirrorNode.style.display = 'none';
            this.isInCodeMode = false;
        } catch (err) {
            // TODO: show error
            console.error(err);
        }
    }

    getSubCtx () {
        return {
            modelCtx: this.modelCtx,
        };
    }

    layout () {
        super.layout();
        this.ctx.canvas = this;
        this.library.size = [
            this.library.isMinimized()
                ? this.library.getMinimizedWidth()
                : Math.min(this.size[0] * 0.5, 300),
            this.size[1],
        ];
        this.library.layout();
        this.defsView.leftTrash = !this.library.isMinimized();
        this.defsView.leftTrashWidth = this.library.size[0];
        this.defsView.defs = this.root;
        this.defsView.position = [this.library.size[0], 0];
        this.defsView.size = [
            this.size[0] - this.library.size[0],
            this.size[1],
        ];
        this.defsView.needsLayout = true;

        const absPos = this.absolutePosition;
        this.ctx.codeMirrorNode.style.transform = `translate(${absPos[0]}px, ${absPos[1]}px)`;
        this.ctx.codeMirrorNode.style.width = this.size[0] + 'px';
        this.ctx.codeMirrorNode.style.height = this.size[1] + 'px';
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

    resolveRefs (reducing) {
        if (this.isInRawExprMode) {
            resolveRefs(this.rawExprRoot, reducing);
        } else {
            resolveRefs(this.root, reducing);
        }
        this.needsLayout = true;
    }
}

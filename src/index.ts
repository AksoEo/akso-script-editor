import { Window, ViewRoot, RenderViewRoot } from './ui';
import { EditorView } from './editor-view';
import { CodeEditor } from './code-editor';
import { TextInput } from './text-input';
export { lex } from './asct/lex';
export { parse } from './asct/parse';
export { write } from './asct/write';
export { DefsView } from './defs-view';
export { ExprSlot, ExprView } from './expr-view';
export { viewPool, getProtoView } from './proto-pool';
export * as model from './model';

export { Window, RenderViewRoot };

/// An AKSO Script editor.
export default class Editor {
    root = new ViewRoot();
    editor = new EditorView();
    textInput = new TextInput();
    codeEditor = new CodeEditor();

    constructor () {
        const win = new Window();
        win.addSubview(this.editor);
        this.root.pushWindow(win);

        this.root.node.appendChild(this.textInput.node);
        this.root.ctx.beginInput = this.textInput.beginInput;

        this.root.node.appendChild(this.codeEditor.node);
        this.root.ctx.codeMirrorNode = this.codeEditor.node;
        this.root.ctx.codeEditor = this.codeEditor;
    }

    get node () {
        return this.root.node;
    }
    get width () {
        return this.root.width;
    }
    get height () {
        return this.root.height;
    }
    set width (value) {
        this.root.width = value;
    }
    set height (value) {
        this.root.height = value;
    }

    /// defs: array of ASC scripts
    loadExternalDefs (defs) {
        this.editor.setRawExternalDefs(defs);
    }
    setFormVars (vars) {
        this.editor.setFormVars(vars);
    }

    load (data) {
        this.editor.setRawRoot(data);
    }

    save () {
        return this.editor.getRawRoot();
    }

    get onSave () {
        return this.editor.onSave;
    }
    set onSave (f) {
        this.editor.onSave = f;
    }

    loadInRawExprMode (expr, options) {
        this.editor.setRawExpr(expr, options);
    }

    saveRawExpr () {
        return this.editor.getRawExpr();
    }

    destroy () {
        this.root.destroy();
    }
}


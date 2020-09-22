import { Window, ViewRoot, RenderViewRoot } from './ui';
import { EditorView } from './editor-view';
import { CodeEditor } from './code-editor';
import { TextInput } from './text-input';
import { lex } from './asct/lex';
import { parse } from './asct/parse';
import { write } from './asct/write';
import { ExprSlot, ExprView } from './expr-view';

export { RenderViewRoot, ExprSlot, ExprView };
export { lex, parse, write };
export * as model from './model';

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
        Object.defineProperty(this.root.ctx, 'codeMirror', {
            get: () => this.codeEditor.get(),
            enumerable: true,
        });
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

    load (data) {
        this.editor.setRawRoot(data);
    }

    save () {
        return this.editor.getRawRoot();
    }

    loadInRawExprMode (expr, onClose) {
        this.editor.setRawExpr(expr, onClose);
    }

    saveRawExpr () {
        return this.editor.getRawExpr();
    }

    destroy () {
        this.root.destroy();
    }
}


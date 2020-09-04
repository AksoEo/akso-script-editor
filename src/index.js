// TEMP for testing UI

import { Window, ViewRoot } from './ui';
import { EditorView } from './editor-view';
import { CodeEditor } from './code-editor';
import { TextInput } from './text-input';
import { ExtrasRoot } from './extras';
import { lex } from './asct/lex';
import { parse } from './asct/parse';
import { write } from './asct/write';

export { lex, parse, write };

/// An AKSO Script editor.
export default class Editor {
    root = new ViewRoot();
    editor = new EditorView();
    textInput = new TextInput();
    codeEditor = new CodeEditor();
    extras = new ExtrasRoot();

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

        this.root.node.appendChild(this.extras.node);
        this.root.ctx.extras = this.extras;
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
}


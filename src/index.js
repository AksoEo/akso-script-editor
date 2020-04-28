import { ViewRoot } from './view-root';
import { EditorView } from './editor-view';

/// An AKSO Script editor.
export default class Editor {
    viewRoot = new ViewRoot();
    editorView = new EditorView();

    constructor () {
        this.viewRoot.push(this.editorView);
    }

    get node () {
        return this.viewRoot.node;
    }
    get width () {
        return this.viewRoot.width;
    }
    get height () {
        return this.viewRoot.height;
    }
    set width (value) {
        this.viewRoot.width = value;
    }
    set height (value) {
        this.viewRoot.height = value;
    }

    load (data) {
        this.editorView.setRawRoot(data);
    }

    save () {
        return this.editorView.getRawRoot();
    }
}

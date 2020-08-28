import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import './asct/cm-theme.css';
import './asct/cm-mode';

export class CodeEditor {
    constructor () {
        this.node = document.createElement('div');
        this.node.className = 'asct-cm';
        this.node.style.position = 'absolute';
        this.node.style.top = this.node.style.left = 0;
        this.node.style.zIndex = 1;
        this.node.style.display = 'none';
    }

    get = () => {
        if (!this.codeMirror) {
            // we need to init this lazily because it breaks if we initialize it during creation
            this.codeMirror = CodeMirror(this.node, {
                lineSeparator: '\n',
                indentUnit: 4,
                lineNumbers: true,
                value: '',
                mode: 'asct',
            });
            this.codeMirror.getWrapperElement().style.height = '100%';
        }
        return this.codeMirror;
    };
}

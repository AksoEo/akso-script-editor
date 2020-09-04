import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import './asct/cm-theme.css';
import './asct/cm-mode';
import { lex, LexError } from './asct/lex';
import { parse } from './asct/parse';
import { createContext } from './model';

/// The codemirror code editor overlay.
export class CodeEditor {
    constructor () {
        this.node = document.createElement('div');
        this.node.className = 'asct-cm';
        this.node.style.position = 'absolute';
        this.node.style.top = this.node.style.left = 0;
        this.node.style.zIndex = 1;
        this.node.style.display = 'none';
    }

    #lastErrorLines = [];
    #lastWidget = null;
    validate = () => {
        const editor = this.get();
        const value = editor.getValue();

        // pos to line/column
        const pos2lc = pos => {
            let lineStart = null;
            for (let i = pos; i >= 0; i--) {
                if (value[i] === '\n') break;
                lineStart = i;
            }
            return {
                line: value.slice(0, lineStart).split('\n').length - 1,
                ch: pos - lineStart,
            };
        };

        let error = null;

        try {
            const lexed = lex(editor.getValue());
            const parsed = parse(lexed, createContext());
        } catch (err) {
            const span = err.getSpan ? err.getSpan() : null;
            const spanStart = span ? pos2lc(span[0]) : ({ line: 0, ch: 0 });
            const spanEnd = span ? pos2lc(span[1]) : ({ line: 0, ch: 0 });

            let message;
            if (err instanceof LexError) {
                message = 'Unexpected token';
            } else {
                message = 'parse error';
            }

            error = {
                start: spanStart,
                end: spanEnd,
                message,
            };
        }

        for (const ln of this.#lastErrorLines) {
            editor.doc.removeLineClass(ln, 'background', 'asct-error-line');
        }
        if (this.#lastWidget) {
            this.#lastWidget.clear();
            this.#lastWidget = null;
        }

        if (error) {
            this.#lastErrorLines = [];
            for (let ln = error.start.line; ln <= error.end.line; ln++) {
                this.#lastErrorLines.push(ln);
                editor.doc.addLineClass(ln, 'background', 'asct-error-line');
            }

            const node = document.createElement('div');
            node.className = 'asct-error-message';
            node.textContent = error.message;

            this.#lastWidget = editor.doc.addLineWidget(error.end.line, node);
        }
    };

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
            this.codeMirror.on('changes', this.validate);
            this.codeMirror.getWrapperElement().style.height = '100%';
        }
        return this.codeMirror;
    };
}

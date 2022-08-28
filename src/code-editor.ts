import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import './asct/cm-theme.css';
import './asct/cm-mode';
import { Defs } from './model';
// @ts-ignore
import CodeEditorWorker from 'web-worker:./code-editor-worker';
import { ViewContext } from './ui/context';

/// The codemirror code editor overlay.
export class CodeEditor {
    node: HTMLDivElement;
    codeMirror: CodeMirror | null = null;
    onAsctChange: (data: Defs) => void | null = null;

    constructor () {
        this.node = document.createElement('div');
        this.node.className = 'asct-cm';
        this.node.style.position = 'absolute';
        this.node.style.top = this.node.style.left = '0px';
        this.node.style.zIndex = '1';
        this.node.style.display = 'none';
    }

    #scheduledValidate = -1;
    scheduleValidate = () => {
        if (this.#scheduledValidate) clearTimeout(this.#scheduledValidate);

        this.#scheduledValidate = setTimeout(() => {
            this.#scheduledValidate = null;

            this.validate();
        }, 500) as unknown as number;
    };

    #worker: CodeEditorWorker | null = null;

    #lastErrorLines = [];
    #lastWidget = null;
    #validateId = 0;
    validate = async () => {
        const validateId = ++this.#validateId;
        const editor = this.get();
        const value = editor.getValue();

        if (!this.#worker) {
            this.#worker = new CodeEditorWorker();
        }
        const id = Math.random().toString(36);
        const { result, error } = await new Promise<any>((resolve) => {
            const msgHandler = (e: MessageEvent) => {
                const message = e.data;
                if (message.id !== id) return;
                this.#worker.removeEventListener('message', msgHandler);

                if (message.result) {
                    resolve({ result: message.result as Defs, error: null });
                } else {
                    resolve({
                        result: null,
                        error: message.error as {
                            start: { line: number, ch: number },
                            end: { line: number, ch: number },
                            message: string,
                        },
                    });
                }
            };
            this.#worker.addEventListener('message', msgHandler);
            this.#worker.postMessage({ id, value });
        });

        if (this.#validateId !== validateId) return;

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
        } else if (this.onAsctChange) {
            this.onAsctChange(result);
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
            this.codeMirror.on('changes', this.scheduleValidate);
            this.codeMirror.getWrapperElement().style.height = '100%';
        }
        return this.codeMirror;
    };
}

import { EditorView, minimalSetup } from 'codemirror';
import { Decoration, lineNumbers, ViewPlugin, WidgetType } from '@codemirror/view';
import { EditorState, StateEffect, StateField, Range } from '@codemirror/state';
import './asct/cm-theme.css';
import { asct, asctStyle } from './asct/cm-mode';
import { Defs } from './model';

const setInlineErrors = StateEffect.define<Range<Decoration>[]>();
const inlineErrors = StateField.define({
    create() {
        return Decoration.none;
    },
    update(value, tr) {
        value = value.map(tr.changes);
        for (const effect of tr.effects) {
            if (effect.is(setInlineErrors)) {
                value = Decoration.set(effect.value);
            }
        }
        return value;
    },
    provide: f => EditorView.decorations.from(f),
});
class LineErrorWidget extends WidgetType {
    error: Error;
    constructor(error: Error) {
        super();
        this.error = error;
    }
    eq(other) {
        return this.error === other.error;
    }
    toDOM() {
        const node = document.createElement('div');
        node.className = 'asct-error-message';
        node.textContent = this.error.message;
        return node;
    }
}

function initExtensions(self: CodeEditor) {
    return [
        ViewPlugin.fromClass(class {
            update(update) {
                if (update.docChanged) {
                    self.scheduleValidate();
                }
            }
        }),
        minimalSetup,
        lineNumbers(),
        inlineErrors,
        asct,
        asctStyle,
    ];
}

/// The codemirror code editor overlay.
export class CodeEditor {
    node: HTMLDivElement;
    editorView: EditorView | null = null;
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

            void this.validate();
        }, 500) as unknown as number;
    };

    #worker: Worker | null = null;

    #lastErrorLines = [];
    #lastWidget = null;
    #validateId = 0;
    validate = async () => {
        const validateId = ++this.#validateId;
        const editor = this.get();
        const value = editor.state.doc.toString();

        if (!this.#worker) {
            this.#worker = new Worker(new URL('./code-editor-worker.ts', import.meta.url), { type: 'module' });
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

        if (error) {
            const endLine = this.editorView.state.doc.line(error.end.line + 1);

            const lineDec = Decoration.line({
                class: 'asct-error-line',
            });
            const errorDec = Decoration.widget({
                block: true,
                side: 1,
                widget: new LineErrorWidget(error),
            });

            const errorDecorations = [];
            for (let ln = error.start.line; ln <= error.end.line; ln++) {
                const line = this.editorView.state.doc.line(ln + 1);
                errorDecorations.push(lineDec.range(line.from, line.from));
            }
            errorDecorations.push(errorDec.range(endLine.to, endLine.to));

            this.editorView.dispatch({
                effects: setInlineErrors.of(errorDecorations),
            });
        } else if (this.onAsctChange) {
            this.editorView.dispatch({
                effects: setInlineErrors.of([]),
            });
            this.onAsctChange(result);
        }
    };

    getValue() {
        return this.get().state.doc.toString();
    }

    setValue(value: string) {
        if (this.getValue()) {
            this.editorView.dispatch({
                changes: {
                    from: 0,
                    to: this.editorView.state.doc.length,
                    insert: value,
                },
            });
        } else {
            this.editorView.setState(EditorState.create({
                doc: value,
                extensions: initExtensions(this),
            }));
        }
    }

    get = () => {
        if (!this.editorView) {
            // we need to init this lazily because it breaks if we initialize it during creation
            this.editorView = new EditorView({
                parent: this.node,
                extensions: initExtensions(this),
            });
        }
        return this.editorView;
    };
}

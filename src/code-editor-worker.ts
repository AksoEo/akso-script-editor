import { lex } from './asct/lex';
import { parse } from './asct/parse';
import { cloneWithContext, createContext, Defs } from './model';

export interface WorkerInput {
    id: string;
    value: string;
}
export interface WorkerOutput {
    id: string;
    result: Defs | null;
    error: WorkerLexError | null;
}
export interface WorkerLexError {
    start: { line: number, ch: number };
    end: { line: number, ch: number };
    message: string;
}

addEventListener('message', e => {
    const input = e.data as WorkerInput;

    try {
        const tokens = lex(input.value);
        const parsed = parse(tokens, createContext());
        postMessage({
            id: input.id,
            result: cloneWithContext(parsed, null as any),
            error: null,
        } as WorkerOutput);
    } catch (err) {
        // pos to line/column
        const pos2lc = pos => {
            let lineStart = null;
            for (let i = pos; i >= 0; i--) {
                if (lineStart !== null && input.value[i] === '\n') break;
                lineStart = i;
            }
            return {
                line: input.value.slice(0, lineStart).split('\n').length - 1,
                ch: pos - lineStart,
            };
        };

        const span = err.getSpan ? err.getSpan() : null;
        const spanStart = span ? pos2lc(span[0]) : ({ line: 0, ch: 0 });
        const spanEnd = span ? pos2lc(span[1]) : ({ line: 0, ch: 0 });

        const message = err.toString();

        const error: WorkerLexError = {
            start: spanStart,
            end: spanEnd,
            message,
        };
        postMessage({
            id: input.id,
            result: null,
            error,
        } as WorkerOutput);
    }
});

export const MAX_UNDOS = 100;
export type HistoryFn = () => HistoryFn;

export type HistoryLabel =
    'toggle-bool'
    | 'change-number'
    | 'change-string'
    | 'change-matrix'
    | 'change-ref'
    | 'remove-node'
    | 'slot-before-insert'
    | 'slot-insert-expr'
    | 'commit-code'
    | 'library-instantiate';

export interface HistoryEntry {
    label: HistoryLabel;
    fn: HistoryFn;
    data?: any;
}

function canCoalesce(a: HistoryEntry, b: HistoryEntry) {
    if (a.label === 'remove-node' && b.label === 'slot-before-insert') {
        if (a.data === b.data) return true;
    }
    if ((a.label === 'remove-node' || a.label === 'slot-before-insert') && b.label === 'slot-insert-expr') {
        // moved a node
        if (a.data === b.data) return true;
    }

    return false;
}

export class History {
    undos: HistoryEntry[] = [];
    redos: HistoryEntry[] = [];

    pushUndo(label: HistoryLabel, fn: HistoryFn, data?: any) {
        this.redos = [];
        const lastUndo = this.undos[this.undos.length - 1];
        const newEntry = { label, fn, data };

        if (lastUndo && canCoalesce(lastUndo, newEntry)) {
            let aUndo = this.undos.pop().fn;
            let bUndo = fn;
            let aRedo: any;
            let bRedo: any;
            let undo, redo;
            undo = () => {
                bRedo = bUndo();
                aRedo = aUndo();
                return redo;
            };
            redo = () => {
                aUndo = aRedo();
                bUndo = bRedo();
                return undo;
            };
            this.undos.push({ label, data, fn: undo });
        } else {
            this.undos.push({ label, fn, data });
        }
        while (this.undos.length > MAX_UNDOS) this.undos.shift();
    }

    commitChange(label: HistoryLabel, fn: (() => () => void), data?: any) {
        const innerRedo = fn;
        let innerUndo = fn();
        let undo, redo;
        redo = () => {
            innerUndo = innerRedo();
            return undo;
        };
        undo = () => {
            innerUndo();
            return redo;
        };
        this.pushUndo(label, undo, data);
    }

    undo() {
        if (!this.undos.length) return;
        const undo = this.undos.pop();
        const redo = undo.fn();
        this.redos.push({ label: undo.label, data: undo.data, fn: redo });
    }

    redo() {
        if (!this.redos.length) return;
        const redo = this.redos.pop();
        const undo = redo.fn();
        this.undos.push({ label: redo.label, data: redo.data, fn: undo });
    }
}

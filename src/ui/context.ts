import { View } from './view';
import { BaseLayer, Transaction } from './layer/base';
import { Window } from './window';
import { CodeEditor } from '../code-editor';
import { HelpSheet } from '../help/help-sheet';

export interface ViewContext {
    render: {
        scheduleLayout(view: View): void,
        scheduleDisplay(layer: BaseLayer): void,
        scheduleCommitAfterLayout(transaction: Transaction): void,
    };
    nodesAtPoint(x: number, y: number, allWindows?: boolean): View[];
    beginCapture(view: View): InputCapture;
    push(view: View): PushedWindow;
    beginInput: null | ((
        pos: [number, number],
        size: [number, number],
        text: string,
        style?: { [k: string]: string },
    ) => Promise<string>);
    codeMirrorNode: HTMLElement | null;
    codeEditor?: CodeEditor | null;
    window?: Window;
    helpSheet?: HelpSheet;
    isInDupMode?: boolean;
}

export interface InputCapture {
    end(): void;
}

export interface PushedWindow {
    pop(): void;
}

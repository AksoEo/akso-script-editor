import { View } from './view';
import { BaseLayer, Transaction } from './layer/base';
import { Window } from './window';
import { CodeEditor } from '../code-editor';
import { HelpSheet } from '../help/help-sheet';
import { History } from '../history';
import { RawVec2, Vec2 } from '../spring';
import { AscContext } from '../model';

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
        pos: Vec2 | RawVec2,
        size: Vec2 | RawVec2 | [number, number, number],
        text: string,
        style?: { [k: string]: string },
    ) => Promise<string>);
    codeMirrorNode: HTMLElement | null;
    codeEditor?: CodeEditor | null;
    window?: Window;
    helpSheet?: HelpSheet;
    isInDupMode?: boolean;
    isInTestMode?: boolean;
    history: History;
    modelCtx?: AscContext;
}

export interface InputCapture {
    end(): void;
}

export interface PushedWindow {
    pop(): void;
}

import CodeMirror from 'codemirror';
import 'codemirror/addon/mode/simple';
import { bareFormIdentRegexU, bareIdentRegexU, infixIdentRegexU, numberRegexU } from './shared';

CodeMirror.defineSimpleMode('asct', {
    start: [
        {
            regex: /where|switch/,
            token: 'keyword',
        },
        {
            regex: /yes|no|true|false/,
            token: 'bool',
        },
        {
            regex: /null/,
            token: 'null',
        },
        {
            regex: numberRegexU,
            token: 'number',
        },
        {
            regex: /r#(#*)".*?"\1#/,
            token: 'variable-2',
        },
        {
            regex: /"/,
            token: 'string',
            next: 'string',
        },
        {
            regex: /->/,
            token: 'keyword',
        },
        {
            regex: bareFormIdentRegexU,
            token: 'variable-2',
        },
        {
            regex: bareIdentRegexU,
            token: 'variable',
        },
        {
            regex: infixIdentRegexU,
            token: 'operator',
        },
        {
            regex: /\[|\]/,
            token: 'list',
        },
    ],
    string: [
        {
            regex: /\\./,
            token: 'escape',
        },
        {
            regex: /"/,
            token: 'string',
            next: 'start',
        },
        {
            regex: /./,
            token: 'string',
        },
    ],
});

import { tags } from '@lezer/highlight';
import { StreamLanguage, StreamParser, StringStream, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { bareFormIdentRegexU, bareIdentRegexU, infixIdentRegexU, numberRegexU } from './shared';

const simpleTokens = [
    {
        regex: /(where|switch|otherwise)\b/,
        token: 'keyword',
    },
    {
        regex: /(yes|no|true|false)\b/,
        token: 'bool',
    },
    {
        regex: /null\b/,
        token: 'null',
    },
    {
        regex: numberRegexU,
        token: 'number',
    },
    {
        regex: /r#(#*)".*?"\1#/,
        token: 'property',
    },
    {
        regex: /"(\\.|[^"])*?"/,
        token: 'string',
    },
    {
        regex: /->/,
        token: 'keyword',
    },
    {
        regex: bareFormIdentRegexU,
        token: 'property',
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
        regex: /[\[\]]/,
        token: 'list',
    },
];

export const asctStream = {
    name: 'asct',
    startState () {
        return {};
    },
    token (stream: StringStream, state: {}) {
        for (const token of simpleTokens) {
            if (stream.match(token.regex)) {
                return token.token;
            }
        }

        if (!stream.eatSpace()) stream.next();
        return null;
    },
}

export const asct = StreamLanguage.define(asctStream);

export const asctStyleDefs = HighlightStyle.define([
    /* { tag: tags.variableName, color: '#e54c99' },
    { tag: tags.propertyName, color: '#c63dc9' },
    { tag: tags.number, color: '#e6ba00' },
    { tag: tags.bool, color: '#d47a0d' },
    { tag: tags.null, color: '#ba2140' },
    { tag: tags.keyword, color: '#000' },
    { tag: tags.operator, fontWeight: 'bold', color: '#777' },
    { tag: tags.string, color: '#66d100' },
    { tag: tags.list, color: '#00c2e6' }, */
    { tag: tags.variableName, color: '#d53c89' },
    { tag: tags.propertyName, color: '#b62db9' },
    { tag: tags.number, color: '#d68a00' },
    { tag: tags.bool, color: '#d44a0d' },
    { tag: tags.null, color: '#ba2140' },
    { tag: tags.keyword, color: '#000' },
    { tag: tags.operator, fontWeight: 'bold', color: '#777' },
    { tag: tags.string, color: '#16a110' },
    { tag: tags.list, color: '#0082a6' },
]);

export const asctStyle = syntaxHighlighting(asctStyleDefs);

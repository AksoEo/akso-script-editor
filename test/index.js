import Editor, { lex, parse, write } from '../dist/index.js';

window.lex = lex;
window.parse = parse;
window.write = write;

const editor = new Editor();

setTimeout(() => {
    editor.onCancel = () => {};
    editor.onSave = () => {};
}, 500);

editor.load({
    mat2d: {
        t: 'm',
        v: [[1, 2], [10, 20]],
    },
    mat3d: {
        t: 'm',
        v: [[[1, 2], [3, 4]], [[5, 6], [7, 8], 'unbalanced matrix!!']],
    },
    cats: {
        t: 'c',
        f: 'sum',
        a: ['_cat1'],
    },
    _cat1: {
        t: 'c',
        f: 'map',
        a: ['add1', '_cat2'],
    },
    _cat2: {
        t: 'c',
        f: '++',
        a: ['_cat4', 'horse'],
    },
    _cat4: {
        t: 'm',
        v: [1, 2, 3, 4],
    },
    horse: {
        t: 'c',
        f: '+',
        a: ['number', '_horse'],
    },
    _horse: {
        t: 'n',
        v: 2,
    },
    list: {
        t: 'l',
        v: ['thing', '@form-var'],
    },
    expr_call: {
        t: 'c',
        f: 'add_numbers',
        a: ['_expr_call2', '_expr_call2'],
    },
    add1: {
        t: 'f',
        p: ['a'],
        b: {
            '_1': { t: 'n', v: 1 },
            '=': { t: 'c', f: '+', a: ['a', '_1'] },
        },
    },
    add_numbers: {
        t: 'f',
        p: ['a', 'b'],
        b: {
            '=': { t: 'c', f: '+', a: ['a', 'b'] },
        },
    },
    _expr_call2: {
        t: 'n',
        v: 123,
    },
    meow: { t: 'c', f: 'currency_fmt', a: ['_currency', 'cats'] },
    _currency: { t: 's', v: 'USD' },
    thing: { t: 'u' },
    boolean: { t: 'b', v: true },
    number: { t: 'n', v: 142 },
    string: { t: 's', v: 'multiline test\nstring' },
    string2: { t: 'c', f: 'string' },
    cond: { t: 'w', m: [{ c: 'boolean', v: 'string' }, { v: 'string2' }] },
    make_asc_list: {
        t: 'f',
        p: ['length'],
        b: {
            '=': { t: 'w', m: [{ c: '_1', v: '_2' }, { c: null, v: '_7' }] },
            _0: { t: 'n', v: 0 },
            _1: { t: 'c', f: '<=', a: ['length', '_0'] },
            _2: { t: 'm', v: [] },
            _3: { t: 'n', v: 1 },
            _4: { t: 'c', f: '-', a: ['length', '_3'] },
            _5: { t: 'c', f: 'make_asc_list', a: ['_4'] },
            _6: { t: 'l', v: ['length'] },
            _7: { t: 'c', f: '++', a: ['_5', '_6'] },
        },
    },
    fib: {
        t: 'f',
        p: ['n'],
        b: {
            '=': { t: 'w', m: [{ c: '_1', v: '_2' }, { c: '_4', v: '_3' }, { c: null, v: '_12' }] },
            _0: { t: 'n', v: 0 },
            _1: { t: 'c', f: '<=', a: ['n', '_0'] },
            _2: { t: 'n', v: 0 },
            _3: { t: 'n', v: 1 },
            _4: { t: 'c', f: '==', a: ['n', '_3'] },
            _7: { t: 'c', f: '-', a: ['n', '_3'] },
            _8: { t: 'c', f: 'fib', a: ['_7'] },
            _9: { t: 'n', v: 2 },
            _10: { t: 'c', f: '-', a: ['n', '_9'] },
            _11: { t: 'c', f: 'fib', a: ['_10'] },
            _12: { t: 'c', f: '+', a: ['_8', '_11'] },
        },
    },
    fac: {
        t: 'f',
        p: ['n'],
        b: {
            '=': { t: 'w', m: [{ c: '_c', v: '_1' }, { c: null, v: '_q' }] },
            _c: { t: 'c', f: '<=', a: ['n', '_1'] },
            _1: { t: 'n', v: 1 },
            _qa: { t: 'c', f: '-', a: ['n', '_1'] },
            _qb: { t: 'c', f: 'fac', a: ['_qa'] },
            _q: { t: 'c', f: '*', a: ['n', '_qb'] },
        },
    },
    _example0: { t: 'n', v: 7 },
    _example1: { t: 'c', f: 'make_asc_list', a: ['_example0'] },
    example: { t: 'c', f: 'map', a: ['fib', '_example1'] },
    'example 2': { t: 'c', f: 'map', a: ['fac', '_example1'] },
    '_date_thing0': { t: 's', v: 'years' },
    date_thing: { t: 'c', f: 'date_sub', a: ['_date_thing0', '_example0', '_example0'] },
});
window.editor = editor;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.append(editor.node);

editor.node.style.display = 'block';
editor.width = innerWidth;
editor.height = innerHeight;

window.addEventListener('resize', () => {
    editor.width = innerWidth;
    editor.height = innerHeight;
});

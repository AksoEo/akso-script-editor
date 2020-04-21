import Editor from '../dist/asce.esm.js';

const editor = new Editor();
editor.load({
    cats: {
        t: 'c',
        f: 'sum',
        a: ['_cat1'],
    },
    _cat1: {
        t: 'c',
        f: 'map',
        a: ['id', '_cat2'],
    },
    _cat2: {
        t: 'c',
        f: 'cat',
        a: ['_cat3'],
    },
    _cat3: {
        t: 'l',
        v: ['_cat4', '_cat5'],
    },
    _cat4: {
        t: 'm',
        v: [1, 2, 3, 4],
    },
    _cat5: {
        t: 'l',
        v: ['horse'],
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
        v: ['thing', '_broken_ref', '@form-var'],
    },
    expr_call: {
        t: 'c',
        f: 'add_numbers',
        a: ['_expr_call2'],
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
    string: { t: 's', v: 'cats are very cute' },
    string2: { t: 'c', f: 'string' },
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

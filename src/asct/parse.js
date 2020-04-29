import {
    cat,
    oneOf,
    opt,
    match,
    map,
    many,
    not,
    EOFError,
} from './comb';

import {
    NullToken,
    BoolToken,
    NumberToken,
    StringToken,
    IdentToken,
    InfixToken,
    BracketsToken,
    BracesToken,
    ParensToken,
    DelimToken,
    WhitespaceToken,
    SpaceToken,
    BreakToken,
} from './lex';

class TokenCursor {
    constructor (tokenStream) {
        this.tokens = tokenStream;
        this.pos = [0];
        this.proxy = null;
        this.errors = [];
    }

    peek () {
        if (this.eof()) throw new EOFError(`unexpected stream end`);
        let t = { contents: this.tokens };
        for (const p of this.pos) {
            t = t.contents[p];
        }
        return t;
    }

    next () {
        const t = this.peek();
        this.pos[this.pos.length - 1]++;
        this.errors = [];
        return t;
    }

    enter () {
        const t = this.peek();
        if (!Array.isArray(t.contents)) throw new Error(`cannot enter token without contents`);
        this.pos.push(0);
    }

    exitAssertingEnd () {
        if (!this.eof()) throw new Error(`attempt to exit token without reading all contents`);
        this.pos.pop();
    }

    eof () {
        const pos = [...this.pos];
        const lastPos = pos.pop();
        let t = { contents: this.tokens };
        for (const p of pos) {
            t = t.contents[p];
        }
        return t.contents.length === lastPos;
    }

    topLevelEof () {
        return this.pos.length === 1 && this.eof();
    }

    clone () {
        const tc = new TokenCursor(this.tokens);
        tc.pos = [...this.pos];
        tc.errors = this.errors;
        return tc;
    }

    copyFrom (tc) {
        this.tokens = tc.tokens;
        this.pos = [...tc.pos];
        this.errors = tc.errors;
    }

    addErrorToCurrentPos (err) {
        this.errors.push(err);
    }

    getCurrentError (fallback = 'unknown error') {
        if (this.errors.length) {
            return new ParseError(this.errors);
        }
        return new ParseError(fallback);
    }
}

class ParseError {
    constructor (msgOrErrs) {
        this.contents = msgOrErrs;
    }
    toString () {
        if (typeof this.contents === 'string') {
            return this.contents;
        } else {
            return this.contents.map(x => x.toString()).join('\n');
        }
    }
    valueOf () {
        return `[ParseError ${this.toString()}]`;
    }
}

const group = (gclass, inner) => tok => {
    const node = tok.peek();
    if (!(node instanceof gclass)) throw new Error(`unexpected ${node}, expected ${gclass.name}`);
    tok.enter();
    const i = inner(tok);
    tok.exitAssertingEnd();
    tok.next();
    return i;
};

const nbws = opt(match(x => x instanceof SpaceToken, 'non-breaking whitespace'));
const bws = opt(match(x => x instanceof BreakToken, 'breaking whitespace'));
const anyws = opt(match(x => x instanceof WhitespaceToken, 'whitespace'));

const tnull = map(match(x => x instanceof NullToken, 'null'), () => ({ type: 'u' }));
const tnumber = map(match(x => x instanceof NumberToken, 'number'), x => ({ type: 'n', value: parseFloat(x.int + '.' + (x.frac || '0'), 10) }));
const tbool = map(match(x => x instanceof BoolToken, 'bool'), x => ({ type: 'b', value: x.value }));
const tstring = map(match(x => x instanceof StringToken, 'string'), x => ({ type: 's', value: x.contents }));

const primitive = oneOf(tnull, tbool, tnumber, tstring);

const delim = match(x => x instanceof DelimToken, 'delimiter');

const callArgsInner = map(cat(
    many(map(cat(anyws, expr, anyws, delim), x => x[1])),
    anyws,
    opt(expr),
    anyws,
), ([a,, b]) => a.concat(b));
const callArgs = group(ParensToken, callArgsInner);
const callExpr = map(cat(
    match(x => x instanceof IdentToken && !(x instanceof InfixToken), 'callee identifier'),
    anyws,
    opt(callArgs),
), ([a,, c]) => c.length ? ({ type: 'c', func: { type: 'r', name: a.ident }, args: c[0] }) : ({
    type: 'r',
    name: a.ident,
}));

const groupExpr = group(ParensToken, expr);

const matrixInner = map(cat(
    many(map(cat(anyws, expr, anyws, delim), a => a[1])),
    opt(map(cat(anyws, expr), a => a[1])),
    anyws,
), ([a, b]) => a.concat(b));
const matrixExpr = map(group(BracketsToken, matrixInner), items => {
    const MATRIX_TYPES = 'ubnsm';
    let isPure = true;
    for (const item of items) {
        if (!MATRIX_TYPES.includes(item.type)) {
            isPure = false;
        }
    }
    if (isPure) return { type: 'm', value: items.map(item => item.value) };
    else return { type: 'l', items };
});

const arrow = match(x => x instanceof InfixToken && x.ident === '->', '->');
const fatArrow = match(x => x instanceof InfixToken && x.ident === '=>', '=>');
const equals = match(x => x instanceof InfixToken && x.ident === '=', '=');

const switchIdent = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'switch', 'switch keyword');
const lastSwitchCaseWildcard = map(match(x => x instanceof IdentToken && !x.isRaw && x.ident === '_', 'wildcard case'), () => null);
const lastSwitchCase = oneOf(lastSwitchCaseWildcard, expr);
const notLastSwitchCase = not(lastSwitchCaseWildcard, expr, 'wildcard case');
const switchCases = map(cat(
    many(map(cat(anyws, notLastSwitchCase, anyws, fatArrow, anyws, expr, anyws, delim),
        ([, a,,,, b]) => ({ cond: a, value: b }))),
    opt(map(cat(anyws, lastSwitchCase, anyws, fatArrow, anyws, expr),
        ([, a,,,, b]) => ({ cond: a, value: b }))),
    anyws,
    opt(delim),
    anyws,
), ([a, b]) => a.concat(b));
const switchContents = group(BracesToken, switchCases);
const switchExpr = map(cat(switchIdent, anyws, switchContents), ([,, m]) => ({
    type: 'w',
    matches: m,
}));

const closureArg = map(match(x => x instanceof IdentToken && !(x instanceof InfixToken), 'argument name'), x => x.ident);
const closureArgsInner = map(cat(
    many(map(cat(anyws, closureArg, anyws, delim), ([, a]) => a)),
    opt(map(cat(anyws, closureArg), ([, a]) => a)),
    anyws,
), ([a, b]) => a.concat(b));
const closureArgs = oneOf(map(closureArg, arg => [arg]), group(ParensToken, closureArgsInner));
const closureWhereKey = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'where', 'where keyword');
const closureWhere = map(opt(map(cat(closureWhereKey, anyws, group(BracesToken, program)), a => a[2])), a => a[0]);
const closureBody = map(cat(expr, anyws, closureWhere), ([e,, w]) => {
    const body = {
        type: 'd',
        defs: new Set(),
    };
    body.defs.add({
        type: 'ds',
        name: '=',
        expr: e,
    });
    if (w) for (const d of w.defs) body.defs.add(d);
    return body;
});
const closureExpr = map(cat(closureArgs, nbws, arrow, anyws, closureBody), ([p,,,, b]) => ({
    type: 'f',
    params: p,
    body: b,
}));

const minus = match(x => x instanceof InfixToken && x.ident === '-', 'minus sign');
const unaryMinusExpr = map(cat(minus, nbws, nonInfixExpr), ([,, e]) => ({
    type: 'c',
    func: { type: 'r', name: '-' },
    args: [{ type: 'n', value: 0 }, e],
}));

const _nonInfixExpr = oneOf(
    unaryMinusExpr,
    primitive,
    matrixExpr,
    switchExpr,
    closureExpr,
    groupExpr,
    callExpr,
);
function nonInfixExpr (tok) { // for hoisting
    return _nonInfixExpr(tok);
}

const isInfixOp = x => x instanceof InfixToken && x.ident !== '=' && x.ident !== '->' && x.ident !== '=>';

const IS_INFIX = Symbol();
const IS_INFIX_OP = Symbol();

const mkInfix = a => {
    Object.defineProperty(a, IS_INFIX, {
        value: true,
        enumerable: false,
    });
    return a;
};
const mkInfixOp = a => {
    Object.defineProperty(a, IS_INFIX_OP, {
        value: true,
        enumerable: false,
    });
    return a;
};

const infixExpr = map(
    cat(nonInfixExpr, anyws, match(isInfixOp, 'infix operator'), anyws, expr),
    ([a,, o,, b]) => mkInfix({
        type: 'c',
        func: mkInfixOp({ type: 'r', name: o.ident }),
        args: [a, b],
        [IS_INFIX]: true,
    }),
);

const OP_PREC = [
    ['||'],
    ['&&'],
    ['==', '!='],
    ['>=', '<=', '>', '<'],
    ['|'],
    ['&'],
    ['<<', '>>'],
    ['+', '-'],
    ['*', '/', '%'],
    ['^'],
];
const KNOWN_PREC_OPS = OP_PREC.flatMap(x => x);

function fixPrec (infixExpr) {
    return tok => {
        const expr = infixExpr(tok);

        const parts = [];
        const additionalOps = [];
        const flatten = e => {
            if (e[IS_INFIX]) {
                flatten(e.args[0]);
                parts.push(e.func);
                if (!KNOWN_PREC_OPS.includes(e.func.name)) additionalOps.push(e.func.name);
                flatten(e.args[1]);
            } else parts.push(e);
        };
        flatten(expr);

        const precLevels = OP_PREC.concat([additionalOps]).reverse();
        for (const ops of precLevels) {
            let i = 0;
            while (i < parts.length) {
                const part = parts[i];
                if (part[IS_INFIX_OP] && ops.includes(part.name)) {
                    const pLeft = parts[i - 1];
                    const pRight = parts[i + 1];
                    if (!pLeft || !pRight) throw new Error(`error during precedence sort: lonely operator`);
                    i--;
                    parts.splice(i, 3, mkInfix({
                        type: 'c',
                        func: part,
                        args: [pLeft, pRight],
                    }));
                }
                i++;
            }
        }

        if (parts.length !== 1) throw new Error(`error during precedence sort: incomplete reduction`);
        return parts[0];
    };
}

const _expr = oneOf(
    fixPrec(infixExpr),
    nonInfixExpr,
);
function expr (tok) { // for hoisting
    return _expr(tok);
}

const defName = match(x => x instanceof IdentToken, 'definition name');
const definition = map(cat(defName, anyws, equals, anyws, expr), ([n,,,, e]) => ({
    type: 'ds',
    name: n.ident,
    expr: e,
}));

const _program = map(
    cat(anyws, many(map(cat(definition, bws), ([a]) => a)), opt(definition), anyws),
    ([, a, b]) => {
        const defs = new Set();
        for (const d of a.concat(b)) defs.add(d);
        return { type: 'd', defs };
    },
);
function program (tok) { // for hoisting
    return _program(tok);
}

export function parse (tokenStream) {
    const cursor = new TokenCursor(tokenStream);
    const defs = program(cursor);
    if (!cursor.topLevelEof()) {
        throw cursor.getCurrentError();
    }
    return defs;
}

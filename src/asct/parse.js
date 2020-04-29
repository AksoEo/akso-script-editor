import {
    cat,
    oneOf,
    opt,
    match,
    map,
    many,
    EOFError,
} from './comb';

import {
    NullToken,
    BoolToken,
    NumberToken,
    StringToken,
    IdentToken,
    InfixToken,
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
    if (!(node instanceof gclass)) throw new Error(`expected ${gclass.name}`);
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
    match(x => x instanceof IdentToken && !(x instanceof InfixToken)),
    anyws,
    opt(callArgs),
), ([a,, c]) => c.length ? ({ type: 'c', func: { type: 'r', name: a.ident }, args: c[0] }) : ({
    type: 'c',
    func: { type: 'r', name: 'id' },
    args: [{ type: 'r', name: a.ident }],
}));

const groupExpr = group(ParensToken, expr);

const arrow = match(x => x instanceof InfixToken && x.ident === '=>');

const switchIdent = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'switch');
const lastSwitchCaseWildcard = map(match(x => x instanceof IdentToken && !x.isRaw && x.ident === '_'), () => null);
const lastSwitchCase = oneOf(lastSwitchCaseWildcard, expr);
const switchCases = cat(
    many(map(cat(anyws, expr, anyws, arrow, anyws, expr, anyws, delim),
        ([, a,,, b]) => ({ cond: a, value: b }))),
    opt(map(cat(anyws, lastSwitchCase, anyws, arrow, anyws, expr),
        ([, a,,, b]) => ({ cond: a, value: b }))),
    anyws,
);
const switchContents = group(BracesToken, switchCases);
const switchExpr = map(cat(switchIdent, anyws, switchContents), ([,, m]) => ({
    type: 'w',
    matches: m,
}));

const closureArg = map(match(x => x instanceof IdentToken && !(x instanceof InfixToken)), x => x.ident);
const closureArgsInner = map(cat(
    many(map(cat(anyws, closureArg, anyws, delim), ([, a]) => a)),
    opt(map(cat(anyws, closureArg), ([, a]) => a)),
    anyws,
), ([a, b]) => a.concat(b));
const closureArgs = group(ParensToken, closureArgsInner);
const closureWhereKey = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'where');
const closureWhere = opt(closureWhereKey, anyws, group(BracesToken, program));
const closureBody = map(cat(expr, nbws, closureWhere), ([e,, w]) => {
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
const closureExpr = map(cat(closureArgs, anyws, arrow, anyws, closureBody), ([p,,, b]) => ({
    type: 'f',
    params: p,
    body: b,
}));

const minus = match(x => x instanceof InfixToken && x.ident === '-');
const unaryMinusExpr = map(cat(minus, nbws, nonInfixExpr), ([,, e]) => ({
    type: 'c',
    func: { type: 'r', name: '-' },
    args: [{ type: 'n', value: 0 }, e],
}));

const _nonInfixExpr = oneOf(
    unaryMinusExpr,
    primitive,
    callExpr,
    switchExpr,
    closureExpr,
    groupExpr,
);
function nonInfixExpr (tok) { // for hoisting
    return _nonInfixExpr(tok);
}

const infixExpr = map(
    cat(nonInfixExpr, anyws, match(x => x instanceof InfixToken), anyws, expr),
    ([a,, o,, b]) => ({
        type: 'c',
        func: { type: 'r', name: o.ident },
        args: [a, b],
    }),
);

function fixPrec (infixExpr) {
    // TODO
    return infixExpr;
}

const _expr = oneOf(
    fixPrec(infixExpr),
    nonInfixExpr,
);
function expr (tok) { // for hoisting
    return _expr(tok);
}

const equals = match(x => x instanceof InfixToken && x.ident === '=');
const defName = match(x => x instanceof IdentToken);
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
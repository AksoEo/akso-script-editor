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
    Token,
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
    IndentToken,
} from './lex';
import { OP_PREC } from './shared';
import { AscContext } from '../model';

class TokenCursor {
    tokens: Token[];
    pos: number[];
    proxy: null;
    errors: ParseError[];
    ctx: AscContext;
    prevTok: Token | null;
    constructor (tokenStream: Token[], ctx: AscContext) {
        this.tokens = tokenStream;
        this.pos = [0];
        this.proxy = null;
        this.errors = [];
        this.ctx = ctx;
        this.prevTok = null;
    }

    peek (): Token {
        if (this.eof()) throw new EOFError(`unexpected stream end`);
        let t: Token | { contents: Token[] } = { contents: this.tokens };
        for (const p of this.pos) {
            t = t.contents[p];
        }
        return t as Token;
    }

    span () {
        if (this.eof()) return this.prevTok.span;
        return this.peek().span;
    }

    next () {
        const t = this.peek();
        this.pos[this.pos.length - 1]++;
        this.errors = [];
        this.prevTok = t;
        return t;
    }

    enter () {
        const t = this.peek();
        if (!Array.isArray(t.contents)) this.throw(`cannot enter token without contents`);
        this.pos.push(0);
    }

    exitAssertingEnd () {
        if (!this.eof()) this.throw(`attempt to exit token without reading all contents`);
        this.pos.pop();
    }

    eof () {
        const pos = [...this.pos];
        const lastPos = pos.pop();
        let t: Token | { contents: Token[] } = { contents: this.tokens };
        for (const p of pos) {
            t = t.contents[p];
        }
        return (t.contents as Token[]).length === lastPos;
    }

    topLevelEof () {
        return this.pos.length === 1 && this.eof();
    }

    clone () {
        const tc = new TokenCursor(this.tokens, this.ctx);
        tc.pos = [...this.pos];
        tc.errors = this.errors;
        return tc;
    }

    copyFrom (tc) {
        this.tokens = tc.tokens;
        this.ctx = tc.ctx;
        this.pos = [...tc.pos];
        this.errors = tc.errors;
    }

    addErrorToCurrentPos (err) {
        this.errors.push(err);
    }

    throw (err) {
        if (typeof err === 'string') throw new ParseError(err, this.clone());
        else throw err;
    }

    getCurrentError (fallback = 'unknown error') {
        if (this.errors.length) {
            return new ParseError(this.errors, this.clone());
        }
        return new ParseError(fallback, this.clone());
    }
}

class ParseError {
    contents: ParseError[] | string;
    state: TokenCursor | null;
    constructor (msgOrErrs, state = null) {
        this.contents = msgOrErrs;
        this.state = state;
    }
    get nextFewTokens () {
        const s = this.state.clone();
        const tokens = [];
        for (let i = 0; i < 10; i++) {
            if (s.eof()) break;
            tokens.push(s.next());
        }
        return tokens;
    }
    get _debug__stringified () {
        return this.toString();
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
    getSpan () {
        if (!this.state) return null;
        return this.state.span();
    }
}

const group = (gclass, inner) => (tok) => {
    const node = tok.peek();
    if (!(node instanceof gclass)) tok.throw(`unexpected ${node}, expected ${gclass.name}`);
    tok.enter();
    const i = inner(tok);
    tok.exitAssertingEnd();
    tok.next();
    return i;
};
const ctxify = (inner) => (tok) => {
    const res = inner(tok);
    res.ctx = tok.ctx;
    return res;
};

const nbws = many(match(x => x instanceof SpaceToken, 'non-breaking whitespace'));
const anyws = many(match(x => x instanceof WhitespaceToken, 'whitespace'));
const bws = tok => {
    const r = anyws(tok);
    for (const x of r) if (x instanceof BreakToken) return null;
    tok.throw('expected line break');
};

const tnull = ctxify(map(match(x => x instanceof NullToken, 'null'), () => ({
    type: 'u',
    parent: null,
})));
const tnumber = ctxify(map(match(x => x instanceof NumberToken, 'number'), x => ({
    type: 'n',
    parent: null,
    value: parseFloat(x.int + '.' + (x.frac || '0')),
})));
const tbool = ctxify(map(match(x => x instanceof BoolToken, 'bool'), x => ({
    type: 'b',
    parent: null,
    value: x.value,
})));
const tstring = ctxify(map(match(x => x instanceof StringToken, 'string'), x => ({
    type: 's',
    parent: null,
    value: x.contents,
})));

const primitive = oneOf(tnull, tbool, tnumber, tstring);

const delim = match(x => x instanceof DelimToken, 'delimiter');

const callArgsInner = map(cat(
    many(map(cat(anyws, expr, anyws, delim), x => x[1])),
    anyws,
    opt(expr),
    anyws,
), ([a,, b]) => a.concat(b));
const callArgs = map(cat(nbws, group(ParensToken, callArgsInner)), a => a[1]);
const callExpr = ctxify(map(cat(
    match(x => x instanceof IdentToken && !(x instanceof InfixToken), 'callee identifier'),
    opt(callArgs),
), ([a, c]) => {
    if (c.length) {
        const ex = {
            type: 'c',
            parent: null,
            func: {
                type: 'r',
                parent: null,
                name: a.ident,
            },
            args: c[0],
        };
        ex.func.parent = ex;
        for (const arg of c[0]) arg.parent = ex;
        return ex;
    } else {
        return { type: 'r', parent: null, name: a.ident };
    }
}));

const IS_INFIX = Symbol();
const IS_INFIX_OP = Symbol();

const groupExpr = map(
    group(ParensToken, cat(anyws, expr, anyws)),
    a => {
        const ex = a[1];
        if (!ex) return ex;
        delete ex[IS_INFIX]; // mark this non-infix so fixPrec doesn't mess it up
        return ex;
    },
);

const matrixInner = map(cat(
    many(map(cat(anyws, expr, anyws, delim), a => a[1])),
    opt(map(cat(anyws, expr), a => a[1])),
    anyws,
), ([a, b]) => a.concat(b));
const matrixExpr = ctxify(map(group(BracketsToken, matrixInner), items => {
    const MATRIX_TYPES = 'ubnsm';
    let isPure = true;
    for (const item of items) {
        if (!MATRIX_TYPES.includes(item.type)) {
            isPure = false;
        }
    }
    if (isPure) {
        return {
            type: 'm',
            parent: null,
            value: items.map(item => {
                if (item.type === 'u') return null;
                return item.value;
            }),
        };
    } else {
        const ex = { type: 'l', parent: null, items };
        for (const item of items) item.parent = ex;
        return ex;
    }
}));

const arrow = match(x => x instanceof InfixToken && x.ident === '->', '->');
const fatArrow = match(x => x instanceof InfixToken && x.ident === '=>', '=>');
const equals = match(x => x instanceof InfixToken && x.ident === '=', '=');

const switchIdent = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'switch', 'switch keyword');
const wildcardSwitchKey = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'otherwise', 'otherwise');
const notLastSwitchCase = not(wildcardSwitchKey, expr, 'wildcard case');

const undelimSwitchCase = map(
    cat(anyws, notLastSwitchCase, anyws, fatArrow, anyws, expr),
    ([, a,,,, e]) => ({ cond: a, value: e }),
);
const switchCaseDelim = oneOf(bws, cat(nbws, delim, anyws));
const delimSwitchCase = map(cat(undelimSwitchCase, switchCaseDelim), a => a[0]);
const wildcardSwitchCase = map(
    cat(anyws, wildcardSwitchKey, anyws, expr),
    ([,,, e]) => ({ cond: null, value: e }),
);
const lastSwitchCase = oneOf(
    wildcardSwitchCase,
    undelimSwitchCase,
);

const switchCases = map(cat(
    many(delimSwitchCase),
    opt(lastSwitchCase),
    anyws, opt(delim), anyws,
), ([a, b]) => a.concat(b));
const switchContents = oneOf(
    group(IndentToken, switchCases),
    map(cat(anyws, group(BracesToken, switchCases)), a => a[1]),
    map(cat(nbws, lastSwitchCase), ([, c]) => [c]),
);
const switchExpr = ctxify(map(cat(switchIdent, switchContents), ([, m]) => {
    const ex = { type: 'w', parent: null, matches: m };
    for (const { cond, value } of m) {
        if (cond) cond.parent = ex;
        value.parent = ex;
    }
    return ex;
}));

const closureArg = map(match(x => x instanceof IdentToken && !(x instanceof InfixToken), 'argument name'), x => x.ident);
const closureArgsInner = map(cat(
    many(map(cat(anyws, closureArg, anyws, delim), ([, a]) => a)),
    opt(map(cat(anyws, closureArg), ([, a]) => a)),
    anyws,
), ([a, b]) => a.concat(b));
const closureArgs = oneOf(map(closureArg, arg => [arg]), group(ParensToken, closureArgsInner));
const closureWhereKey = match(x => x instanceof IdentToken && !x.isRaw && x.ident === 'where', 'where keyword');
const closureWhereInner = oneOf(
    group(IndentToken, program),
    map(cat(anyws, group(BracesToken, program)), a => a[1]),
    ctxify(map(cat(nbws, definition), a => {
        const defs = {
            type: 'd',
            defs: new Set([a[1]]),
            floatingExpr: new Set(),
        };
        a[1].parent = defs;
        return defs;
    })),
);
const closureWhere = map(
    opt(map(cat(anyws, closureWhereKey, closureWhereInner), a => a[2])),
    a => a[0],
);
const closureBody = map(cat(expr, closureWhere), ([e, w], tok) => {
    const body = {
        ctx: tok.ctx,
        type: 'd',
        parent: null,
        defs: new Set<any>(),
        floatingExpr: new Set(),
    };
    body.defs.add({
        ctx: tok.ctx,
        type: 'ds',
        parent: null,
        name: '=',
        expr: e,
    });
    if (w) for (const d of w.defs) body.defs.add(d);
    for (const d of body.defs) d.parent = body;
    return body;
});
const closureExpr = ctxify(map(cat(closureArgs, nbws, arrow, anyws, closureBody), ([p,,,, b]) => ({
    type: 'f',
    parent: null,
    params: p,
    body: b,
})));

const minus = match(x => x instanceof InfixToken && x.ident === '-', 'minus sign');
const unaryMinusExpr = ctxify(map(cat(minus, nbws, nonInfixExpr), ([,, e]) => {
    const ex = {
        type: 'c',
        parent: null,
        func: { type: 'r', parent: null, name: '-' },
        args: [{ type: 'n', parent: null, value: 0 }, e],
    };
    ex.func.parent = ex;
    for (const arg of ex.args) arg.parent = ex;
    return ex;
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

const mkInfix = a => {
    Object.defineProperty(a, IS_INFIX, {
        value: true,
        enumerable: false,
        configurable: true,
    });
    return a;
};
const mkInfixOp = a => {
    Object.defineProperty(a, IS_INFIX_OP, {
        value: true,
        enumerable: false,
        configurable: true,
    });
    return a;
};

const infixExpr = ctxify(map(
    cat(nonInfixExpr, anyws, match(isInfixOp, 'infix operator'), anyws, expr),
    ([a,, o,, b]) => {
        const iex = mkInfix({
            type: 'c',
            parent: null,
            func: mkInfixOp({ type: 'r', name: o.ident }),
            args: [a, b],
            [IS_INFIX]: true,
        });
        iex.func.parent = iex;
        a.parent = iex;
        b.parent = iex;
        return iex;
    },
));

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
                    if (!pLeft || !pRight) tok.throw(`error during precedence sort: lonely operator`);
                    i--;
                    const iex = mkInfix({
                        ctx: tok.ctx,
                        type: 'c',
                        parent: null,
                        func: part,
                        args: [pLeft, pRight],
                    });
                    pLeft.parent = iex;
                    pRight.parent = iex;
                    parts.splice(i, 3,iex);
                }
                i++;
            }
        }

        if (parts.length !== 1) tok.throw(`error during precedence sort: incomplete reduction`);
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
const _definition = ctxify(map(cat(defName, anyws, equals, anyws, expr), ([n,,,, e]) => {
    const def = {
        type: 'ds',
        parent: null,
        name: n.ident,
        expr: e,
    };
    e.parent = def;
    return def;
}));
function definition (tok) {
    return _definition(tok);
}

const _program = map(
    cat(anyws, many(map(cat(definition, bws), ([a]) => a)), opt(definition), anyws),
    ([, a, b], tok) => {
        const defs = new Set();
        const out = {
            ctx: tok.ctx,
            type: 'd',
            parent: null,
            defs,
            floatingExpr: new Set(),
        };
        for (const d of a.concat(b)) {
            defs.add(d);
            d.parent = out;
        }
        return out;
    },
);
function program (tok) { // for hoisting
    return _program(tok);
}

export function parse (tokenStream, ctx) {
    const cursor = new TokenCursor(tokenStream, ctx);
    const defs = program(cursor);
    if (!cursor.topLevelEof()) {
        throw cursor.getCurrentError();
    }
    return defs;
}

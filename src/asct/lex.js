import {
    cat,
    tag,
    wrap,
    oneOf,
    takeUntil,
    map,
    regex,
    many,
    EOFError,
} from './comb';
import { infixIdentRegex, bareIdentRegex, numberRegex } from './shared';

class StrCursor {
    constructor (str) {
        this.str = str;
        this.pos = 0;
        this.errors = [];
    }

    peek () {
        if (this.eof()) throw new EOFError(`unexpected EOF`);
        return this.str[this.pos];
    }
    next () {
        const c = this.peek();
        this.pos++;
        this.errors = [];
        return c;
    }
    clone () {
        const cursor = new StrCursor(this.str);
        cursor.pos = this.pos;
        cursor.errors = this.errors;
        return cursor;
    }
    copyFrom (str) {
        this.str = str.str;
        this.pos = str.pos;
        this.errors = str.errors;
    }
    eof () {
        return this.pos === this.str.length;
    }
    regexMatch (re) {
        return this.str.substr(this.pos).match(re);
    }
    addErrorToCurrentPos (err) {
        this.errors.push(err);
    }
    getCurrentError (fallback = 'unknown error') {
        if (this.errors.length) {
            return new LexError(this.errors);
        }
        return new LexError(fallback);
    }
    throw (msg) {
        if (typeof msg === 'string') throw new LexError(msg);
        else throw msg;
    }
}

export class LexError {
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
        return `[LexError ${this.toString()}]`;
    }
    getSpan () {
        if (this.span) return this.span;
        if (Array.isArray(this.contents)) {
            for (const c of this.contents) {
                const s = c.getSpan();
                if (s) return s;
            }
        }
        return null;
    }
}

class Token {
    valueOf () {
        return this.toString();
    }
}
export class IdentToken extends Token {
    constructor (ident, isRaw = false) {
        super();
        this.ident = ident;
        this.isRaw = isRaw;
    }
    toString () {
        return `ident(${this.ident}${this.isRaw ? ' (raw)' : ''})`;
    }
}
export class InfixToken extends IdentToken {
    toString () {
        return `infix(${this.ident})`;
    }
}
export class NumberToken extends Token {
    constructor (int, frac) {
        super();
        this.int = int;
        this.frac = frac;
    }
    toString () {
        return `number(${this.int}.${this.frac})`;
    }
}
export class BoolToken extends Token {
    constructor (value) {
        super();
        this.value = value;
    }
    toString () {
        return `bool(${this.value})`;
    }
}
export class NullToken extends Token {
    toString () {
        return `null`;
    }
}
export class WhitespaceToken extends Token {}
export class SpaceToken extends WhitespaceToken {
    toString () {
        return `·`;
    }
}
export class BreakToken extends WhitespaceToken {
    toString () {
        return `⏎`;
    }
}
export class StringToken extends Token {
    constructor (contents) {
        super();
        this.contents = contents;
    }
    toString () {
        return `"${this.contents.substr(0, 50)}"`;
    }
}
export class DelimToken extends Token {
    toString () {
        return `,`;
    }
}
export class ContainerToken extends Token {
    constructor (contents) {
        super();
        this.contents = contents;
    }
}
export class BracketsToken extends ContainerToken {
    toString () {
        return `[ ${this.contents.join('')} ]`;
    }
}
export class BracesToken extends ContainerToken {
    toString () {
        return `{ ${this.contents.join('')} }`;
    }
}
export class ParensToken extends ContainerToken {
    toString () {
        return `( ${this.contents.join('')} )`;
    }
}
export class IndentToken extends ContainerToken {
    toString () {
        return `⇥{ ${this.contents.join('')} }`;
    }
}

const spanned = parser => str => {
    const start = str.pos;
    try {
        const item = parser(str);
        const end = str.pos;
        item.span = [start, end];
        return item;
    } catch (err) {
        const err2 = err instanceof LexError ? err : new LexError(err);
        err2.span = [start, str.pos];
        throw err2;
    }
};
const xtag = (t, desc) => {
    const u = tag(t, desc);

    return str => {
        const tm = u(str);
        if (!str.eof()) {
            const bareMatch = (t + str.peek()).match(bareIdentRegex);
            if (bareMatch[0].length === t.length + 1) {
                throw new LexError(`unexpected ${str.peek()}, expected non-identifier symbol`);
            }
        }
        return tm;
    };
};

const rawIdentInner = (str) => {
    let hashes = 0;
    let c;
    while ((c = str.peek())) {
        if (c !== '#') break;
        hashes++;
        str.next();
    }
    if (str.next() !== '"') throw new LexError(`expected " at beginning of raw ident`);
    const closeTag = '"' + '#'.repeat(hashes + 1);
    const contents = takeUntil(tag(closeTag, 'raw ident close tag'))(str);
    for (let i = 0; i < closeTag.length; i++) str.next();
    return contents;
};
const rawIdent = spanned(map(cat(tag('r#', 'raw ident start tag'), rawIdentInner), (a) => new IdentToken(a[1], true)));
const bareIdent = spanned(map(regex(bareIdentRegex, 'bare ident'), match => new IdentToken(match[1])));
const ident = oneOf(rawIdent, bareIdent);
const infixIdent = spanned(map(regex(infixIdentRegex, 'infix ident'), match => new InfixToken(match[1])));
const number = spanned(map(regex(numberRegex, 'number'), match => new NumberToken(match[1], match[2] || '')));
const bool = spanned(map(oneOf(xtag('yes'), xtag('no'), xtag('true'), xtag('false')), token =>
    new BoolToken(token === 'yes' || token === 'true')));
const nul = spanned(map(xtag('null'), () => new NullToken()));
const ws = spanned(map(regex(/^(\s+)/, 'whitespace'), match => match[1].includes('\n') ? new BreakToken() : new SpaceToken()));
const string = spanned((str) => {
    if (str.next() !== '"') throw new LexError('expected " at beginning of string');
    let c;
    let contents = '';
    let escapeNext = false;
    while ((c = str.next())) {
        if (c === '\\') {
            escapeNext = true;
            continue;
        }
        if (!escapeNext && c === '"') {
            break;
        }
        escapeNext = false;
        contents += c;
    }
    return new StringToken(contents);
});

const treeBracket = spanned(map(wrap('[', ']', tokenStream, '[...]'), inner => new BracketsToken(inner)));
const treeBrace = spanned(map(wrap('{', '}', tokenStream, '{...}'), inner => new BracesToken(inner)));
const treeParens = spanned(map(wrap('(', ')', tokenStream, '(...)'), inner => new ParensToken(inner)));

const delim = spanned(map(tag(','), () => new DelimToken()));

const oneValueToken = oneOf(nul, bool, delim, number, string, ident, infixIdent, treeBracket, treeBrace, treeParens);
const nbws = spanned(map(regex(/^[ \t]+/, 'non-breaking whitespace'), () => new SpaceToken()));
const nbToken = oneOf(nbws, oneValueToken);

const treeIndent = spanned((str) => {
    // find next line break
    while (true) {
        const c = str.peek();
        if (c === '\n') break;
        else if (c.match(/\s/)) str.next();
        else throw new Error(`unexpected ${c}, expected breaking whitespace`);
    }

    const getLineIndentation = str => {
        if (str.eof()) return -1;
        let indent;
        outer:
        while (true) {
            indent = 0;
            while (true) {
                if (str.eof()) return -1;
                const c = str.peek();
                if (c === ' ') indent++;
                else if (c === '\t') indent += 4;
                else if (c === '\n') {
                    str.next();
                    continue outer; // skip empty lines
                }
                else break outer;
                str.next();
            }
        }
        return indent;
    };

    // we're now at the beginning of a line
    // find min indetation level
    const minIndent = getLineIndentation(str);

    const contents = [];

    // we're now at the beginning of the first line's contents
    let atSOL = false;
    while (true) {
        if (str.eof()) break;
        else if (str.peek() === '\n') {
            // line break!
            atSOL = true;
            contents.push(new BreakToken());
            str.next();
            continue;
        } else if (atSOL) {
            atSOL = false;
            // count indentation
            const s = str.clone();
            const currentIndent = getLineIndentation(s);
            if (currentIndent < minIndent) break; // end of block
            str.copyFrom(s); // otherwise continue
        }
        contents.push(...nbTreeToken(str));
    }

    return new IndentToken(contents);
});

const whereClauseKey = spanned(map(xtag('where'), () => new IdentToken('where')));
const switchClauseKey = spanned(map(xtag('switch'), () => new IdentToken('switch')));

// treeIndent will swallow trailing line breaks
const wsWhereClause = map(cat(whereClauseKey, treeIndent), ([a, b]) => [a, b, new BreakToken()]);
const wsSwitchClause = map(cat(switchClauseKey, treeIndent), ([a, b]) => [a, b, new BreakToken()]);

const indentClause = oneOf(
    wsWhereClause,
    wsSwitchClause,
);

const _nbTreeToken = oneOf(
    indentClause,
    map(nbToken, x => [x]),
);
function nbTreeToken (str) { // for hoisting
    return _nbTreeToken(str);
}

const oneTokenList = oneOf(
    indentClause,
    map(ws, x => [x]),
    map(nbToken, x => [x]),
);

const _tokenStream = map(many(oneTokenList), x => x.flatMap(y => y));
function tokenStream (str) { // for hoisting
    return _tokenStream(str);
}

export function lex (src) {
    const cursor = new StrCursor(src);
    const tokens = tokenStream(cursor);
    if (!cursor.eof()) {
        throw cursor.getCurrentError();
    }
    return tokens;
}

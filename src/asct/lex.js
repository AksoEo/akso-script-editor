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
}

class LexError {
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
        return `Ident(${this.ident}${this.isRaw ? ' (raw)' : ''})`;
    }
}
export class InfixToken extends IdentToken {
    toString () {
        return `InfixIdent(${this.ident})`;
    }
}
export class NumberToken extends Token {
    constructor (int, frac) {
        super();
        this.int = int;
        this.frac = frac;
    }
    toString () {
        return `Number(${this.int}.${this.frac})`;
    }
}
export class BoolToken extends Token {
    constructor (value) {
        super();
        this.value = value;
    }
    toString () {
        return `Bool(${this.value})`;
    }
}
export class NullToken extends Token {
    toString () {
        return `Null`;
    }
}
export class WhitespaceToken extends Token {}
export class SpaceToken extends WhitespaceToken {
    toString () {
        return `NonBreakingWhitespace`;
    }
}
export class BreakToken extends WhitespaceToken {
    toString () {
        return `BreakingWhitespace`;
    }
}
export class StringToken extends Token {
    constructor (contents) {
        super();
        this.contents = contents;
    }
    toString () {
        return `String(${this.contents.substr(0, 50)})`;
    }
}
export class DelimToken extends Token {
    toString () {
        return `Delimiter`;
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
        return `Brackets(${this.contents.join(', ')})`;
    }
}
export class BracesToken extends ContainerToken {
    toString () {
        return `Braces(${this.contents.join(', ')})`;
    }
}
export class ParensToken extends ContainerToken {
    toString () {
        return `Parens(${this.contents.join(', ')})`;
    }
}

const rawIdentInner = (str) => {
    let hashes = 0;
    let c;
    while ((c = str.peek())) {
        if (c !== '#') break;
        hashes++;
        str.next();
    }
    if (str.next() !== '"') throw new LexError(`expected " at beginning of raw ident`);
    const closeTag = '"' + '#'.repeat(hashes);
    const contents = takeUntil(tag(closeTag, 'raw ident close tag'))(str);
    return contents;
};
const rawIdent = map(cat(tag('r#', 'raw ident start tag'), rawIdentInner), (a) => new IdentToken(a[1], true));
const bareIdent = map(regex(/^([_a-zA-Z@][a-zA-Z0-9~!@#$%^&*_+\-=<>/'\\|]*)/, 'bare ident'), match => new IdentToken(match[1]));
const ident = oneOf(rawIdent, bareIdent);
const infixIdent = map(regex(/^([+\-*/\\|~!@#$%^&=<>]+)/, 'infix ident'), match => new InfixToken(match[1]));
const number = map(regex(/^([0-9]+)(?:\.([0-9]+))?/, 'number'), match => new NumberToken(match[1], match[2] || ''));
const bool = map(oneOf(tag('yes'), tag('no'), tag('true'), tag('false')), token =>
    new BoolToken(token === 'yes' || token === 'true'));
const nul = map(tag('null'), () => new NullToken());
const ws = map(regex(/^(\s+)/, 'whitespace'), match => match[1].includes('\n') ? new BreakToken() : new SpaceToken());
const string = (str) => {
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
};

const treeBracket = map(wrap('[', ']', tokenStream, '[...]'), inner => new BracketsToken(inner));
const treeBrace = map(wrap('{', '}', tokenStream, '{...}'), inner => new BracesToken(inner));
const treeParens = map(wrap('(', ')', tokenStream, '(...)'), inner => new ParensToken(inner));

const delim = map(tag(','), () => new DelimToken());

const oneToken = oneOf(ws, nul, bool, delim, number, string, ident, infixIdent, treeBracket, treeBrace, treeParens);

const _tokenStream = many(oneToken);
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

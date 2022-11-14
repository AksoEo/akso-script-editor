//! Parser combinators.

export class EOFError extends Error {}

export interface Cursor {
    getPos(): string;
    peek();
    next();
    clone(): Cursor;
    copyFrom(cursor: Cursor);
    eof(): boolean;
    regexMatch(re: RegExp): RegExpMatchArray;
    addErrorToCurrentPos(err: string);
    getCurrentError(fallback?: string);
    throw(msg: string);
}
export type Parser<T> = (str: Cursor) => T;

export const cat = <T>(...parsers: Parser<T>[]) => (str: Cursor) => parsers.map(parser => parser(str));
export const tag = (tag: string, desc = 'tag') => (str: Cursor) => {
    for (const c of tag) {
        const d = str.next();
        if (d !== c) str.throw(`failed to parse ${desc}: unexpected ${d}, expected ${c}`);
    }
    return tag;
};
export const wrap = <T>(left: string, right: string, inner: Parser<T>, desc = 'token') => (str: Cursor) => {
    const start = str.next();
    if (start !== left) str.throw(`failed to parse ${desc}: unexpected ${start}, expected ${left}`);

    const data = inner(str);

    const end = str.next();
    if (end !== right) str.throw(`failed to parse ${desc}: unexpected ${end}, expected ${right}`);

    return data;
};
export const oneOf = <T>(...parsers: Parser<T>[]) => (str: Cursor) => {
    for (const parser of parsers) {
        try {
            const s = str.clone();
            const result = parser(s);
            str.copyFrom(s);
            return result;
        } catch (err) {
            // save error and try the next one
            str.addErrorToCurrentPos(err);
        }
    }
    str.throw(str.getCurrentError('empty oneOf'));
};
export const prefixMatch = <T>(...prefixes: ([T, Parser<T>])[]) => (str: Cursor) => {
    for (const [prefix, parser] of prefixes) {
        if (!prefix || str.peek() === prefix) {
            return parser(str);
        }
    }
    str.throw(str.getCurrentError('no prefix matched'));
};
export const takeUntil = <T>(parser: Parser<T>) => (str: Cursor) => {
    let contents = '';
    while (true) {
        try {
            const s = str.clone();
            parser(s);
            break;
        } catch (err) {
            if (err instanceof EOFError) throw err;
            str.addErrorToCurrentPos(err);
        }
        contents += str.next();
    }
    return contents;
};
export const map = <T>(parser: Parser<T>, morph) => (str: Cursor) => {
    const result = parser(str);
    return morph(result, str);
};
export const regex = (re: RegExp, desc = 'regex') => (str: Cursor) => {
    const match = str.regexMatch(re);
    if (!match) {
        const peek = str.eof() ? '<EOF>' : str.peek();
        str.throw(`unexpected ${peek}, expected match for ${desc} (${re})`);
    }
    for (let i = 0; i < match[0].length; i++) str.next();
    return match;
};
export const opt = <T>(parser: Parser<T>) => (str: Cursor) => {
    try {
        const s = str.clone();
        const res = parser(s);
        str.copyFrom(s);
        return [res];
    } catch (err) {
        str.addErrorToCurrentPos(err);
        return [];
    }
};
export const match = (pred: (s) => boolean, desc = 'predicate match') => (str: Cursor) => {
    const s = str.next();
    if (!(pred(s))) str.throw(`unexpected ${s}, expected ${desc}`);
    return s;
};
export const many = <T>(parser: Parser<T>) => (str: Cursor) => {
    const items = [];
    while (true) {
        try {
            const s = str.clone();
            items.push(parser(s));
            str.copyFrom(s);
        } catch (err) {
            str.addErrorToCurrentPos(err);
            break;
        }
    }
    return items;
};
export const not = <T, U>(notParser: Parser<T>, parser: Parser<U>, desc = 'token') => (str: Cursor) => {
    try {
        notParser(str.clone());
    } catch {
        return parser(str);
    }
    str.throw(`unexpected ${desc}`);
};

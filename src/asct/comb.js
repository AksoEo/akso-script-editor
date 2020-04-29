//! Parser combinators.

export class EOFError extends Error {}

export const cat = (...parsers) => str => parsers.map(parser => parser(str));
export const tag = (tag, desc = 'tag') => str => {
    for (const c of tag) {
        const d = str.next();
        if (d !== c) throw new Error(`failed to parse ${desc}: unexpected ${d}, expected ${c}`);
    }
    return tag;
};
export const wrap = (left, right, inner, desc = 'token') => str => {
    const start = str.next();
    if (start !== left) throw new Error(`failed to parse ${desc}: unexpected ${start}, expected ${left}`);

    const data = inner(str);

    const end = str.next();
    if (end !== right) throw new Error(`failed to parse ${desc}: unexpected ${end}, expected ${right}`);

    return data;
};
export const oneOf = (...parsers) => str => {
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
    throw str.getCurrentError('empty oneOf');
};
export const takeUntil = (parser) => str => {
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
export const map = (parser, morph) => str => {
    const result = parser(str);
    return morph(result);
};
export const regex = (re, desc = 'regex') => str => {
    const match = str.regexMatch(re);
    if (!match) throw new Error(`expected match for ${desc} (${re})`);
    for (let i = 0; i < match[0].length; i++) str.next();
    return match;
};
export const opt = (parser) => str => {
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
export const match = (pred, desc = 'predicate match') => str => {
    const s = str.next();
    if (!(pred(s))) throw new Error(`unexpected ${s}, expected ${desc}`);
    return s;
};
export const many = (parser) => str => {
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
export const not = (notParser, parser, desc = 'token') => str => {
    try {
        notParser(str.clone());
    } catch {
        return parser(str);
    }
    throw new Error(`unexpected ${desc}`);
};

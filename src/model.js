import { evaluate, analyze } from '@tejo/akso-script';
import config from './config';

//! # Editor model
//! - Defs: { type: 'd', defs: Set<Def> }
//! - Def: { type: 'ds', name: string, expr: Expr }
//! - Expr: union
//!    - Expr.Ref: { type: 'r', name: string }
//!    - Expr.Null: { type: 'u' }
//!    - Expr.Bool: { type: 'b', value: bool }
//!    - Expr.Number: { type: 'n', value: number }
//!    - Expr.String: { type: 's', value: string }
//!    - Expr.Matrix: { type: 'm', value: [any] }
//!    - Expr.List: { type: 'l', items: [Expr] }
//!    - Expr.Call: { type: 'c', func: Expr, args: [Expr] }
//!        - prefer Expr.Ref for func with a valid function reference
//!    - Expr.FnDef: { type: 'f', params: [string], body: Defs }
//!
//! ## Additional fields on all objects
//! - parent: object or nullish

export function createContext () {
    const mutationListeners = [];
    return {
        onMutation: listener => mutationListeners.push(listener),
        notifyMutation: node => {
            for (const listener of mutationListeners) {
                try {
                    listener(node);
                } catch (err) {
                    console.error(err);
                }
            }
        },
    };
}

export function makeRef (name, ctx) {
    return { ctx, type: 'r', name };
}

/// Converts raw defs to editor defs.
export function fromRawDefs (defs, ctx) {
    // mapping from definition names to ids
    const defMapping = new Map();

    // cache mapping _defs to objects
    const subexprCache = new Map();
    // locks to prevent infinite recursion when resolving _defs
    const subexprLocks = new Set();
    // _defs that needed to be turned into actual user-visible defs
    const elevatedSubExprs = new Map();

    // resolves references in expressions
    // this is evaluated lazily because we would need to toposort _def declarations otherwise
    const resolveExpr = (name, forceRef) => {
        if (!name.startsWith('_')) {
            // this is a regular old reference
            return makeRef(name, ctx);
        }

        if (subexprCache.has(name)) return { ...subexprCache.get(name) };

        if (subexprLocks.has(name) || !defs[name] || forceRef) {
            // EITHER a)
            // cycle!! oh no
            // simply turn this into a real definition to solve this dependency cycle
            // OR b)
            // broken reference!! oh no
            // simply turn this into a reference and let the user deal with it
            // we can arbitrarily rename it not to contain underscores because it doesn’t exist
            // anyway
            // OR c)
            // we need this thing to be a reference instead of an expression
            //
            // (this code currently works for all cases but does not have the same semantics
            // in each case, so watch out when refactoring!)
            let resolvedName = '';

            // FIXME: we need to check the parent scope for collisions too

            let realName = name.replace(/^_+/, ''); // name without leading underscore(s)
            if (!realName) realName = 'a';
            for (let i = 0; i < 10; i++) {
                // try adding ' until it's not taken
                const tryName = realName + '\''.repeat(i);
                if (!defMapping.has(tryName)) {
                    resolvedName = tryName;
                    break;
                }
            }
            while (!resolvedName) {
                // when all that has failed, just pick something random
                resolvedName = 'a' + Math.random().toString();
                if (defMapping.has(resolvedName)) resolvedName = '';
            }

            // we only return the resolved ref object here; inserting into defMapping
            // is handled below by the lock owner
            elevatedSubExprs.set(name, resolvedName);
            const ref = makeRef(resolvedName, ctx);
            subexprCache.set(name, ref);
            return ref;
        }
        subexprLocks.add(name);

        const expr = fromRawExpr(defs[name], resolveExpr, ctx);

        subexprLocks.delete(name);
        if (elevatedSubExprs.has(name)) {
            // this expr needs to be turned into a real definition due to a dependency cycle
            const newName = elevatedSubExprs.get(name);
            defMapping.set(newName, expr);
            // return a ref instead
            const ref = makeRef(newName, ctx);
            subexprCache.set(name, ref);
            return ref;
        }

        subexprCache.set(name, expr);
        return expr;
    };

    for (const name in defs) {
        if (name.startsWith('_')) continue; // skip definitions that arent real
        defMapping.set(name, fromRawExpr(defs[name], resolveExpr, ctx));
    }

    const output = { ctx, type: 'd', defs: new Set(), floatingExpr: new Set() };
    for (const [k, v] of defMapping) {
        const def = { ctx, type: 'ds', name: k, expr: v, parent: output };
        v.parent = def;
        output.defs.add(def);
    }
    return output;
}

function fromRawExpr (expr, resolveExpr, ctx) {
    if (expr.t === 'u') {
        return { ctx, type: 'u' };
    } else if (expr.t === 'b') {
        return { ctx, type: 'b', value: expr.v };
    } else if (expr.t === 'n') {
        return { ctx, type: 'n', value: expr.v };
    } else if (expr.t === 's') {
        return { ctx, type: 's', value: expr.v };
    } else if (expr.t === 'm') {
        return { ctx, type: 'm', value: expr.v };
    } else if (expr.t === 'l') {
        const list = { ctx, type: 'l', items: expr.v.map(x => resolveExpr(x)) };
        for (const item of list.items) item.parent = list;
        return list;
    } else if (expr.t === 'c') {
        if (!expr.a || !expr.a.length) {
            // no arguments--this is simply a reference
            return resolveExpr(expr.f);
        }

        const call = {
            ctx,
            type: 'c',
            func: resolveExpr(expr.f, true),
            args: expr.a.map(x => resolveExpr(x)),
        };
        call.func.parent = call;
        for (const arg of call.args) arg.parent = call;
        return call;
    } else if (expr.t === 'f') {
        const defs = fromRawDefs(expr.b, ctx);
        const func = { ctx, type: 'f', params: expr.p, body: defs };
        func.body.parent = func;
        return func;
    } else if (expr.t === 'w') {
        return {
            ctx,
            type: 'w',
            matches: expr.m.map(match => {
                const cond = match.c ? resolveExpr(match.c) : null;
                const value = resolveExpr(match.v);
                return { cond, value };
            }),
        };
    } else {
        throw new Error(`unknown expression type ${expr.t}`);
    }
}

export function toRawDefs (defs) {
    let idCounter = 0;
    // Returns a new _def identifier
    const getIdent = () => {
        return `_${idCounter++}`;
    };

    const output = {};

    // creates an auxiliary definition and returns its name
    const makeAux = (def) => {
        const id = getIdent();
        output[id] = def;
        return id;
    };

    for (const def of defs.defs) {
        output[def.name] = toRawExpr(def.expr, makeAux);
    }

    return output;
}

/// Tries to turn an expr into a string if it’s a ref, and creates an auxiliary definition
/// otherwise.
function stringifyRef (expr, makeAux) {
    if (!expr) return makeAux({ t: 'u' });
    if (expr.type === 'r') return expr.name;
    else return makeAux(toRawExpr(expr, makeAux));
}

function toRawExpr (expr, makeAux) {
    if (!expr) return { t: 'u' };
    if (expr.type === 'r') {
        return { t: 'c', f: expr.name };
    } else if (expr.type === 'u') {
        return { t: 'u' };
    } else if (expr.type === 'b') {
        return { t: 'b', v: expr.value };
    } else if (expr.type === 'n') {
        return { t: 'n', v: expr.value };
    } else if (expr.type === 's') {
        return { t: 's', v: expr.value };
    } else if (expr.type === 'm') {
        return { t: 'm', v: expr.value };
    } else if (expr.type === 'l') {
        return { t: 'l', v: expr.items.map(e => stringifyRef(e, makeAux)) };
    } else if (expr.type === 'c') {
        const args = [...expr.args];
        // drop any trailing null refs
        for (let i = args.length - 1; i >= 0; i--) {
            if (!args[i]) args.pop();
            else break;
        }

        return {
            t: 'c',
            f: stringifyRef(expr.func, makeAux),
            a: args.map(e => stringifyRef(e, makeAux)),
        };
    } else if (expr.type === 'f') {
        return {
            t: 'f',
            p: expr.params,
            b: toRawDefs(expr.body),
        };
    } else if (expr.type === 'w') {
        return {
            t: 'w',
            m: expr.matches.map(({ cond, value }) => {
                const c = cond ? stringifyRef(cond, makeAux) : null;
                const v = stringifyRef(value, makeAux);
                return { c, v };
            }),
        }
    } else throw new Error('invalid internal repr');
}

/// Removes a node from its parent.
export function remove (node) {
    const parent = node.parent;
    if (!parent) return;

    if (parent.type === 'd') {
        if (!parent.defs.has(node)) throw new Error('internal inconsistency: expected parent defs to contain self');
        parent.defs.delete(node);
    } else if (parent.type === 'ds') {
        if (parent.expr !== node) throw new Error('internal inconsistency: expected expr in parent def to be self');
        parent.expr = null;
    } else if (parent.type === 'l') {
        const index = parent.items.indexOf(node);
        if (index === -1) throw new Error('internal inconsistency: expected parent list to contain self');
        parent.items.splice(index, 1);
    } else if (parent.type === 'c') {
        if (parent.func === node) {
            parent.func = null;
        } else {
            const index = parent.args.indexOf(node);
            if (index === -1) throw new Error('internal inconsistency: expected parent call to contain self');
            parent.args[index] = null;
        }
    } else if (parent.type === 'f') {
        if (parent.expr !== node) throw new Error('internal inconsistency: expected body in parent func to be self');
        parent.body = null;
    }

    node.parent = null;
    node.ctx.notifyMutation(parent);
    node.ctx.notifyMutation(node);
}

export const stdlib = {
    math: [
        '+',
        '-',
        '*',
        '/',
        '^',
        'mod',
        'floor',
        'ceil',
        'round',
        'trunc',
        'sign',
        'abs',
    ],
    logic: [
        'if',
        '==',
        '!=',
        '>',
        '<',
        '>=',
        '<=',
        'and',
        'or',
        'not',
        'xor',
        'id',
    ],
    functor_stuff: [
        'cat',
        'map',
        'flat_map',
        'fold',
        'fold1',
        'filter',
        'index',
        'length',
        'contains',
        'sort',
        'sum',
        'min',
        'max',
        'avg',
        'med',
    ],
    date_time: [
        'date_sub',
        'date_add',
        'date_today',
        'date_fmt',
        'time_now',
        'datetime_fmt',
    ],
    misc: [
        'currency_fmt',
        'country_fmt',
        'phone_fmt',
    ],
};

function makeStdRefs () {
    const refs = new Map();
    for (const category in stdlib) {
        const items = stdlib[category];
        for (const name of items) {
            const nameOverride = config.stdlibNames[name] || null;
            const args = config.stdlibArgs[name] || [];

            refs.set(name, {
                type: 'ds',
                isStdlib: true,
                nameOverride,
                expr: {
                    type: 'f',
                    params: args,
                    body: {},
                    slots: config.stdlibSlots[name],
                },
            });
        }
    }
    return refs;
}

/// Resolves refs in defs.
export function resolveRefs (defs, parentScope) {
    if (!parentScope) {
        parentScope = makeStdRefs();
    }
    const defIndex = new Map(parentScope);

    for (const def of defs.defs) {
        defIndex.set(def.name, def);
    }

    const reverseRefs = new Map();

    for (const def of defs.defs) {
        const refs = new Set();
        resolveRefsInExpr(def.expr, defIndex, refs);

        def.references = refs;
        def.referencedBy = new Set();

        for (const ref of refs) {
            const { target, expr } = ref;
            if (!reverseRefs.has(target)) reverseRefs.set(target, new Set());
            reverseRefs.get(target).add({ def, source: expr });
        }
    }

    for (const expr of defs.floatingExpr) {
        const refs = new Set();
        resolveRefsInExpr(expr, defIndex, refs);

        expr.references = refs;

        for (const ref of refs) {
            const { target, expr } = ref;
            if (!reverseRefs.has(target)) reverseRefs.set(target, new Set());
            reverseRefs.get(target).add({ def: null, source: expr });
        }
    }

    for (const [def, refs] of reverseRefs) {
        def.referencedBy = refs;
    }
}

function resolveRefsInExpr (expr, defs, refs, _srcOverride = null) {
    if (!expr) return;
    if (expr.type === 'r') {
        // this is a ref!
        expr.refNode = defs.get(expr.name);
        if (expr.refNode) refs.add({ target: expr.refNode, expr: _srcOverride || expr });
    } else if (expr.type === 'l') {
        for (const item of expr.items) {
            resolveRefsInExpr(item, defs, refs);
        }
    } else if (expr.type === 'c') {
        resolveRefsInExpr(expr.func, defs, refs, expr);
        for (const arg of expr.args) {
            resolveRefsInExpr(arg, defs, refs);
        }
    } else if (expr.type === 'f') {
        const bodyScope = new Map(defs);
        for (const param of expr.params) bodyScope.set(param, { t: 'fp', name: param });
        resolveRefs(expr.body, bodyScope);
    }
}

export function evalExpr (expr) {
    if (!expr.parent) return;
    let def = expr;
    while (def) {
        if (def.type === 'ds') {
            break;
        }
        def = def.parent;
    }

    if (!def) return; // no def?

    const defs = def.parent;
    const rawDefs = toRawDefs(defs);

    const rawExpr = toRawExpr(expr, def => {
        const rid = Symbol();
        rawDefs[rid] = def;
        return rid;
    });
    const out = Symbol();
    rawDefs[out] = rawExpr;

    let invocations = 0;

    let result = undefined;
    try {
        result = evaluate(rawDefs, out, () => {
            throw new Error('unsupported request for form value');
        }, {
            shouldHalt: () => {
                invocations++;
                if (invocations > config.maxEvalIterations) return true;
            },
        });
    } catch (err) {
        console.debug(err);
    }

    let analysis = null;
    try {
        analysis = analyze(rawDefs, out, {});
    } catch (err) {
        return null;
    }

    return {
        result,
        analysis,
    };
}

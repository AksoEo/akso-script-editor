import { evaluate, analyze, NULL, BOOL, NUMBER, STRING, TypeVar, array, Timestamp } from '@tejo/akso-script';
import { infixIdentRegexF } from './asct/shared';
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
//!    - Expr.Switch: { type: 'w', matches: [{ cond: Expr?, value: Expr }] }
//!
//! ## Additional fields on all objects
//! - parent: object or nullish

export function createContext () {
    const mutationListeners = [];
    const startMutListeners = [];
    const flushListeners = [];
    const extMutationListeners = [];
    const fvMutationListeners = [];
    const ctx = {
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
        externalDefs: [],
        externalRefs: new Set(), // all exprs that reference external defs
        _prevExternalRefs: new Set(),
        onExternalDefsMutation: listener => extMutationListeners.push(listener),
        notifyExternalDefsMutation: () => {
            ctx.startMutation();
            for (const ref of ctx.externalRefs) ctx.notifyMutation(ref.source);
            // we also need to notify anything that isn't an ext ref anymore
            for (const ref of ctx._prevExternalRefs) ctx.notifyMutation(ref.source);
            ctx._prevExternalRefs = ctx.externalRefs;
            ctx.flushMutation();
            for (const listener of extMutationListeners) {
                try {
                    listener();
                } catch (err) {
                    console.error(err);
                }
            }
        },
        formVars: [],
        formVarRefs: new Set(), // all exprs that reference form vars
        onFormVarsMutation: listener => fvMutationListeners.push(listener),
        notifyFormVarsMutation: () => {
            ctx.startMutation();
            for (const ref of ctx.formVarRefs) ctx.notifyMutation(ref.source);
            ctx.flushMutation();
            for (const listener of fvMutationListeners) {
                try {
                    listener();
                } catch (err) {
                    console.error(err);
                }
            }
        },
        onStartMutation: listener => startMutListeners.push(listener),
        onFlushMutation: listener => flushListeners.push(listener),
        startMutation: () => {
            for (const listener of startMutListeners) {
                try {
                    listener();
                } catch (err) {
                    console.error(err);
                }
            }
        },
        flushMutation: () => {
            for (const listener of flushListeners) {
                try {
                    listener();
                } catch (err) {
                    console.error(err);
                }
            }
        },
    };
    return ctx;
}

export function makeRef (name, ctx) {
    return { ctx, type: 'r', name };
}

function cloneExprObject (expr) {
    if (typeof expr !== 'object') return expr;
    if (expr.type === 'c') {
        return {
            type: 'c',
            func: cloneExprObject(expr.func),
            args: expr.args.map(cloneExprObject),
        };
    } else if (expr.type === 'f') {
        // FIXME: body needs to be cloned too
        return {
            type: 'f',
            params: [...expr.params],
            body: expr.body,
        };
    } else if (expr.type === 'w') {
        return {
            type: 'w',
            matches: expr.matches.map(match => {
                const m = {};
                if ('cond' in match) m.cond = cloneExprObject(match.cond);
                m.value = cloneExprObject(match.value);
            }),
        };
    } else if (expr.type === 'l') {
        return { type: 'l', value: expr.value.map(cloneExprObject) };
    } else if (expr.type === 'm') {
        const cloneMatrix = o => {
            if (Array.isArray(o)) return o.map(cloneMatrix);
            else return o;
        };
        return { type: 'm', value: cloneMatrix(expr.value) };
    } else return { ...expr };
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

        if (subexprCache.has(name)) return cloneExprObject(subexprCache.get(name));

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

export function fromRawExpr (expr, resolveExpr, ctx) {
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
        const sw = {
            ctx,
            type: 'w',
            matches: [],
        };
        for (const match of expr.m) {
            const cond = match.c ? resolveExpr(match.c) : null;
            const value = resolveExpr(match.v);
            if (cond) cond.parent = sw;
            value.parent = sw;
            sw.matches.push({ cond, value });
        }
        return sw;
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

export function toRawExpr (expr, makeAux) {
    if (!expr) return { t: 'u' };
    if (expr.type === 'r') {
        // we can't call directly in case it's a function, so we pass it through id
        return { t: 'c', f: 'id', a: [stringifyRef(expr, makeAux)] };
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
        };
    } else throw new Error('invalid internal repr');
}

/// Removes a node from its parent.
///
/// Returns an object that can undo the removal, assuming nothing else was mutated.
export function remove (node) {
    const parent = node.parent;
    if (!parent) return;

    let innerUndo;

    if (parent.type === 'd') {
        if (!parent.defs.has(node)) throw new Error('internal inconsistency: expected parent defs to contain self');
        parent.defs.delete(node);
        innerUndo = () => parent.defs.add(node);
    } else if (parent.type === 'ds') {
        if (parent.expr !== node) throw new Error('internal inconsistency: expected expr in parent def to be self');
        parent.expr = null;
        innerUndo = () => parent.expr = node;
    } else if (parent.type === 'l') {
        const index = parent.items.indexOf(node);
        if (index === -1) throw new Error('internal inconsistency: expected parent list to contain self');
        parent.items.splice(index, 1);
        innerUndo = () => parent.items.splice(index, 0, node);
    } else if (parent.type === 'c') {
        if (parent.func === node) {
            parent.func = null;
            innerUndo = () => parent.func = node;
        } else {
            const index = parent.args.indexOf(node);
            if (index === -1) throw new Error('internal inconsistency: expected parent call to contain self');
            parent.args[index] = null;
            innerUndo = () => parent.args[index] = node;
        }
    } else if (parent.type === 'f') {
        if (parent.expr !== node) throw new Error('internal inconsistency: expected body in parent func to be self');
        parent.body = null;
        innerUndo = () => parent.body = node;
    } else if (parent.type === 'w') {
        for (const m of parent.matches) {
            if (m.cond === node) {
                m.cond = null;
                innerUndo = () => m.cond = node;
            } else if (m.value === node) {
                m.value = null;
                innerUndo = () => m.value = node;
            }
        }
    }

    node.parent = null;
    node.ctx.startMutation();
    node.ctx.notifyMutation(parent);
    node.ctx.notifyMutation(node);
    node.ctx.flushMutation();

    return {
        undo: () => {
            innerUndo();
            node.parent = parent;
            node.ctx.startMutation();
            node.ctx.notifyMutation(parent);
            node.ctx.notifyMutation(node);
            node.ctx.flushMutation();
        },
    };
}

export function makeStdRefs () {
    const refs = new Map();
    for (const category in config.stdlibCategories) {
        const items = config.stdlibCategories[category];
        for (const name of items) {
            const nameOverride = config.stdlibNames[name] || null;
            const args = config.stdlibArgs[name] || [];

            const infix = name.match(infixIdentRegexF);

            refs.set(name, {
                type: 'ds',
                name,
                isStdlib: true,
                nameOverride,
                expr: {
                    type: 'f',
                    params: args,
                    body: {},
                    slots: config.stdlibSlots[name],
                    infix,
                },
            });
        }
    }
    return refs;
}

const FORM_VAR = Symbol('form var'); // form var ref sentinel value

/// Resolves refs in defs.
export function resolveRefs (defs, reducing = false, parentScope) {
    const ctx = defs.ctx;

    if (!parentScope) {
        // if there's no parent scope, we'll use the standard library
        parentScope = makeStdRefs();
    }

    // an index of def name -> def object
    const defIndex = new Map(parentScope);

    for (const def of defs.defs) {
        defIndex.set(def.name, def);
    }

    const reverseRefs = new Map();
    const externalDefs = new Set();

    for (const defs of ctx.externalDefs) {
        for (const def in defs) {
            if (typeof def !== 'string' || def.startsWith('_')) continue;
            const defObj = { ctx, isExternal: true };
            defIndex.set(def, defObj);
            externalDefs.add(defObj);
        }
    }

    for (const def of defs.defs) {
        const refs = new Set();
        resolveRefsInExpr(def.expr, reducing, defIndex, refs);

        def.references = refs;
        def.referencedBy = new Set();

        for (const ref of refs) {
            const { target, name, expr } = ref;
            if (!reverseRefs.has(target)) reverseRefs.set(target, new Set());
            reverseRefs.get(target).add({ def, source: expr, name });
        }
    }

    for (const expr of defs.floatingExpr) {
        const refs = new Set();
        resolveRefsInExpr(expr, reducing, defIndex, refs);

        expr.references = refs;

        for (const ref of refs) {
            const { target, name, expr } = ref;
            if (!reverseRefs.has(target)) reverseRefs.set(target, new Set());
            reverseRefs.get(target).add({ def: null, source: expr, name });
        }
    }

    // find all references to external defs
    ctx.externalRefs = new Set();
    for (const def of externalDefs) {
        const refs = reverseRefs.get(def);
        if (refs) for (const ref of refs) ctx.externalRefs.add(ref);
    }

    // single out refs to special FORM_VAR value
    ctx.formVarRefs = reverseRefs.get(FORM_VAR) || new Set();
    reverseRefs.delete(FORM_VAR);

    for (const [def, refs] of reverseRefs) {
        def.referencedBy = refs;
    }
}

/// Resolves refs in the given expression, recursively
function resolveRefsInExpr (expr, reducing, defs, refs, _srcOverride = null) {
    if (!expr) return;
    if (expr.type === 'r') {
        // this is a ref!
        if (expr.name.startsWith('@')) {
            // this is a form var ref
            // ONLY add a reverse ref
            refs.add({ target: FORM_VAR, name: expr.name, expr: _srcOverride || expr });
        } else {
            // this is a regular ref
            expr.refNode = defs.get(expr.name);
            if (expr.refNode) refs.add({ target: expr.refNode, expr: _srcOverride || expr });
        }
    } else if (expr.type === 'l') {
        for (const item of expr.items) {
            resolveRefsInExpr(item, reducing, defs, refs);
        }
    } else if (expr.type === 'c') {
        resolveRefsInExpr(expr.func, reducing, defs, refs, expr);
        for (const arg of expr.args) {
            resolveRefsInExpr(arg, reducing, defs, refs);
        }

        if (reducing && expr.func.refNode && expr.func.refNode.isStdlib && expr.func.refNode.name === 'id') {
            // identity function!
            if (expr.args.length === 1) {
                // if there's just one argument id doesn't actually do anything
                const inner = expr.args[0];
                expr.func = null;
                expr.args = null;
                const exprParent = expr.parent;
                Object.assign(expr, inner);
                expr.parent = exprParent;
            }
        }
    } else if (expr.type === 'f') {
        const bodyScope = new Map(defs);
        for (const param of expr.params) bodyScope.set(param, { t: 'fp', name: param });
        resolveRefs(expr.body, reducing, bodyScope);
    } else if (expr.type === 'w') {
        for (const m of expr.matches) {
            resolveRefsInExpr(m.cond, reducing, defs, refs);
            resolveRefsInExpr(m.value, reducing, defs, refs);
        }
    }
}

export function evalExpr (expr) {
    if (!expr || !expr.parent) return;
    let def = expr;
    while (def) {
        if (def.type === 'ds') {
            break;
        }
        if (def.parent === def) throw new Error('cycle');
        def = def.parent;
    }

    if (!def) return; // no def?

    const defs = def.parent;
    if (!defs) return; // no defs
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
        result = evaluate(expr.ctx.externalDefs.concat([rawDefs]), out, id => {
            for (const fv of expr.ctx.formVars) {
                if (fv.name === id) {
                    return fv.value;
                }
            }
            return null;
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
        analysis = analyze(expr.ctx.externalDefs.concat(rawDefs), out, id => {
            for (const fv of expr.ctx.formVars) {
                if (fv.name === id) {
                    if (fv.type === 'u') return NULL;
                    if (fv.type === 'b') return BOOL;
                    if (fv.type === 'n') return NUMBER;
                    if (fv.type === 's') return STRING;
                    if (fv.type === 'm') return array(new TypeVar());
                    if (fv.type === 'timestamp') return Timestamp;
                }
            }
        });
    } catch (err) {
        console.debug(err);
        return null;
    }

    return {
        result,
        analysis,
    };
}

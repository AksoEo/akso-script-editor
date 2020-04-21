import { Layer, TextLayer } from './layer';

/// A script object.
///
/// Holds both script data and UI state.
export class ScriptObject {
    /// Parent object. If null, is a tree root.
    parent = null;

    /// The layer representing this object graphically.
    layer = new Layer();

    /// Creates a new script object in the given context.
    constructor (ctx) {
        this.ctx = ctx;
    }

    /// Size in which this object should be laid out. This is determined by the parent.
    layoutSize = [0, 0];

    #cachedLayoutSize = [NaN, NaN];

    /// Performs layout on this script object if necessary.
    layout () {
        if (this.#cachedLayoutSize[0] !== this.layoutSize[0]
            || this.#cachedLayoutSize[1] !== this.layoutSize[1]) {
            this.layoutSelf();
            this.#cachedLayoutSize = [...this.layoutSize];
        }
    }

    /// The position of this script object. This should be set by the parent.
    ///
    /// By default, this is the position of this script object’s layer.
    get position () {
        return this.layer.position;
    }
    set position (value) {
        this.layer.position = value;
    }
    /// The size of this script object.
    /// This is determined upon layout.
    get size () {
        return this.layer.size;
    }

    /// Inner layout function. Should be overridden by subclasses.
    layoutSelf () {}

    #wantsLayout = false;
    get wantsLayout () {
        return this.#wantsLayout;
    }
    set wantsLayout (value) {
        if (value) {
            if (this.parent) this.parent.wantsLayout = true;
            else this.ctx.scheduleLayout(this);
        }
        this.#wantsLayout = value;
    }

    static fromDefs (ctx, defs) {
        // mapping from definition names to ids
        const defMapping = new Map();

        const subexprCache = new Map();
        const subexprLocks = new Set();
        const elevatedSubExprs = new Map();

        // resolves references in expressions
        // this is evaluated lazily because we would need to toposort _def declarations otherwise
        const resolveExpr = name => {
            if (!name.startsWith('_')) {
                // this is a regular old reference
                return new RefObject(ctx, name);
            }

            if (subexprCache.has(name)) subexprCache.get(name);

            if (subexprLocks.has(name) || !defs[name]) {
                // EITHER a)
                // cycle!! oh no
                // simply turn this into a real definition to solve this dependency cycle
                // OR b)
                // broken reference!! oh no
                // simply turn this into a reference and let the user deal with it
                // we can arbitrarily rename it not to contain underscores because it doesn’t exist
                // anyway
                //
                // (this code currently works for both cases but does not have the same semantics
                // in each case, so watch out when refactoring!)
                let resolvedName = '';

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
                const ref = new RefObject(ctx, resolvedName);
                subexprCache.set(name, ref);
                return ref;
            }
            subexprLocks.add(name);

            const expr = ScriptObject.fromExpr(ctx, defs[name], resolveExpr);

            subexprLocks.delete(name);
            if (elevatedSubExprs.has(name)) {
                // this expr needs to be turned into a real definition due to a dependency cycle
                const newName = elevatedSubExprs.get(name);
                const id = Symbol(`asce object “${newName}”`);
                defMapping.set(newName, id);
                ctx.pool.set(id, expr);
                // return a ref instead
                const ref = new RefObject(ctx, newName);
                subexprCache.set(name, ref);
                return ref;
            }

            subexprCache.set(name, expr);
            return expr;
        };

        for (const name in defs) {
            if (name.startsWith('_')) continue; // skip definitions that arent real
            const id = Symbol(`asce object “${name}”`);
            defMapping.set(name, id);

            const expr = defs[name];
            ctx.pool.set(id, ScriptObject.fromExpr(ctx, expr, resolveExpr));
        }

        const id = Symbol(`asce object root`);
        return new DefsObject(ctx, defMapping);
    }

    static fromExpr (ctx, expr, resolveExpr) {
        if (expr.t === 'u') {
            return new NullObject(ctx);
        } else if (expr.t === 'b') {
            return new BoolObject(ctx, expr.v);
        } else if (expr.t === 'n') {
            return new NumberObject(ctx, expr.v);
        } else if (expr.t === 's') {
            return new StringObject(ctx, expr.v);
        } else if (expr.t === 'm') {
            return new MatrixObject(ctx, expr.v);
        } else if (expr.t === 'l') {
            return new ListObject(ctx, expr.v.map(resolveExpr));
        } else if (expr.t === 'c') {
            const funcId = Symbol(`asce object func ref`);
            const func = resolveExpr(expr.f);
            ctx.pool.set(funcId, func);
            const args = (expr.a || []).map(resolveExpr).map(obj => {
                const objId = Symbol(`asce object func arg`);
                ctx.pool.set(objId, obj);
                return objId;
            });
            return new CallObject(ctx, funcId, args);
        } else if (expr.t === 'f') {
            const defs = ScriptObject.fromDefs(expr.b);
            const bodyId = Symbol(`asce object func root`);
            ctx.pool.set(bodyId, defs);
            return new FuncObject(ctx, expr.p, bodyId);
        } else {
            throw new Error(`unknown definition type ${expr.t}`);
        }
    }
}

class DefsObject extends ScriptObject {
    #items = new Map();
    itemOrder = [];

    constructor (ctx, defs) {
        super(ctx);
        this.defs = defs;

        this.layer.background = [0.9, 0.9, 0.9];
        this.layer.size = [100, 100];
        this.layer.cornerRadius = 4;

        this.wantsLayout = true;
    }

    layoutSelf () {
        for (const k of this.defs.keys()) {
            if (!this.itemOrder.includes(k)) this.itemOrder.push(k);
        }
        for (let i = 0; i < this.itemOrder.length; i++) {
            const k = this.itemOrder[i];
            if (!this.defs.has(k)) {
                this.itemOrder.splice(i, 1);
                this.#items.delete(k);
                i--;
            }
        }

        let width = 0;
        let height = 0;

        for (const k of this.itemOrder) {
            if (!this.#items.has(k)) {
                const itemId = Symbol(`asce object def item “${k}”`);
                const item = new DefsItem(this.ctx, k, this.defs.get(k));
                item.parent = this;
                this.ctx.pool.set(itemId, item);

                this.#items.set(k, itemId);
                item.layout();
                this.layer.addSublayer(item.layer);
            }

            const itemId = this.#items.get(k);
            const item = this.ctx.pool.get(itemId);
            const [defWidth, defHeight] = item.size;

            item.position = [8, 8 + height];

            width = Math.max(width, defWidth);
            height += defHeight + 8;
        }

        this.layer.size = [width + 16, height + 8];
    }
}
class DefsItem extends ScriptObject {
    constructor (ctx, name, expr) {
        super(ctx);
        this.name = name;
        this.expr = expr;

        ctx.pool.get(expr).parent = this;

        this.layer.background = [0.7, 0.7, 0.7];
        this.layer.cornerRadius = 4;

        this.nameLayer = new TextLayer();
        this.layer.addSublayer(this.nameLayer);

        this.eqLayer = new TextLayer();
        this.eqLayer.text = '=';
        this.layer.addSublayer(this.eqLayer);

        this.layer.addSublayer(ctx.pool.get(expr).layer);

        this.wantsLayout = true;
    }

    layoutSelf () {
        this.nameLayer.text = this.name;

        const [nameWidth, nameHeight] = this.nameLayer.getNaturalSize();
        const [eqWidth, eqHeight] = this.eqLayer.getNaturalSize();

        const expr = this.ctx.pool.get(this.expr);
        expr.layout();
        const [exprWidth, exprHeight] = expr.size;

        this.layer.size = [
            8 + nameWidth + 8 + eqWidth + 8 + exprWidth + 8,
            8 + Math.max(nameHeight, eqHeight, exprHeight) + 8,
        ];

        this.nameLayer.position = [8, this.layer.size[1] / 2];
        this.eqLayer.position = [8 + nameWidth + 8, this.layer.size[1] / 2];
        expr.position = [8 + nameWidth + 8 + eqWidth + 8, this.layer.size[1] / 2 - exprHeight / 2];
    }
}

class ExprObject extends ScriptObject {}

class NullObject extends ExprObject {
    constructor (ctx) {
        super(ctx);

        this.layer.background = [1, 0.7, 0];
        this.textLayer = new TextLayer();
        this.textLayer.text = 'null';
        this.layer.addSublayer(this.textLayer);
    }

    layoutSelf () {
        const [textWidth, textHeight] = this.textLayer.getNaturalSize();
        this.layer.size = [textWidth + 16, textHeight + 8];
        this.textLayer.position = [8, this.layer.size[1] / 2];
        this.layer.cornerRadius = this.layer.size[1] / 2;
    }
}
class BoolObject extends ExprObject {
    constructor (ctx, value) {
        super(ctx);
        this.value = !!value;

        this.layer.background = [1, 0.7, 0];
        this.textLayer = new TextLayer();
        this.layer.addSublayer(this.textLayer);
    }

    layoutSelf () {
        this.textLayer.text = this.value ? 'true' : 'false';

        const [textWidth, textHeight] = this.textLayer.getNaturalSize();
        this.layer.size = [textWidth + 16, textHeight + 8];
        this.textLayer.position = [8, this.layer.size[1] / 2];
        this.layer.cornerRadius = this.layer.size[1] / 2;
    }
}
class NumberObject extends ExprObject {
    constructor (ctx, value) {
        super(ctx);
        this.value = +value;
        if (!Number.isFinite(this.value)) this.value = 0;

        this.layer.background = [0.9, 0.8, 0];
        this.textLayer = new TextLayer();
        this.layer.addSublayer(this.textLayer);
    }

    layoutSelf () {
        this.textLayer.text = this.value.toString();

        const [textWidth, textHeight] = this.textLayer.getNaturalSize();
        this.layer.size = [textWidth + 16, textHeight + 8];
        this.textLayer.position = [8, this.layer.size[1] / 2];
        this.layer.cornerRadius = this.layer.size[1] / 2;
    }
}
class StringObject extends ExprObject {
    constructor (ctx, value) {
        super(ctx);
        this.value = '' + value;

        this.layer.background = [0.4, 0.7, 0.2];
        this.textLayer = new TextLayer();
        this.layer.addSublayer(this.textLayer);
    }

    layoutSelf () {
        this.textLayer.text = this.value;

        const [textWidth, textHeight] = this.textLayer.getNaturalSize();
        this.layer.size = [textWidth + 16, textHeight + 8];
        this.textLayer.position = [8, this.layer.size[1] / 2];
        this.layer.cornerRadius = this.layer.size[1] / 2;
    }
}
class MatrixObject extends ExprObject {
    constructor (ctx, value) {
        super(ctx);
        this.value = value;
        if (!Array.isArray(this.value)) this.value = [];
    }
}
class ListObject extends ExprObject {
    constructor (ctx, items) {
        super(ctx);
        this.items = items;
    }
}
class CallObject extends ExprObject {
    constructor (ctx, func, args) {
        super(ctx);
        this.func = func;
        this.args = args;

        this.layer.background = [0.5, 0.5, 0.5];

        this.layer.addSublayer(ctx.pool.get(this.func).layer);
        for (const arg of this.args) {
            this.layer.addSublayer(ctx.pool.get(arg).layer);
        }
    }

    layoutSelf () {
        const func = this.ctx.pool.get(this.func);
        func.layout();

        let width = func.size[0];
        let height = func.size[1];

        for (const argId of this.args) {
            const arg = this.ctx.pool.get(argId);
            arg.layout();
            height = Math.max(height, arg.size[1]);
        }

        height += 8; // padding

        func.position = [4, (height - func.size[1]) / 2];

        for (const argId of this.args) {
            const arg = this.ctx.pool.get(argId);

            width += 4;
            arg.position = [width, (height - arg.size[1]) / 2];
            width += arg.size[0];
        }

        width += 4;

        this.layer.size = [width, height];
        this.layer.cornerRadius = height / 2;
    }
}
class FuncObject extends ExprObject {
    constructor (ctx, params, body) {
        super(ctx);
        this.params = params;
        this.body = body;
    }
}
class RefObject extends ExprObject {
    constructor (ctx, name) {
        super(ctx);
        this.name = name;

        this.layer.background = [0.9, 0.9, 0.7];
        this.textLayer = new TextLayer();
        this.layer.addSublayer(this.textLayer);
    }

    layoutSelf () {
        this.textLayer.text = this.name;

        const [textWidth, textHeight] = this.textLayer.getNaturalSize();
        this.layer.size = [textWidth + 16, textHeight + 8];
        this.textLayer.position = [8, this.layer.size[1] / 2];
        this.layer.cornerRadius = this.layer.size[1] / 2;
    }
}

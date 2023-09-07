import { Def, Defs, Expr } from '../model';
import { infixIdentRegexF, bareIdentRegexF, OP_PREC } from './shared';

function indent (str: string) {
    return str.split('\n').map(x => x ? '    ' + x : x).join('\n');
}

const RESERVED_IDENTS = [
    'yes',
    'no',
    'true',
    'false',
    'switch',
    'where',
    'otherwise',
    '=',
    '->',
    '=>',
];

const ATOM_PREC = 0;
const HI_INFIX_PREC = 90;
const COMMA_PREC = 91;
const SWITCH_PREC = 92;
const HIGHEST_PREC = Infinity;

class Frag {
    str: string;
    prec: number;
    constructor (str: string, prec: number) {
        this.str = str;
        this.prec = prec;
    }
    nop () {
        return this.str;
    }
    p () {
        return '(' + this.str + ')';
    }
    embedp (p: number) {
        if (p < this.prec) return this.p();
        else return this.nop();
    }
}

function writeIdent (ident: string) {
    if (!ident.match(bareIdentRegexF) || RESERVED_IDENTS.includes(ident)) {
        let hashCount = 1;
        while (ident.includes('"' + '#'.repeat(hashCount))) hashCount++;
        const hashes = '#'.repeat(hashCount);

        return new Frag(`r${hashes}"${ident}"${hashes}`, ATOM_PREC);
    }
    return new Frag(ident, ATOM_PREC);
}

function writeMatrix (matrix: Expr.MatrixValue[]): Frag {
    const contents = matrix.map(item => {
        if (item === null) return writeExpr({ type: 'u', ctx: null, parent: null }).nop();
        if (typeof item === 'boolean') return writeExpr({ type: 'b', value: item, ctx: null, parent: null }).nop();
        if (typeof item === 'number') return writeExpr({ type: 'n', value: item, ctx: null, parent: null }).nop();
        if (typeof item === 'string') return writeExpr({ type: 's', value: item, ctx: null, parent: null }).nop();
        if (Array.isArray(item)) return writeMatrix(item).nop();
        throw new Error(`illegal matrix item of type ${typeof item}`);
    });
    const contentsLength = contents.map(item => item.length).reduce((a, b) => a + b, 0);
    const s = contentsLength > 80
        ? '[\n' + indent(contents.join(',\n')) + '\n]'
        : '[' + contents.join(', ') + ']';
    return new Frag(s, ATOM_PREC);
}

function writeList (expr: Expr.List) {
    const s = '[' + expr.items.map(writeExpr).map((x: Frag) => x.embedp(COMMA_PREC)).join(', ') + ']';
    return new Frag(s, ATOM_PREC);
}

function writeCall (expr: Expr.Call): Frag {
    if (expr.func.type !== 'r') {
        throw new Error('not supported: callee is not a ref');
    }

    const callee = (expr.func as Expr.Ref).name;
    if (callee.match(infixIdentRegexF) && expr.args.length === 2) {
        let prec = HI_INFIX_PREC;

        for (let i = 0; i < OP_PREC.length; i++) {
            const level = OP_PREC[OP_PREC.length - i - 1];
            if (level.includes(callee)) {
                prec = i;
                break;
            }
        }

        let s;

        if (callee === '-' && expr.args[0] && expr.args[0].type === 'n' && expr.args[0].value === 0) {
            // unary minus
            s = `-${writeExpr(expr.args[1]).embedp(ATOM_PREC)}`;
        } else {
            // infix call
            s = `${writeExpr(expr.args[0]).embedp(prec)} ${callee} ${writeExpr(expr.args[1]).embedp(prec)}`;
        }
        return new Frag(s, prec);
    } else {
        return new Frag(`${writeIdent(callee).nop()}(${expr.args.map(writeExpr).map((x: Frag) => x.embedp(COMMA_PREC)).join(', ')})`, ATOM_PREC);
    }
}

function writeClosure (expr: Expr.FnDef) {
    const { params, body } = expr;
    let returnDef: Def | null = null;
    const bodyDefs = new Set<Def>();
    for (const def of body.defs) {
        if (def.name === '=' && !returnDef) returnDef = def;
        else bodyDefs.add(def);
    }

    let out = '';
    if (params.length === 1) {
        out += writeIdent(params[0]).embedp(ATOM_PREC);
    } else {
        out += `(${params.map(writeIdent).map((x: Frag) => x.embedp(COMMA_PREC)).join(', ')})`;
    }
    out += ' -> ';

    if (returnDef) {
        out += writeExpr(returnDef.expr).embedp(HIGHEST_PREC);
    } else {
        out += 'null';
    }

    if (bodyDefs.size) {
        out += '\n' + indent('where\n' + indent(writeDefs({
            type: 'd',
            defs: bodyDefs,
            ctx: null,
            parent: null,
            floatingExpr: new Set(),
        }).nop()) + '\n');
    }

    return new Frag(out, HIGHEST_PREC);
}

function writeSwitch (expr: Expr.Switch) {
    const out = [];
    for (const { cond, value } of expr.matches) {
        let line = '';
        line += cond ? writeExpr(cond).embedp(COMMA_PREC) + ' => ' : 'otherwise ';
        line += writeExpr(value).embedp(SWITCH_PREC);
        out.push(line);
        if (!cond) break;
    }
    return new Frag(`switch\n${indent(out.join('\n') + '\n')}`, SWITCH_PREC);
}

function writeExpr (expr?: Expr.Any): Frag {
    if (!expr || expr.type === 'u') return new Frag('null', ATOM_PREC);
    if (expr.type === 'b') return new Frag(expr.value ? 'yes' : 'no', ATOM_PREC);
    if (expr.type === 'n') return new Frag(expr.value.toString(), ATOM_PREC);
    if (expr.type === 's') return new Frag('"' + expr.value.replace(/[\\]/g, '\\\\') + '"', ATOM_PREC);
    if (expr.type === 'm') return writeMatrix(expr.value);
    if (expr.type === 'l') return writeList(expr);
    if (expr.type === 'r') return writeIdent(expr.name);
    if (expr.type === 'c') return writeCall(expr);
    if (expr.type === 'f') return writeClosure(expr);
    if (expr.type === 'w') return writeSwitch(expr);
    throw new Error(`unknown expr type ${(expr as any).type}`);
}

function writeDef (def: Def) {
    let out = writeIdent(def.name).nop();
    out += ' = ';
    out += writeExpr(def.expr).embedp(HIGHEST_PREC);
    return new Frag(out, HIGHEST_PREC);
}

function writeDefs (defs: Defs) {
    const out = [];
    for (const def of defs.defs) out.push(writeDef(def).embedp(HIGHEST_PREC));
    return new Frag(out.join('\n'), HIGHEST_PREC);
}

function writeObject (obj: Def | Defs | Expr.Any) {
    if (obj.type === 'd') return writeDefs(obj);
    if (obj.type === 'ds') return writeDef(obj);
    return writeExpr(obj);
}

export function write (obj: Def | Defs | Expr.Any) {
    return writeObject(obj).nop();
}

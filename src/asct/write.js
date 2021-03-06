import { infixIdentRegexF, bareIdentRegexF, OP_PREC } from './shared';

function indent (str) {
    return str.split('\n').map(x => '    ' + x).join('\n');
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
    constructor (str, prec) {
        this.str = str;
        this.prec = prec;
    }
    nop () {
        return this.str;
    }
    p () {
        return '(' + this.str + ')';
    }
    embedp (p) {
        if (p < this.prec) return this.p();
        else return this.nop();
    }
}

function writeIdent (ident) {
    if (!ident.match(bareIdentRegexF) || RESERVED_IDENTS.includes(ident)) {
        let hashes = 1;
        while (ident.includes('"' + '#'.repeat(hashes))) hashes++;
        hashes = '#'.repeat(hashes);

        return new Frag(`r${hashes}"${ident}"${hashes}`, ATOM_PREC);
    }
    return new Frag(ident, ATOM_PREC);
}

function writeMatrix (matrix) {
    const s = '[' + matrix.map(item => {
        if (item === null) return writeExpr({ type: 'u' }).nop();
        if (typeof item === 'boolean') return writeExpr({ type: 'b', value: item }).nop();
        if (typeof item === 'number') return writeExpr({ type: 'n', value: item }).nop();
        if (typeof item === 'string') return writeExpr({ type: 's', value: item }).nop();
        if (Array.isArray(item)) return writeMatrix(item).nop();
        throw new Error(`illegal matrix item of type ${typeof item}`);
    }).join(', ') + ']';
    return new Frag(s, ATOM_PREC);
}

function writeList (expr) {
    const s = '[' + expr.items.map(writeExpr).map(x => x.embedp(COMMA_PREC)).join(', ') + ']';
    return new Frag(s, ATOM_PREC);
}

function writeCall (expr) {
    const callee = expr.func.name;
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
        return new Frag(`${writeIdent(callee).nop()}(${expr.args.map(writeExpr).map(x => x.embedp(COMMA_PREC)).join(', ')})`, ATOM_PREC);
    }
}

function writeClosure (expr) {
    const { params, body } = expr;
    let returnDef;
    const bodyDefs = new Set();
    for (const def of body.defs) {
        if (def.name === '=' && !returnDef) returnDef = def;
        else bodyDefs.add(def);
    }

    let out = '';
    if (params.length === 1) {
        out += writeIdent(params[0]).embedp(ATOM_PREC);
    } else {
        out += `(${params.map(writeIdent).map(x => x.embedp(COMMA_PREC)).join(', ')})`;
    }
    out += ' -> ';

    if (returnDef) {
        out += writeExpr(returnDef.expr).embedp(HIGHEST_PREC);
    } else {
        out += 'null';
    }

    if (bodyDefs.size) {
        out += '\n' + indent('where\n' + indent(writeDefs({ type: 'd', defs: bodyDefs }).nop()) + '\n');
    }

    return new Frag(out, HIGHEST_PREC);
}

function writeSwitch (expr) {
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

function writeExpr (expr) {
    if (!expr || expr.type === 'u') return new Frag('null', ATOM_PREC);
    if (expr.type === 'b') return new Frag(expr.value ? 'yes' : 'no', ATOM_PREC);
    if (expr.type === 'n') return new Frag(expr.value.toString(), ATOM_PREC);
    if (expr.type === 's') return new Frag(JSON.stringify(expr.value), ATOM_PREC);
    if (expr.type === 'm') return writeMatrix(expr.value);
    if (expr.type === 'l') return writeList(expr);
    if (expr.type === 'r') return writeIdent(expr.name);
    if (expr.type === 'c') return writeCall(expr);
    if (expr.type === 'f') return writeClosure(expr);
    if (expr.type === 'w') return writeSwitch(expr);
    throw new Error(`unknown expr type ${expr.type}`);
}

function writeDef (def) {
    let out = writeIdent(def.name).nop();
    out += ' = ';
    out += writeExpr(def.expr).embedp(HIGHEST_PREC);
    return new Frag(out, HIGHEST_PREC);
}

function writeDefs (defs) {
    const out = [];
    for (const def of defs.defs) out.push(writeDef(def).embedp(HIGHEST_PREC));
    return new Frag(out.join('\n'), HIGHEST_PREC);
}

function writeObject (obj) {
    if (obj.type === 'd') return writeDefs(obj);
    if (obj.type === 'ds') return writeDef(obj);
    return writeExpr(obj);
}

export function write (obj) {
    return writeObject(obj).nop();
}

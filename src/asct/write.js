import { infixIdentRegexF, bareIdentRegexF } from './shared';

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

function writeIdent (ident) {
    if (!ident.match(bareIdentRegexF) || RESERVED_IDENTS.includes(ident)) {
        let hashes = 1;
        while (ident.includes('"' + '#'.repeat(hashes))) hashes++;
        hashes = '#'.repeat(hashes);

        return `r${hashes}"${ident}"${hashes}`;
    }
    return ident;
}

function writeMatrix (matrix) {
    return '[' + matrix.map(item => {
        if (typeof item === 'null') return writeExpr({ type: 'u' });
        if (typeof item === 'boolean') return writeExpr({ type: 'b', value: item });
        if (typeof item === 'number') return writeExpr({ type: 'n', value: item });
        if (typeof item === 'string') return writeExpr({ type: 's', value: item });
        if (Array.isArray(item)) return writeMatrix(item);
        throw new Error(`illegal matrix item of type ${typeof item}`);
    }).join(', ') + ']';
}

function writeList (expr) {
    return '[' + expr.items.map(writeExpr).join(', ') + ']';
}

function writeCall (expr) {
    const callee = expr.func.name;
    if (callee.match(infixIdentRegexF) && expr.args.length === 2) {
        if (callee === '-' && expr.args[0] && expr.args[0].type === 'n' && expr.args[0].value === 0) {
            // unary minus
            return `(-${writeExpr(expr.args[1])})`;
        }

        // infix call
        return `(${writeExpr(expr.args[0])} ${callee} ${writeExpr(expr.args[1])})`;
    } else {
        return `${writeIdent(callee)}(${expr.args.map(writeExpr).join(', ')})`;
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

    let out = `(${params.map(writeIdent).join(', ')}) -> `;

    if (returnDef) {
        out += writeExpr(returnDef.expr);
    } else {
        out += 'null';
    }

    if (bodyDefs.size) {
        out += '\n' + indent('where {\n'
            + indent(writeDefs({ type: 'd', defs: bodyDefs }))
            + '\n}');
    }

    return '(' + out + ')';
}

function writeSwitch (expr) {
    const out = [];
    for (const { cond, value } of expr.matches) {
        let line = '';
        line += cond ? writeExpr(cond) + ' => ' : 'otherwise ';
        line += writeExpr(value);
        out.push(line);
        if (!cond) break;
    }
    return `switch {\n${indent(out.join('\n'))}\n}`;
}

function writeExpr (expr) {
    if (expr.type === 'u') return 'null';
    if (expr.type === 'b') return expr.value ? 'yes' : 'no';
    if (expr.type === 'n') return expr.value.toString();
    if (expr.type === 's') return JSON.stringify(expr.value);
    if (expr.type === 'm') return writeMatrix(expr.value);
    if (expr.type === 'l') return writeList(expr);
    if (expr.type === 'r') return writeIdent(expr.name);
    if (expr.type === 'c') return writeCall(expr);
    if (expr.type === 'f') return writeClosure(expr);
    if (expr.type === 'w') return writeSwitch(expr);
    throw new Error(`unknown expr type ${expr.type}`);
}

function writeDef (def) {
    let out = writeIdent(def.name);
    out += ' = ';
    out += writeExpr(def.expr);
    return out;
}

function writeDefs (defs) {
    const out = [];
    for (const def of defs.defs) out.push(writeDef(def));
    return out.join('\n');
}

function writeObject (obj) {
    if (obj.type === 'd') return writeDefs(obj);
    if (obj.type === 'ds') return writeDef(obj);
    return writeExpr(obj);
}

export function write (obj) {
    return writeObject(obj);
}

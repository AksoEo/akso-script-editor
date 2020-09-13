import { View, Gesture, Transaction, TextLayer } from './ui';
import { ExprView } from './expr-view';
import { createContext } from './model';
import { getProtoView } from './proto-pool';
import { Dropdown } from './dropdown';
import config from './config';

/// Initializes the form vars tab in the library.
export function initFormVarsTab (lib, tab) {
    const addFormVar = new AddFormVar(() => {
        // add item before the add button
        const item = new FormVarItem(lib);
        {
            // put it where the add button is currently (for animation purposes)
            const t = new Transaction(0, 0);
            item.layer.position = addFormVar.position;
            item.layer.size = addFormVar.size;
            t.commit();
            item.layer.draw(); // fix graphical glitch by drawing immediately
        }

        tab.itemList.items.splice(tab.itemList.items.length - 2, 0, item);
        const t = new Transaction(1, 0.3);
        tab.itemList.needsLayout = true;
        t.commitAfterLayout(tab.itemList.ctx);
    });
    tab.itemList.items.push(addFormVar);
    tab.itemList.items.push(new BottomPaddingView());
}

// TODO: removing form vars, nicer layout

class FormVarItem extends View {
    constructor (lib) {
        super();
        this.lib = lib;
        this.needsLayout = true;
        this.layer.background = config.formVars.background;
        this.layer.cornerRadius = config.cornerRadius;

        this.modelCtx = createContext();

        this.var = {
            name: config.formVars.defaultName(Math.random().toString(36).substr(2)),
            type: 'u',
            value: null,

            // for the form var expr view
            ctx: this.modelCtx,
        };

        this.modelCtx.onMutation(this.onMutation);

        this.name = new ExprView({
            type: 'r',
            name: '@' + this.var.name,
            ctx: this.modelCtx,
        });
        this.name.isDef = true;
        this.name.onDefRename = this.onRename;
        this.name.dragController = this;
        this.addSubview(this.name);

        this.typeSelection = new Dropdown();
        this.typeSelection.expr = { value: this.var.type, ctx: this.modelCtx };
        this.typeSelection.spec = { variants: config.formVars.types };
        this.addSubview(this.typeSelection);

        this.exprView = new ExprView(this.var);
        this.addSubview(this.exprView);
    }
    didAttach (ctx) {
        super.didAttach(ctx);
        this.ctx.modelCtx.formVars.push(this.var);
    }
    willDetach () {
        super.willDetach();
        const idx = this.ctx.modelCtx.formVars.indexOf(this.var);
        if (idx !== -1) this.ctx.modelCtx.formVars.splice(idx, 1);
    }

    // fake dragcontroller interface for the left hand side
    // FIXME: can the drag detection stuff be removed?
    #dragStartPos = [0, 0];
    #createdDragRef = false;
    beginExprDrag (expr, x, y) {
        this.#dragStartPos = [x, y];
        this.#createdDragRef = false;
    }
    createDragRef (x, y) {
        const ref = { ctx: this.ctx.modelCtx, type: 'r', name: '@' + this.var.name };
        const refView = getProtoView(ref, ExprView);
        const transaction = new Transaction(1, 0);
        refView.dragController = this.lib.defs.dragController;
        const refPos = this.name.absolutePosition;
        const defsPos = this.lib.defs.absolutePosition;
        refView.position = [refPos[0] - defsPos[0], refPos[1] - defsPos[1]];
        this.lib.defs.addFloatingExpr(ref);
        this.lib.defs.dragController.beginExprDrag(ref, x, y);
        this.lib.defs.showTrash = false; // don't show trash on initial drag
        transaction.commit();
    }
    moveExprDrag (x, y) {
        if (this.#createdDragRef) {
            this.lib.defs.dragController.moveExprDrag(x, y);
        } else {
            const distance = Math.hypot(x - this.#dragStartPos[0], y - this.#dragStartPos[1]);
            if (distance > 6) {
                this.createDragRef(x, y);
                this.#createdDragRef = true;
            }
        }
    }
    endExprDrag () {
        if (this.#createdDragRef) {
            this.lib.defs.dragController.endExprDrag();
        }
    }

    onRename = name => {
        name = name.replace(/^@+/, ''); // strip leading @ signs
        // TODO: find duplicates
        // TODO: find references
        const t = new Transaction(1, 0.3);
        this.var.name = name;
        this.ctx.modelCtx.notifyFormVarsMutation();
        this.needsLayout = true;
        t.commitAfterLayout(this.ctx);
    };
    onMutation = () => {
        this.onTypeChange(this.typeSelection.expr.value);
        this.ctx.modelCtx.notifyFormVarsMutation();
        this.exprView.needsLayout = true;
    };

    onTypeChange (type) {
        if (type === this.var.type) return;
        let newValue = this.var.value;
        if (type === 'u') newValue = null;
        else if (type === 'b') newValue = !!newValue;
        else if (type === 'n') {
            newValue = parseFloat(newValue, 10);
            if (!Number.isFinite(newValue)) newValue = 0;
        } else if (type === 's') newValue = '' + newValue;
        else if (type === 'm') newValue = [];

        this.var.type = type;
        this.var.value = newValue;
        this.needsLayout = true;
    };

    layout () {
        this.name.expr.name = '@' + this.var.name;
        this.name.layoutIfNeeded();
        this.typeSelection.layoutIfNeeded();
        this.exprView.layoutIfNeeded();

        let y = 8;
        this.name.position = [8, y];
        y += this.name.size[1] + 8;
        this.typeSelection.position = [8, y];
        y += this.typeSelection.size[1] + 8;
        this.exprView.position = [8, y];
        y += this.exprView.size[1] + 8;

        this.layer.size = [this.parentWidth || 0, y];
    }
}

class AddFormVar extends View {
    constructor (onAdd) {
        super();
        this.needsLayout = true;
        this.layer.cornerRadius = config.cornerRadius;
        this.layer.clipContents = true;
        this.icon = new TextLayer();
        this.icon.text = '+';
        this.icon.font = config.identFont;
        this.icon.color = config.formVars.add.color;
        this.label = new TextLayer();
        this.label.text = config.formVars.add.label;
        this.label.font = config.identFont;
        this.addSublayer(this.icon);
        this.addSublayer(this.label);

        Gesture.onTap(this, onAdd, this.onTapStart, this.onTapEnd);
    }
    layout () {
        this.layer.size = [this.parentWidth || 0, 32];
        this.layer.background = this.active
            ? config.formVars.add.activeBackground
            : config.formVars.background;

        this.label.color = this.hovering ? config.formVars.add.color : config.formVars.add.noColor;
        const iconSize = this.icon.getNaturalSize();
        const labelSize = this.label.getNaturalSize();
        if (!this.hovering) {
            this.icon.position = [(this.layer.size[0] - iconSize[0]) / 2, this.layer.size[1] / 2];
            this.label.position = [(this.layer.size[0] + iconSize[0]) / 2 + 32, this.layer.size[1] / 2];
        } else {
            const w = iconSize[0] + 8 + labelSize[0];
            this.icon.position = [(this.layer.size[0] - w) / 2, this.layer.size[1] / 2];
            this.label.position = [(this.layer.size[0] + w) / 2 - labelSize[0], this.layer.size[1] / 2];
        }
    }
    onPointerEnter () {
        this.hovering = true;
        const t = new Transaction(1, 0.3);
        this.layout();
        t.commit();
    }
    onPointerExit () {
        this.hovering = false;
        const t = new Transaction(1, 0.3);
        this.layout();
        t.commit();
    }
    onTapStart = () => {
        this.active = true;
        const t = new Transaction(1, 0.1);
        this.layout();
        t.commit();
    };
    onTapEnd = () => {
        this.active = false;
        const t = new Transaction(1, 0.3);
        this.layout();
        t.commit();
    };
}
class BottomPaddingView extends View {
    constructor () {
        super();
        this.needsLayout = true;
    }
    layout () {
        this.layer.size = [0, 48];
    }
}

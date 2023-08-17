import { View, Gesture, Transaction, Layer, TextLayer } from './ui';
import { ExprView } from './expr-view';
import { AscContext, createContext, Expr, FormVar } from './model';
import { getProtoView } from './proto-pool';
import { Dropdown } from './dropdown';
import config from './config';
import { Library, Tab } from './library';
import { Vec2 } from './spring';
import { IExprDragController } from './drag-controller';
import { ComponentView, DivView, h, Label, VNode } from './ui/component-view';

// TODO: what if there's a form var but no view for it?

/// Initializes the form vars tab in the library.
export function initFormVarsTab (lib: Library, tab: Tab) {
    const items = new WeakMap(); // name -> formVar
    const addFormVar = new AddFormVar(() => {
        // add item before the add button
        const item = new FormVarItem({ lib, var: createDefaultFormVar() });
        {
            // put it where the add button is currently (for animation purposes)
            const t = new Transaction(0, 0);
            item.layer.position = addFormVar.position;
            item.layer.size = addFormVar.size;
            t.commit();
            item.layer.draw(); // fix graphical glitch by drawing immediately
        }
        items.set(item.var, item);

        const newItems = tab.itemList.props.items.slice();
        newItems.splice(newItems.length - 2, 0, item);
        tab.itemList.update({ items: newItems });
        const t = new Transaction(1, 0.3);
        tab.itemList.needsLayout = true;
        tab.itemList.flushSubviews();
        t.commitAfterLayout(tab.itemList.ctx);
    });
    const bottomPadding = new BottomPaddingView();
    tab.itemList.update({ items: [addFormVar, bottomPadding] });

    return {
        update: () => {
            const newItems = [];
            for (const varItem of lib.ctx.modelCtx.formVars) {
                if (!items.has(varItem)) {
                    const item = new FormVarItem({ lib, var: varItem });
                    items.set(varItem, item);
                }
                newItems.push(items.get(varItem));
            }
            newItems.push(addFormVar, bottomPadding);
            tab.itemList.update({ items: newItems });
        },
    };
}

function createDefaultFormVar(): FormVar {
    return {
        name: config.formVars.defaultName(Math.random().toString(36).substr(2)),
        type: 'u',
        value: null,
        ctx: null,
        parent: null,
    };
}

class FormVarItem extends ComponentView<{
    lib: Library,
    var: FormVar,
}> implements IExprDragController {
    name: ExprView;
    modelCtx: AscContext;
    typeSelection: Dropdown;
    exprView: ExprView;
    wantsChildLayout = true;

    constructor(props) {
        super(props);

        this.layoutProps.layout = 'flex';
        this.layoutProps.direction = 'vertical';
        this.layoutProps.crossAlign = 'stretch';
        this.layoutProps.crossAlignSelf = 'stretch';
        this.layoutProps.gap = 8;
        this.layoutProps.padding = new Vec2(8, 4);

        this.layer.background = config.formVars.background;
        this.layer.cornerRadius = config.cornerRadius;

        this.modelCtx = createContext();
        this.modelCtx.onMutation(this.onMutation);
        this.var.ctx = this.modelCtx;

        this.name = new ExprView({
            type: 'r',
            name: '@' + this.var.name,
            ctx: this.modelCtx,
            parent: null,
        });
        this.name.isDef = true;
        this.name.onDefRename = this.onRename;
        this.name.dragController = this;

        this.typeSelection = new Dropdown(
            { value: this.var.type, ctx: this.modelCtx },
            { variants: config.formVars.types },
        );

        this.exprView = new ExprView(this.var as Expr.AnyRuntime);
    }

    get lib() {
        return this.props.lib;
    }

    get var() {
        return this.props.var;
    }

    update(props) {
        super.update(props);
        this.var.ctx = this.modelCtx;
    }

    onRename = (name: string) => {
        name = name.replace(/^@+/, ''); // strip leading @ signs
        const t = new Transaction(1, 0.3);
        const oldName = this.var.name;
        const replaceName = '@' + oldName;
        this.var.name = name;
        const newName = '@' + this.var.name;

        // find references to this form var and rename them
        const refSources = new Set();
        for (const ref of this.ctx.modelCtx.formVarRefs) {
            if (ref.name !== replaceName) continue;
            refSources.add(ref.source);
            if (ref.source.type === 'r') {
                ref.source.name = newName;
            } else if (ref.source.type === 'c') {
                (ref.source.func as Expr.Ref).name = newName;
            } else {
                console.warn(`Failed to rename to ${name} in ref with type ${ref.source.type}`);
            }
            ref.source.ctx.notifyMutation(ref.source);
        }

        (this.name.expr as Expr.Ref).name = newName;
        this.name.exprView.needsLayout = true;

        this.ctx.modelCtx.notifyFormVarsMutation();
        this.needsLayout = true;
        t.commitAfterLayout(this.ctx);
    };
    onRemove = () => {
        const t = new Transaction(1, 0.3);
        const idx = this.ctx.modelCtx.formVars.indexOf(this.var);
        this.ctx.modelCtx.formVars.splice(idx, 1);
        this.ctx.modelCtx.notifyFormVarsMutation();
        t.commitAfterLayout(this.ctx);
    };
    onMutation = () => {
        this.onTypeChange(this.typeSelection.expr.value);
        this.ctx.modelCtx.notifyFormVarsMutation();
        this.exprView.needsLayout = true;
    };

    onTypeChange (type: 'u' | 'b' | 'n' | 's' | 'm') {
        if (type === this.var.type) return;
        let newValue = this.var.value;
        if (type === 'u') newValue = null;
        else if (type === 'b') newValue = !!newValue;
        else if (type === 'n') {
            newValue = parseFloat(newValue as any);
            if (!Number.isFinite(newValue)) newValue = 0;
        } else if (type === 's') newValue = '' + newValue;
        else if (type === 'm') newValue = [];

        this.var.type = type;
        this.var.value = newValue;
        this.exprView.updateImpl();
        this.needsLayout = true;
    }

    renderContents(): VNode<any> | VNode<any>[] {
        return [
            h(DivView, {
                subviews: [
                    h(RemoveFormVar, { onRemove: this.onRemove }),
                    h(DivView, {
                        subviews: [this.name],
                        clip: true,
                    }, {
                        layout: 'z-stack',
                        padding: new Vec2(2, 2),
                        flexGrow: 1,
                        flexShrink: 1,
                    }),
                    h(Label, { contents: '=' }),
                ],
            }, {
                layout: 'flex',
                gap: 8,
            }),
            h(DivView, {
                subviews: [
                    this.var.type !== 'timestamp' ? this.typeSelection : null,
                    this.exprView,
                ],
            }, {
                layout: 'flex',
                gap: 8,
            }),
        ];
    }

    // fake dragcontroller interface for the left hand side
    #dragStartPos = [0, 0];
    #createdDragRef = false;
    beginExprDrag (expr, x, y) {
        this.#dragStartPos = [x, y];
        this.#createdDragRef = false;
    }
    createDragRef (x, y) {
        const ref = {
            ctx: this.ctx.modelCtx,
            parent: null,
            type: 'r' as 'r',
            name: '@' + this.var.name,
        };
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
    cancelExprDrag() {
        if (this.#createdDragRef) {
            this.lib.defs.dragController.cancelExprDrag();
        }
    }

    didAttach (ctx) {
        super.didAttach(ctx);
        if (!this.ctx.modelCtx.formVars.includes(this.var)) {
            this.ctx.modelCtx.formVars.push(this.var);
        }
    }
}

class RemoveFormVar extends ComponentView<{ onRemove: () => void }> {
    bgLayer: Layer;
    minusLayer: Layer;
    hovering = false;
    active = false;

    constructor (props) {
        super(props);
        this.bgLayer = new Layer();
        this.addSublayer(this.bgLayer);
        this.minusLayer = new Layer();
        this.minusLayer.background = config.formVars.remove.color;
        this.addSublayer(this.minusLayer);
        this.needsLayout = true;

        Gesture.onTap(this, () => this.props.onRemove(), this.onTapStart, this.onTapEnd);
    }

    renderContents() {
        return [];
    }

    getIntrinsicSize(): Vec2 {
        return new Vec2(22, 22);
    }

    layout () {
        this.needsLayout = false;

        const size = this.size.x;
        const bgSize = this.hovering ? 24 : 20;

        this.bgLayer.background = this.active
            ? config.formVars.remove.activeBackground
            : config.formVars.remove.background;
        this.bgLayer.size = [bgSize, bgSize];
        this.bgLayer.position = [(size - bgSize) / 2, (size - bgSize) / 2];
        this.bgLayer.cornerRadius = bgSize / 2;

        this.minusLayer.size = [size * 0.6, 2];
        this.minusLayer.position = [(size - this.minusLayer.size[0]) / 2, (size - 1) / 2];

        return this.size;
    }

    onPointerEnter () {
        const t = new Transaction(1, 0.1);
        this.hovering = true;
        this.layout();
        t.commit();
    };
    onPointerExit () {
        const t = new Transaction(1, 0.4);
        this.hovering = false;
        this.layout();
        t.commit();
    }
    onTapStart = () => {
        const t = new Transaction(1, 0.1);
        this.active = true;
        this.layout();
        t.commit();
    };
    onTapEnd = () => {
        const t = new Transaction(1, 0.4);
        this.active = false;
        this.layout();
        t.commit();
    }
}

class AddFormVar extends View {
    icon: TextLayer;
    label: TextLayer;
    hovering = false;
    active = false;

    constructor (onAdd: () => void) {
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

        this.layoutProps.crossAlignSelf = 'stretch';

        Gesture.onTap(this, onAdd, this.onTapStart, this.onTapEnd);
    }

    getIntrinsicSize(): Vec2 {
        return new Vec2(32, 32);
    }

    layout () {
        this.needsLayout = false;
        this.layer.background = this.active
            ? config.formVars.add.activeBackground
            : config.formVars.background;

        this.label.color = this.hovering ? config.formVars.add.color : config.formVars.add.noColor;
        const iconSize = this.icon.getNaturalSize();
        const labelSize = this.label.getNaturalSize();
        if (!this.hovering) {
            this.icon.position = [(this.size.x - iconSize.x) / 2, this.layer.size.y / 2];
            this.label.position = [(this.size.x + iconSize.x) / 2 + 32, this.layer.size.y / 2];
        } else {
            const w = iconSize.x + 8 + labelSize.x;
            this.icon.position = [(this.layer.size.x - w) / 2, this.layer.size.y / 2];
            this.label.position = [(this.layer.size.x + w) / 2 - labelSize.x, this.layer.size.y / 2];
        }
        return this.size;
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
    getIntrinsicSize(): Vec2 {
        return new Vec2(0, 48);
    }
}

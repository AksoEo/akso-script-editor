import { View, PortalView, Layer, TextLayer, ArrowLayer, PathLayer, Transaction, Gesture } from './ui';
import { getProtoView } from './proto-pool';
import { evalExpr } from './model';
import { Dropdown } from './dropdown';
import { Tooltip } from './tooltip';
import { signature } from '@tejo/akso-script';
import config from './config';

/// Renders a slot for an expression, or UI if this field has a spec.
export class ExprSlot extends View {
    // currently contained expr
    #expr = null;
    // currently contained expr UI
    #exprUI = null;
    wantsChildLayout = true;
    // field spec
    spec = null;
    // model ctx
    exprCtx = null;

    constructor (onInsertExpr, exprCtx) {
        super();

        this.layer.cornerRadius = config.cornerRadius;
        this.onInsertExpr = onInsertExpr;
        this.exprCtx = exprCtx;
        this.needsLayout = true;
    }

    didUnmount () {
        super.didUnmount();
        this.dragController.unregisterTarget(this);
    }

    get expr () {
        return this.#expr;
    }
    set expr (value) {
        if (this.#expr === value) return;
        if (this.#expr) this.removeSubview(getProtoView(this.#expr, ExprView));
        this.#expr = value;
        this.needsLayout = true;
        if (this.#expr) this.addSubview(getProtoView(this.#expr, ExprView));
    }

    get exprUI () {
        return this.#exprUI;
    }
    set exprUI (value) {
        if (this.#exprUI === value) return;
        if (this.#exprUI) this.removeSubview(this.#exprUI);
        this.#exprUI = value;
        if (this.#exprUI) this.addSubview(this.#exprUI);
    }

    get isEmpty () {
        return this.exprUI || !this.expr;
    }

    insertExpr (expr) {
        this.tentativeChild = null;
        this.onInsertExpr(expr);
    }

    beginTentative (view) {
        this.tentativeChild = view;
        this.needsLayout = true;
    }
    endTentative () {
        this.tentativeChild = null;
        this.needsLayout = true;
    }

    layout () {
        super.layout();

        if (this.dragController) this.dragController.registerTarget(this);

        let exprSize = [56, 24];

        let useUIExpr = false;
        let exprUI = null;

        if (this.spec) {
            if (this.spec.type === 'enum') {
                const variants = Object.keys(this.spec.variants);

                if (!this.expr) {
                    this.onInsertExpr({
                        ctx: this.exprCtx,
                        type: 's',
                        value: variants[0],
                    });
                    this.needsLayout = true;
                }

                if (this.expr && this.expr.type === 's' && variants.includes(this.expr.value)) {
                    useUIExpr = true;
                    exprUI = Dropdown;
                }
            } else if (this.spec.type === 'switchcond') {
                if (!this.expr) {
                    useUIExpr = true;
                    exprUI = SwitchCondNone;
                }
            }
        }

        if (useUIExpr) {
            if (!this.exprUI || this.exprUI.constructor !== exprUI) {
                if (this.exprUI && this.exprUI.drop) this.exprUI.drop();
                this.exprUI = new exprUI(this.expr, this.spec);
            }
            this.exprUI.hasTentativeChild = this.tentativeChild;
            this.exprUI.layoutIfNeeded();
            exprSize = this.exprUI.size;
        } else if (this.expr) {
            if (this.exprUI) {
                if (this.exprUI.drop) this.exprUI.drop();
                this.exprUI = null;
            }
            const exprView = getProtoView(this.expr, ExprView);
            exprView.position = [0, 0];
            exprView.dragController = this.dragController;
            exprView.layoutIfNeeded();
            exprSize = exprView.size;
        }

        if ((useUIExpr || !this.expr) && this.tentativeChild) {
            const exprView = this.tentativeChild;
            // do not make the slot smaller to prevent unstable behavior when dragging
            exprSize[0] = Math.max(exprSize[0], exprView.size[0]);
            exprSize[1] = Math.max(exprSize[1], exprView.size[1]);
        }

        if (this.tentativeChild) {
            this.layer.stroke = config.exprSlot.hoverStroke;
            this.layer.strokeWidth = config.exprSlot.hoverWeight;
            this.layer.background = config.exprSlot.hoverBackground;
        } else {
            this.layer.strokeWidth = config.exprSlot.weight;
            this.layer.stroke = (!useUIExpr && this.expr) ? config.exprSlot.stroke : config.exprSlot.emptyStroke;
            this.layer.background = config.exprSlot.background;
        }
        this.layer.size = exprSize;
    }
}

/// Renders a runtime value.
class PeekView extends View {
    #value = null;
    analysis = { valid: false, type: null };

    constructor () {
        super();

        this.tooltip = new Tooltip();
        this.addSubview(this.tooltip);

        this.innerExpr = new ExprView({ type: 'u' });
        this.innerExpr.noInteraction = true;
        this.tooltip.contents = this.innerExpr;
    }

    get decorationOnly () {
        return true;
    }

    get value () {
        return this.#value;
    }
    set value (value) {
        if (value === this.#value) return;
        this.#value = value;
        this.needsLayout = true;
    }
    get visible () {
        return this.tooltip.visible;
    }
    set visible (value) {
        this.tooltip.visible = value;
        this.needsLayout = true;
    }

    layout () {
        const { value, innerExpr: ie } = this;
        if (value === null) ie.expr = { type: 'u' };
        else if (typeof value === 'boolean') ie.expr = { type: 'b', value };
        else if (typeof value === 'number') ie.expr = { type: 'n', value };
        else if (typeof value === 'string') ie.expr = { type: 's', value };
        else if (Array.isArray(value)) ie.expr = { type: 'm', value };
        else if (typeof value === 'function') ie.expr = { type: 's', value: '(todo: func expr)' };
        else ie.expr = { type: 's', value: `don’t know the type ${typeof value}` };

        this.tooltip.size = this.size;

        this.innerExpr.layout();
        this.tooltip.layoutIfNeeded();
    }
}

/// Renders a single expression.
export class ExprView extends View {
    wantsChildLayout = true;

    constructor (expr) {
        super();
        this.expr = expr;
        this.updateImpl();

        Gesture.onTap(this, () => {
            if (this.impl$tapAction) this.impl$tapAction();
        });
        Gesture.onDrag(this, this.onDragMove, this.onDragStart, this.onDragEnd, this.onDragCancel);
    }

    updateImpl () {
        const impl = getImplForExpr(this.expr);
        if (!impl) throw new Error(`no implementation for this expr type: ${this.expr.type}`);

        if (this.implProto === impl) return; // it's the same, no need to reinit

        // use deinitializers of possible previous impl if available
        if (this.impl$deinit) this.impl$deinit();

        this.implProto = impl;
        this.implType = this.expr.type;
        for (const k in impl) {
            this[`impl$${k}`] = impl[k];
        }
        if (this.impl$init) this.impl$init();
        this.needsLayout = true;
    }

    layout () {
        super.layout();
        this.updateImpl();
        this.impl$layout();
    }

    #dragStartPos = [0, 0];
    #dragging = false;
    onDragStart = ({ absX, absY }) => {
        if (this.noInteraction) return;
        this.#dragStartPos = [absX, absY];
        this.decorationOnly = true;
        this.dragController.beginExprDrag(this.expr, absX, absY);
        if (this.impl$onDragStart) this.impl$onDragStart();
        this.#dragging = true;
    };
    onDragMove = ({ absX, absY }) => {
        if (this.noInteraction) return;
        this.dragController.moveExprDrag(absX, absY);
    };
    onDragEnd = () => {
        if (this.noInteraction) return;
        this.dragController.endExprDrag();
        this.decorationOnly = false;
    };
    onDragCancel = () => {
        if (this.noInteraction) return;
        this.dragController.cancelExprDrag();
        this.decorationOnly = false;
    };
    onPointerEnter (event) {
        if (this.noInteraction) return;
        if (this.impl$onPointerEnter) this.impl$onPointerEnter(event);
    }
    onPointerMove (event) {
        if (this.noInteraction) return;
        if (this.impl$onPointerMove) this.impl$onPointerMove(event);
    }
    onPointerExit (event) {
        if (this.noInteraction) return;
        if (this.impl$onPointerExit) this.impl$onPointerExit(event);
    }

    *iterSublayers () {
        if (this.impl$iterSublayers) yield* this.impl$iterSublayers();
    }
    *iterSubviews () {
        if (this.impl$iterSubviews) yield* this.impl$iterSubviews();
    }
}

function getImplForExpr (expr) {
    return EXPR_VIEW_IMPLS[expr.type];
}

const EXPR_VIEW_IMPLS = {
    r: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;

            this.iconLayer = new PathLayer();
            this.iconLayer.fill = config.primitives.iconColor;

            this.peekView = new PeekView();
        },
        deinit () {
            delete this.textLayer;
            delete this.iconLayer;
            delete this.peekView;
        },
        tapAction () {
            this.ctx.beginInput(
                this.layer.absolutePosition,
                this.size,
                this.expr.name,
                { font: config.identFont },
            ).then(name => {
                if (this.isDef) {
                    this.onDefRename(name);
                    this.needsLayout = true;
                } else {
                    this.expr.name = name;
                    this.expr.ctx.notifyMutation(this.expr);
                    new Transaction(1, 0.3).commitAfterLayout(this.ctx);
                }
            });
        },
        layout () {
            this.textLayer.text = this.expr.name;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            if (!this._isDemo && !this.isDef && !this.expr.name.startsWith('@') && !this.expr.refNode) {
                this.iconLayer.path = config.icons.refBroken;
                this.layer.background = config.primitives.refBroken;
                this.layer.stroke = config.primitives.refBrokenOutline;
            } else {
                this.iconLayer.path = config.icons.ref;
                this.layer.background = config.primitives.ref;
                this.layer.stroke = config.primitives.refOutline;
            }

            const iconSize = config.icons.size;
            this.iconLayer.position = [4, 4];

            const textSize = this.textLayer.getNaturalSize();

            if (this.isDef) {
                this.layer.size = [textSize[0] + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2];
                this.textLayer.position = [8, this.layer.size[1] / 2];
            } else {
                this.layer.size = [textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2];
                this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];
            }

            this.peekView.size = this.layer.size;
        },
        onPointerEnter () {
            const result = evalExpr(this.expr);
            if (!result) return;

            const t = new Transaction(1, 0.2);
            this.layer.strokeWidth = config.primitives.hoverOutlineWeight;
            this.layer.stroke = config.primitives.callHoverOutline;
            t.commit();

            this.peekView.value = result.result;
            this.peekView.analysis = result.analysis;
            this.peekView.visible = true;
        },
        onPointerExit () {
            this.peekView.visible = false;
            this.layout();
        },
        *iterSubviews () {
            yield this.peekView;
        },
        *iterSublayers () {
            yield this.textLayer;
            if (!this.isDef) yield this.iconLayer;
        },
    },
    u: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.null;
            this.layer.stroke = config.primitives.nullOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;

            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;
            this.textLayer.text = 'null';

            this.iconLayer = new PathLayer();
            this.iconLayer.path = config.icons.null;
            this.iconLayer.fill = config.primitives.iconColor;
        },
        deinit () {
            delete this.textLayer;
            delete this.iconLayer;
        },
        layout () {
            const iconSize = config.icons.size;
            this.iconLayer.position = [4, 4];

            const textSize = this.textLayer.getNaturalSize();
            this.layer.size = [textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2];
            this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];
        },
        *iterSublayers () {
            yield this.textLayer;
            yield this.iconLayer;
        },
    },
    b: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.bool;
            this.layer.stroke = config.primitives.boolOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;

            this.iconLayer = new PathLayer();
            this.iconLayer.path = config.icons.bool;
            this.iconLayer.fill = config.primitives.iconColor;
        },
        deinit () {
            delete this.textLayer;
            delete this.iconLayer;
        },
        tapAction () {
            const transaction = new Transaction(1, 0.3);
            this.expr.value = !this.expr.value;
            this.expr.ctx.notifyMutation(this.expr);
            transaction.commitAfterLayout(this.ctx);
        },
        layout () {
            this.textLayer.text = this.expr.value ? config.primitives.true : config.primitives.false;

            const iconSize = config.icons.size;
            this.iconLayer.position = [4, 4];

            const textSize = this.textLayer.getNaturalSize();
            this.layer.size = [textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2];
            this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];
        },
        *iterSublayers () {
            yield this.textLayer;
            yield this.iconLayer;
        },
    },
    n: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.number;
            this.layer.stroke = config.primitives.numberOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;

            this.iconLayer = new PathLayer();
            this.iconLayer.path = config.icons.number;
            this.iconLayer.fill = config.primitives.iconColor;
        },
        deinit () {
            delete this.textLayer;
            delete this.iconLayer;
        },
        tapAction () {
            this.ctx.beginInput(
                this.layer.absolutePosition,
                this.size,
                this.expr.value.toString(),
                { font: config.identFont },
            ).then(value => {
                this.expr.value = Number.parseFloat(value, 10);
                if (!Number.isFinite(this.expr.value)) {
                    this.expr.value = 0;
                }
                this.expr.ctx.notifyMutation(this.expr);
                new Transaction(1, 0.3).commitAfterLayout(this.ctx);
            });
        },
        layout () {
            this.textLayer.text = this.expr.value.toString();

            const iconSize = config.icons.size;
            this.iconLayer.position = [4, 4];

            const textSize = this.textLayer.getNaturalSize();
            this.layer.size = [textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2];
            this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];
        },
        *iterSublayers () {
            yield this.textLayer;
            yield this.iconLayer;
        },
    },
    s: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.string;
            this.layer.stroke = config.primitives.stringOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;

            this.iconLayer = new PathLayer();
            this.iconLayer.path = config.icons.string;
            this.iconLayer.fill = config.primitives.iconColor;
        },
        deinit () {
            delete this.textLayer;
            delete this.iconLayer;
        },
        tapAction () {
            this.ctx.beginInput(
                this.layer.absolutePosition,
                this.size,
                this.expr.value,
                { font: config.identFont },
            ).then(value => {
                this.expr.value = value;
                this.expr.ctx.notifyMutation(this.expr);
                new Transaction(1, 0.3).commitAfterLayout(this.ctx);
            });
        },
        layout () {
            this.textLayer.text = `“${this.expr.value}”`;

            const iconSize = config.icons.size;
            this.iconLayer.position = [4, 4];

            const textSize = this.textLayer.getNaturalSize();
            this.layer.size = [textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2];
            this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];
        },
        *iterSublayers () {
            yield this.textLayer;
            yield this.iconLayer;
        },
    },
    m: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.matrix;
            this.layer.stroke = config.primitives.matrixOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;

            this.iconLayer = new PathLayer();
            this.iconLayer.path = config.icons.matrix;
            this.iconLayer.fill = config.primitives.iconColor;
        },
        deinit () {
            delete this.textLayer;
            delete this.iconLayer;
        },
        tapAction () {
            // TODO: enter edit mode
        },
        layout () {
            // TODO: better display
            const stringify = value => {
                if (Array.isArray(value)) return '[' + value.map(stringify).join(', ') + ']';
                if (typeof value === 'function') return '(->)';
                return '' + value;
            };
            this.textLayer.text = stringify(this.expr.value);

            const iconSize = config.icons.size;
            this.iconLayer.position = [4, 4];

            const textSize = this.textLayer.getNaturalSize();
            this.layer.size = [textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2];
            this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];
        },
        *iterSublayers () {
            yield this.textLayer;
            yield this.iconLayer;
        },
    },
    l: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.list;
            this.layer.stroke = config.primitives.listOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;

            this.label = new TextLayer();
            this.label.font = config.labelFont;
            this.label.text = config.primitives.listLabel;
            this.label.baseline = 'top';
            this.label.color = config.primitives.color;

            this.slots = [];
        },
        deinit () {
            delete this.slots;
        },
        layout () {
            const itemCount = this.expr.items.length;

            while (this.slots.length > itemCount + 1) this.slots.pop();
            for (let i = this.slots.length; i < itemCount + 1; i++) {
                const index = i;
                this.slots.push(new ExprSlot(expr => {
                    this.expr.items[index] = expr;
                    expr.parent = this.expr;
                    this.ctx.startMutation();
                    this.ctx.notifyMutation(this);
                    this.ctx.notifyMutation(this.expr);
                    this.ctx.flushMutation();
                }, this.expr.ctx));
            }

            let width = config.primitives.paddingX;
            let height = 0;

            for (let i = 0; i < this.slots.length; i++) {
                const slot = this.slots[i];
                const expr = this.expr.items[i];
                slot.expr = expr;
                this.exprCtx = this.expr.ctx;
                slot.dragController = this.dragController;
                slot.layoutIfNeeded();
                height = Math.max(height, slot.size[1]);
            }
            height += config.primitives.paddingY * 2;

            const labelSize = this.label.getNaturalSize();
            const heightTop = config.primitives.paddingY + labelSize[1];

            this.label.position = [config.primitives.paddingX, config.primitives.paddingY];

            for (let i = 0; i < this.slots.length; i++) {
                const slot = this.slots[i];
                slot.position = [
                    width,
                    heightTop + (height - slot.size[1]) / 2,
                ];
                width += slot.size[0];
                width += config.primitives.paddingX;
            }

            const minWidth = labelSize[0] + config.primitives.paddingX * 2;
            if (width < minWidth) width = minWidth;

            this.layer.size = [width, height + heightTop];
        },
        *iterSublayers () {
            yield this.label;
        },
        *iterSubviews () {
            for (const slot of this.slots) yield slot;
        },
    },
    c: {
        init () {
            this.layer.background = config.primitives.call;
            this.layer.stroke = config.primitives.callOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.layer.cornerRadius = config.cornerRadius;

            this.nameLayer = new TextLayer();
            this.nameLayer.font = config.identFont;
            this.nameLayer.color = config.primitives.color;
            this.trueNameLayer = new TextLayer();
            this.trueNameLayer.font = config.callArgFont;
            this.trueNameLayer.color = config.primitives.trueNameColor;
            this.argSlots = [];
            this.argLabels = [];

            this.peekView = new PeekView();
        },
        deinit () {
            delete this.nameLayer;
            delete this.argSlots;
            delete this.argLabels;
            delete this.peekView;
        },
        layout () {
            const refNode = this.expr.func.refNode;
            let funcName = this.expr.func.name;
            let trueName = null;

            if (refNode && refNode.type === 'ds' && refNode.nameOverride) {
                if (refNode.nameOverride !== funcName) trueName = funcName;
                funcName = refNode.nameOverride;
            }

            this.nameLayer.text = funcName;
            this.trueNameLayer.text = trueName ? trueName : '';
            const displayNameSize = this.nameLayer.getNaturalSize();
            const trueNameSize = this.trueNameLayer.getNaturalSize();
            const nameSize = displayNameSize.slice();
            if (nameSize[0] < trueNameSize[0]) nameSize[0] = trueNameSize[0];

            let infix = false;
            let params, slots;
            if (refNode && refNode.type === 'ds' && refNode.expr.type === 'f') {
                params = refNode.expr.params;
                slots = refNode.expr.slots || [];
                infix = !!refNode.expr.infix;
                for (let i = params.length; i < this.expr.args.length; i++) {
                    params.push('');
                }
                for (let i = slots.length; i < this.expr.args.length; i++) {
                    slots.push(null);
                }
            } else {
                params = this.expr.args.map(() => '');
                slots = this.expr.args.map(() => null);
            }

            this.isInfix = infix;

            while (this.argSlots.length > params.length) {
                this.argSlots.pop();
                this.argLabels.pop();
            }
            for (let i = this.argSlots.length; i < params.length; i++) {
                const index = i;
                const slot = new ExprSlot(expr => {
                    this.expr.args[index] = expr;
                    expr.parent = this.expr;
                    expr.ctx.notifyMutation(this.expr);
                }, this.expr.ctx);
                const label = new TextLayer();
                label.font = config.callArgFont;
                label.baseline = 'top';
                label.align = 'center';
                label.color = config.primitives.color;

                this.argSlots.push(slot);
                this.argLabels.push(label);
            }

            let height = nameSize[1] + trueNameSize[1];

            for (let i = 0; i < this.argSlots.length; i++) {
                const arg = this.expr.args[i] || null;
                const slot = this.argSlots[i];
                const label = this.argLabels[i];

                label.text = params[i];

                slot.expr = arg;
                slot.exprCtx = this.expr.ctx;
                slot.spec = slots[i];
                slot.dragController = this.dragController;
                slot.layoutIfNeeded();

                height = Math.max(height, slot.size[1]);
            }

            height += config.primitives.paddingY * 2;

            let width = 0;
            if (!infix) {
                width += config.primitives.paddingX;
                this.nameLayer.position = [width, height / 2];
                this.trueNameLayer.position = [width + (nameSize[0] - trueNameSize[0]) / 2, height / 2 + nameSize[1] - 2];
                width += nameSize[0];
            }

            let labelHeight = 0;

            for (let i = 0; i < this.argSlots.length; i++) {
                const slot = this.argSlots[i];
                const label = this.argLabels[i];
                const labelSize = label.getNaturalSize();
                labelHeight = labelSize[1];

                width += config.primitives.paddingX;

                const itemWidth = infix ? slot.size[0] : Math.max(slot.size[0], labelSize[0]);

                slot.position = [width + (itemWidth - slot.size[0]) / 2, (height - slot.size[1]) / 2];
                label.position = [width + itemWidth / 2, height];

                width += itemWidth;

                if (infix && i === 0) {
                    width += config.primitives.paddingX;
                    this.nameLayer.position = [width + (nameSize[0] - displayNameSize[0]) / 2, height / 2];
                    this.trueNameLayer.position = [width + (nameSize[0] - trueNameSize[0]) / 2, height / 2 + nameSize[1] - 2];
                    width += nameSize[0];
                }
            }

            if (!infix) {
                height += labelHeight + config.primitives.paddingY;
            }
            width += config.primitives.paddingX;

            this.layer.size = [width, height];

            this.peekView.position = [0, 0];
            this.peekView.size = this.size;
        },
        *iterSublayers () {
            yield this.nameLayer;
            yield this.trueNameLayer;
            if (!this.isInfix) {
                for (const label of this.argLabels) yield label;
            }
        },
        *iterSubviews () {
            for (const slot of this.argSlots) yield slot;
            if (!this._isDemo) yield this.peekView;
        },
        onPointerEnter () {
            const result = evalExpr(this.expr);
            if (!result) return;

            const t = new Transaction(1, 0.2);
            this.layer.strokeWidth = config.primitives.hoverOutlineWeight;
            this.layer.stroke = config.primitives.callHoverOutline;
            t.commit();

            this.peekView.value = result.result;
            this.peekView.analysis = result.analysis;
            this.peekView.visible = true;
        },
        onDragStart () {
            this.peekView.visible = false;
        },
        onPointerExit () {
            const t = new Transaction(1, 0.2);
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.layer.stroke = config.primitives.callOutline;
            t.commit();
            this.peekView.visible = false;
        },
    },
    f: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.func;
            this.layer.stroke = config.primitives.funcOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;
        },
        deinit () {
            delete this.textLayer;
        },
        layout () {
            this.textLayer.text = config.primitives.functionLabel;

            const textSize = this.textLayer.getNaturalSize();
            this.layer.size = [textSize[0] + 16, textSize[1] + 4];
            this.textLayer.position = [8, this.layer.size[1] / 2];
        },
        tapAction () {
            // TODO: edit function
        },
        *iterSublayers () {
            yield this.textLayer;
        },
    },
    w: {
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.switch;
            this.layer.stroke = config.primitives.switchOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;
            this.textLayer.text = config.primitives.switchLabel;

            this.cases = new SwitchCases(this);
        },
        deinit () {
            delete this.textLayer;
            delete this.cases;
        },
        layout () {
            const { paddingX, paddingY } = config.primitives;
            const textSize = this.textLayer.getNaturalSize();
            this.textLayer.position = [paddingX, paddingY + textSize[1] / 2];

            this.cases.dragController = this.dragController;
            this.cases.layout();

            this.cases.position = [paddingX, paddingY + textSize[1] + paddingY];

            const width = Math.max(textSize[0], this.cases.size[0]) + paddingX * 2;
            const height = paddingY + textSize[1] + paddingY + this.cases.size[1] + paddingY;

            this.layer.size = [width, height];
        },
        *iterSublayers () {
            yield this.textLayer;
        },
        *iterSubviews () {
            yield this.cases;
        },
    },
};

class SwitchCases extends View {
    constructor (exprView) {
        super();
        this.exprView = exprView;
        this.matchViews = [];
    }
    get expr () {
        return this.exprView.expr;
    }
    layout () {
        super.layout();

        // to facilitate editing, we will:
        // - ensure at least one wildcard match entry at the end
        // - remove all completely empty match entries, except if it's the one wildcard match entry
        let lastEmptyRemoved = null;
        let needsWildcard = true;
        let passedValue = false;
        for (let i = this.expr.matches.length - 1; i >= 0; i--) {
            const m = this.expr.matches[i];
            if (!m.cond && !m.value) {
                lastEmptyRemoved = this.expr.matches.splice(i, 1)[0];
            } else if (!passedValue && !m.cond) needsWildcard = false;
            else if (m.cond) passedValue = true;
        }

        if (needsWildcard) {
            if (lastEmptyRemoved) this.expr.matches.push(lastEmptyRemoved);
            else this.expr.matches.push({ cond: null, value: null });
        }

        for (let i = 0; i < this.expr.matches.length; i++) {
            const match = this.expr.matches[i];
            if (!this.matchViews[i]) {
                this.matchViews.push(new SwitchMatch(this.expr, match));
            } else {
                this.matchViews[i].expr = this.expr;
                this.matchViews[i].match = match;
            }
            this.matchViews[i].dragController = this.dragController;
            this.matchViews[i].layout();
        }

        while (this.matchViews.length > this.expr.matches.length) this.matchViews.pop();

        const { paddingY } = config.primitives;

        let maxWidth = 0;
        let y = 0;
        for (let i = 0; i < this.matchViews.length; i++) {
            const matchView = this.matchViews[i];
            matchView.position = [0, y];
            maxWidth = Math.max(maxWidth, matchView.size[0]);
            y += (y ? paddingY : 0) + matchView.size[1];
        }

        this.layer.size = [maxWidth, y];
    }
    *iterSubviews () {
        for (const m of this.matchViews) yield m;
    }
}

class SwitchMatch extends View {
    constructor (expr, match) {
        super();
        this.expr = expr;
        this.match = match;

        this.ifLabel = new TextLayer();
        this.thenLabel = new TextLayer();

        this.ifLabel.font = this.thenLabel.font = config.identFont;
        this.ifLabel.text = config.primitives.switchIf;
        this.thenLabel.text = config.primitives.switchThen;

        this.cond = new ExprSlot(cond => {
            this.match.cond = cond;
            cond.parent = this.expr;
            this.expr.ctx.notifyMutation(this.expr);
            this.expr.ctx.notifyMutation(cond);
        }, this.expr.ctx);
        this.cond.spec = { type: 'switchcond' };
        this.value = new ExprSlot(value => {
            this.match.value = value;
            value.parent = this.expr;
            this.expr.ctx.notifyMutation(this.expr);
            this.expr.ctx.notifyMutation(value);
        }, this.expr.ctx);
    }
    layout () {
        super.layout();

        this.cond.exprCtx = this.expr.ctx;
        this.value.exprCtx = this.expr.ctx;
        this.cond.expr = this.match.cond;
        this.value.expr = this.match.value;

        this.cond.dragController = this.value.dragController = this.dragController;

        this.cond.layoutIfNeeded();
        this.value.layoutIfNeeded();

        const { paddingX, paddingY } = config.primitives;

        const height = Math.max(this.cond.size[1], this.value.size[1]) + paddingY * 2;

        let width = 0;
        if (this.match.cond) {
            const ifSize = this.ifLabel.getNaturalSize();
            this.ifLabel.position = [width, height / 2];
            width += ifSize[0] + paddingX;
        }
        this.cond.position = [width, (height - this.cond.size[1]) / 2];
        width += this.cond.size[0] + paddingX;
        if (this.match.cond) {
            const thenSize = this.thenLabel.getNaturalSize();
            this.thenLabel.position = [width, height / 2];
            width += thenSize[0] + paddingX;
        }
        this.value.position = [width, (height - this.value.size[1]) / 2];
        width += this.value.size[0];

        this.layer.size = [width, height];
    }
    *iterSublayers () {
        if (this.match.cond) {
            yield this.ifLabel;
            yield this.thenLabel;
        }
    }
    *iterSubviews () {
        yield this.cond;
        yield this.value;
    }
}

class SwitchCondNone extends View {
    constructor () {
        super();
        this.label = new TextLayer();
        this.label.font = config.identFont;
        this.label.text = config.primitives.switchOtherwise;
        const t = new Transaction(1, 0);
        this.layout();
        t.commit();
    }
    layout () {
        super.layout();
        const labelSize = this.label.getNaturalSize();
        const { paddingX, paddingYS } = config.primitives;
        const height = labelSize[1] + paddingYS * 2;
        this.label.position = [paddingX, height / 2];
        this.layer.size = [paddingX * 2 + labelSize[0], height];
    }
    *iterSublayers () {
        yield this.label;
    }
}

import { View } from './view';
import { getProtoView } from './proto-pool';
import { Layer, TextLayer, ArrowLayer, PathLayer, Transaction } from './layer';
import { evalExpr } from './model';
import { Dropdown } from './dropdown';
import config from './config';

/// Renders a slot for an expression.
export class ExprSlot extends View {
    #expr = null;
    wantsChildLayout = true;
    spec = null;
    exprCtx = null;

    constructor (onInsertExpr, exprCtx) {
        super();

        this.layer.cornerRadius = config.cornerRadius;
        this.onInsertExpr = onInsertExpr;
        this.exprCtx = exprCtx;
        this.needsLayout = true;
    }

    didUnmount () {
        this.dragController.unregisterTarget(this);
    }

    get expr () {
        return this.#expr;
    }
    set expr (value) {
        if (this.#expr === value) return;
        this.#expr = value;
        this.needsLayout = true;
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
                }

                if (this.expr && this.expr.type === 's' && variants.includes(this.expr.value)) {
                    useUIExpr = true;
                    exprUI = Dropdown;
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

    *iterSubviews () {
        if (this.exprUI) {
            yield this.exprUI;
        } else if (this.expr) {
            yield getProtoView(this.expr, ExprView);
        }
    }
}

/// Renders a runtime value.
class PeekView extends View {
    #value = null;
    #visible = false;
    analysis = { valid: false, type: null };

    constructor () {
        super();
        this.innerExpr = new ExprView({ type: 'u' });
        this.innerExpr.noInteraction = true;
        this.needsLayout = true;

        this.bgLayer = new Layer();
        this.bgLayer.background = config.peek.background;
        this.bgLayer.cornerRadius = 10;

        this.arrowLayer = new ArrowLayer();
        this.arrowLayer.arrowSize = 8;
        this.arrowLayer.stroke = config.peek.background;
        this.arrowLayer.strokeWidth = 4;

        this.layer.opacity = 0;
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
        return this.#visible;
    }
    set visible (value) {
        if (value === this.#visible) return;
        this.#visible = value;
        this.needsLayout = true;
    }

    time = 0;

    layout () {
        const { value, innerExpr: ie } = this;
        if (value === null) ie.expr = { type: 'u' };
        else if (typeof value === 'boolean') ie.expr = { type: 'b', value };
        else if (typeof value === 'number') ie.expr = { type: 'n', value };
        else if (typeof value === 'string') ie.expr = { type: 's', value };
        else if (Array.isArray(value)) ie.expr = { type: 'm', value };
        else if (typeof value === 'function') ie.expr = { type: 's', value: '(todo: func expr)' };
        else ie.expr = { type: 's', value: `don’t know the type ${typeof value}` };

        ie.layout();

        const time = this.time;
        this.time += 1 / 60; // close enough

        const t = new Transaction(1, 0.2);
        this.layer.opacity = this.#visible ? 1 : 0;

        const offsetY = this.#visible ? 4 + 2 * Math.cos(time * 4) : 0;

        ie.position = [-ie.size[0] / 2, -ie.size[1] - offsetY];

        this.bgLayer.position = [
            ie.position[0] - 6,
            ie.position[1] - 6,
        ];

        t.commit();
        this.bgLayer.size = [
            ie.size[0] + 12,
            ie.size[1] + 12,
        ];

        this.arrowLayer.start = [0, -10];
        this.arrowLayer.control1 = [0, -10];
        this.arrowLayer.control2 = [0, 0];
        this.arrowLayer.end = [0, 8];

        if (this.#visible) {
            this.needsLayout = true;
        } else {
            this.time = 0;
        }
    }

    *iterSublayers () {
        yield this.arrowLayer;
        yield this.bgLayer;
    }

    *iterSubviews () {
        yield this.innerExpr;
    }
}

/// Renders a single expression.
export class ExprView extends View {
    wantsChildLayout = true;

    constructor (expr) {
        super();
        this.expr = expr;
        this.updateImpl();
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
    onPointerStart ({ absX, absY }) {
        if (this.noInteraction) return;
        this.#dragStartPos = [absX, absY];
        this.#dragging = false;
        this.decorationOnly = true;
    }
    onPointerDrag ({ absX, absY }) {
        if (this.noInteraction) return;
        if (this.#dragging) {
            this.dragController.moveExprDrag(absX, absY);
        } else {
            const distance = Math.hypot(absX - this.#dragStartPos[0], absY - this.#dragStartPos[1]);
            if (distance > 6) {
                this.dragController.beginExprDrag(this.expr, absX, absY);
                if (this.impl$onDragStart) this.impl$onDragStart();
                this.#dragging = true;
            }
        }
    }
    onPointerEnd () {
        if (this.noInteraction) return;
        if (this.#dragging) {
            this.dragController.endExprDrag();
        } else {
            if (this.impl$tapAction) this.impl$tapAction();
        }
        this.decorationOnly = false;
    }
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
        },
        deinit () {
            delete this.textLayer;
            delete this.iconLayer;
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
                } else {
                    this.expr.name = name;
                    this.expr.ctx.notifyMutation(this.expr);
                    new Transaction(1, 0.3).commitAfterLayout(this.ctx);
                }
            });
        },
        layout () {
            this.textLayer.text = this.expr.name;
            if (!this.isDef && !this.expr.name.startsWith('@') && !this.expr.refNode) {
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
                    expr.ctx.notifyMutation(this.expr);
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

            if (refNode && refNode.type === 'ds' && refNode.nameOverride) {
                funcName = refNode.nameOverride;
            }

            this.nameLayer.text = funcName;
            const nameSize = this.nameLayer.getNaturalSize();

            let params, slots;
            if (refNode && refNode.type === 'ds' && refNode.expr.type === 'f') {
                params = refNode.expr.params;
                slots = refNode.expr.slots || [];
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

            let height = nameSize[1];

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

            let width = config.primitives.paddingX;
            this.nameLayer.position = [width, height / 2];
            width += nameSize[0];

            let labelHeight = 0;

            for (let i = 0; i < this.argSlots.length; i++) {
                const slot = this.argSlots[i];
                const label = this.argLabels[i];
                const labelSize = label.getNaturalSize();
                labelHeight = labelSize[1];

                width += config.primitives.paddingX;

                const itemWidth = Math.max(slot.size[0], labelSize[0]);

                slot.position = [width + (itemWidth - slot.size[0]) / 2, (height - slot.size[1]) / 2];
                label.position = [width + itemWidth / 2, height];

                width += itemWidth;
            }

            height += labelHeight + config.primitives.paddingY;
            width += config.primitives.paddingX;

            this.layer.size = [width, height];

            this.peekView.position = [
                width / 2,
                -12,
            ];
        },
        *iterSublayers () {
            yield this.nameLayer;
            for (const label of this.argLabels) yield label;
        },
        *iterSubviews () {
            for (const slot of this.argSlots) yield slot;
            yield this.peekView;
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
            this.textLayer.text = 'SWITCH GOES HERE';

            const textSize = this.textLayer.getNaturalSize();
            this.layer.size = [textSize[0] + 16, textSize[1] + 4];
            this.textLayer.position = [8, this.layer.size[1] / 2];
        },
        *iterSublayers () {
            yield this.textLayer;
        },
    },
};

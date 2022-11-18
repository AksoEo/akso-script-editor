import { stdlib } from '@tejo/akso-script';
import { View, TextLayer, PathLayer, Transaction, Gesture } from './ui';
import { getProtoView } from './proto-pool';
import {
    remove as removeNode,
    evalExpr,
    AscContext,
    Expr,
    ExprSlotSpec,
    Def,
    cloneWithContext,
} from './model';
import { Dropdown } from './dropdown';
import { Tooltip } from './tooltip';
import { editMatrix, MatrixPreview } from './matrix';
import { ValueView } from './value-view';
import { DragController, DragSlot, IExprDragController } from './drag-controller';
import config from './config';
import { BaseLayer } from './ui/layer/base';
import { HelpTagged } from './help/help-tag';

type OnInsertExpr = (expr: Expr.Any) => void;

interface ExprUI {
    drop?: () => void;
    hasTentativeChild: View | null;
}

/// Renders a slot for an expression, or UI if this field has a spec.
export class ExprSlot extends View implements DragSlot {
    // currently contained expr
    #expr: Expr.Any | null = null;
    // currently contained expr UI
    #exprUI: (View & ExprUI) | null = null;
    wantsChildLayout = true;
    // field spec
    spec: ExprSlotSpec | null = null;
    // model ctx
    exprCtx: AscContext | null = null;

    // if true, will mark this slot as only accepting refs
    #refOnly = false;
    refOnlyLayer: PathLayer | null = null;

    tentativeChild: View | null = null;
    onInsertExpr: OnInsertExpr;
    dragController: DragController | null = null;

    constructor (onInsertExpr: OnInsertExpr, exprCtx: AscContext | null) {
        super();

        this.layer.cornerRadius = config.cornerRadius;
        this.onInsertExpr = onInsertExpr;
        this.exprCtx = exprCtx;
        this.needsLayout = true;
    }

    didUnmount () {
        super.didUnmount();
        this.dragController?.unregisterTarget(this);
    }

    get expr (): Expr.Any | null {
        return this.#expr;
    }
    set expr (value: Expr.Any | null) {
        if (this.#expr === value) return;
        if (this.#expr) this.removeSubview(getProtoView(this.#expr, ExprView));
        this.#expr = value;
        this.needsLayout = true;
        if (this.#expr) this.addSubview(getProtoView(this.#expr, ExprView));
    }

    get exprUI (): (View & ExprUI) | null {
        return this.#exprUI;
    }
    set exprUI (value: (View & ExprUI) | null) {
        if (this.#exprUI === value) return;
        if (this.#exprUI) this.removeSubview(this.#exprUI);
        this.#exprUI = value;
        if (this.#exprUI) this.addSubview(this.#exprUI);
    }

    get refOnly (): boolean {
        return this.#refOnly;
    }
    set refOnly (v) {
        if (v === this.#refOnly) return;
        this.#refOnly = v;
        if (this.#refOnly) {
            if (this.expr && this.expr.type !== 'r') {
                // remove current expr because it's not a ref!
                removeNode(this.expr);
                this.expr = null;
            }
            this.refOnlyLayer = new PathLayer();
            this.refOnlyLayer.path = config.icons.ref;
            this.addSublayer(this.refOnlyLayer);
        } else {
            this.removeSublayer(this.refOnlyLayer);
            this.refOnlyLayer = null;
        }
        this.needsLayout = true;
    }

    get isEmpty () {
        return !!this.exprUI || !this.expr;
    }

    acceptsExpr (expr) {
        if (this.refOnly) return expr.type === 'r';
        return true;
    }

    insertExpr (expr: Expr.Any) {
        this.tentativeChild = null;
        this.onInsertExpr(expr);
    }

    beginTentative (view: View) {
        this.tentativeChild = view;
        this.needsLayout = true;
    }
    endTentative () {
        this.tentativeChild = null;
        this.needsLayout = true;
    }

    layout () {
        super.layout();

        this.dragController?.registerTarget(this);

        let exprSize = [56, 24];

        let useUIExpr = false;
        let exprUIConstructor: { new(expr: Expr.Any, spec: ExprSlotSpec): View & ExprUI } | null = null;

        if (this.spec) {
            if (this.spec.type === 'enum' && !this.refOnly) {
                const variants = Object.keys(this.spec.variants);

                if (!this.expr) {
                    this.onInsertExpr({
                        ctx: this.exprCtx,
                        parent: null,
                        type: 's',
                        value: variants[0],
                    });
                    this.needsLayout = true;
                }

                if (this.expr && this.expr.type === 's' && variants.includes(this.expr.value)) {
                    useUIExpr = true;
                    exprUIConstructor = Dropdown;
                }
            } else if (this.spec.type === 'switchcond') {
                if (!this.expr) {
                    useUIExpr = true;
                    exprUIConstructor = SwitchCondNone;
                }
            }
        }

        if (useUIExpr) {
            if (!this.exprUI || this.exprUI.constructor !== exprUIConstructor) {
                if (this.exprUI && this.exprUI.drop) this.exprUI.drop();
                this.exprUI = new (exprUIConstructor!)(this.expr, this.spec);
            }
            this.exprUI.hasTentativeChild = this.tentativeChild;
            this.exprUI.layoutIfNeeded();
            exprSize = this.exprUI.size.slice();
            if (this.refOnlyLayer) {
                this.exprUI.position = [config.primitives.paddingX + config.icons.size, 0];
                exprSize[0] += this.exprUI.position[0];
            } else {
                this.exprUI.position = [0, 0];
            }
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

        let acceptsChild = true;
        if (this.refOnly && this.tentativeChild instanceof ExprView) {
            acceptsChild = this.tentativeChild.expr.type === 'r';
        }

        if (this.tentativeChild && acceptsChild) {
            this.layer.stroke = config.exprSlot.hoverStroke;
            this.layer.strokeWidth = config.exprSlot.hoverWeight;
            this.layer.background = config.exprSlot.hoverBackground;
        } else {
            this.layer.strokeWidth = config.exprSlot.weight;
            this.layer.stroke = (!useUIExpr && this.expr) ? config.exprSlot.stroke : config.exprSlot.emptyStroke;
            this.layer.background = config.exprSlot.background;
        }
        this.layer.size = exprSize;

        if (this.refOnlyLayer) {
            this.refOnlyLayer.fill = this.expr
                ? config.primitives.iconColor0
                : config.primitives.refOnlyColor;
            this.refOnlyLayer.position = [
                config.primitives.paddingX,
                (this.layer.size[1] - config.icons.size) / 2,
            ];
        }
    }
}

/// Renders a runtime value.
class PeekView extends View {
    #value = null;
    analysis = { valid: false, type: null };
    tooltip: Tooltip;
    inner: ValueView;

    constructor () {
        super();

        this.tooltip = new Tooltip();
        this.addSubview(this.tooltip);

        this.inner = new ValueView();
        this.inner.noInteraction = true;
        this.tooltip.contents = this.inner;
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
        this.inner.value = this.value;
        this.inner.layoutIfNeeded();
        this.tooltip.size = this.size;
        this.tooltip.layoutIfNeeded();
    }
}

/// Renders a single expression.
export class ExprView extends View implements HelpTagged {
    wantsChildLayout = true;
    expr: Expr.Any;
    impl$tapAction: (() => void) | null = null;
    impl$init: (() => void) | null = null;
    impl$deinit: (() => void) | null = null;
    impl$layout: (() => void) | null = null;
    impl$onDragStart: (() => void) | null = null;
    impl$onPointerEnter: ((event) => void) | null = null;
    impl$onPointerMove: ((event) => void) | null = null;
    impl$onPointerExit: ((event) => void) | null = null;
    impl$iterSubviews: (() => Generator<View>) | null = null;
    impl$iterSublayers: (() => Generator<BaseLayer>) | null = null;
    implType: string;
    implProto: ExprImpl;
    noInteraction = false;
    decorationOnly = false;
    dragController: IExprDragController | null = null;

    _isDemo?: boolean;
    isDef?: boolean;
    onDefRename?: ((name: string) => void);

    constructor (expr: Expr.Any) {
        super();
        this.expr = expr;
        this.updateImpl();

        Gesture.onTap(this, this.onTap);
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
        for (const k in this) {
            if (k.startsWith('impl$')) {
                this[k] = impl[k.substr(5)] || null;
            }
        }
        if (this.impl$init) this.impl$init();
        this.needsLayout = true;
    }

    get helpTag() {
        if (this.expr.type === 'r' && this.isDef) {
            return { id: 'expr.r.def', args: [this.expr] };
        }
        return { id: 'expr.' + this.implType, args: [this.expr] };
    }

    layout () {
        super.layout();
        this.updateImpl();
        this.impl$layout();
    }
    onTap = () => {
        if (this.ctx.isInDupMode && this.dragController instanceof DragController) {
            const defs = (this.dragController as DragController).defs;
            const dupExpr = cloneWithContext(this.expr, this.expr.ctx);
            const dupView = getProtoView(dupExpr, ExprView);
            dupView.position = [
                this.absolutePosition[0] - defs.absolutePosition[0],
                this.absolutePosition[1] - defs.absolutePosition[1],
            ];
            dupView.dragController = this.dragController;
            defs.addFloatingExpr(dupExpr);
            const tx = new Transaction(1, 0.3);
            dupView.position = [8, 8];
            tx.commit();
            return;
        }
        if (this.impl$tapAction) this.impl$tapAction();
    };

    #dragging = false;
    onDragStart = ({ absX, absY }) => {
        if (this.noInteraction || !this.dragController) return;

        if (this.ctx.isInDupMode && this.dragController instanceof DragController) {
            const defs = (this.dragController as DragController).defs;
            const dupExpr = cloneWithContext(this.expr, this.expr.ctx) as Expr.Any;
            const dupView = getProtoView(dupExpr, ExprView);
            dupView.position = [
                this.absolutePosition[0] - defs.absolutePosition[0],
                this.absolutePosition[1] - defs.absolutePosition[1],
            ];
            dupView.dragController = this.dragController;
            defs.addFloatingExpr(dupExpr);
            this.dragController.beginExprDrag(dupExpr, absX, absY);
            return;
        }

        this.decorationOnly = true;
        this.dragController.beginExprDrag(this.expr, absX, absY);
        if (this.impl$onDragStart) this.impl$onDragStart();
        this.#dragging = true;
    };
    onDragMove = ({ absX, absY }) => {
        if (this.noInteraction || !this.dragController) return;
        this.dragController.moveExprDrag(absX, absY);
    };
    onDragEnd = () => {
        if (this.noInteraction || !this.dragController) return;
        this.dragController.endExprDrag();
        this.decorationOnly = false;
    };
    onDragCancel = () => {
        if (this.noInteraction || !this.dragController) return;
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

interface ExprImpl {
    init?();
    deinit?();
    tapAction?();
    layout?();
    onPointerEnter?();
    onPointerExit?();
    onDragStart?();
    iterSubviews?(): Generator<View>;
    iterSublayers?(): Generator<BaseLayer>;
}

function getImplForExpr (expr) {
    return EXPR_VIEW_IMPLS[expr.type];
}

const EXPR_VIEW_IMPLS: { [k: string]: ExprImpl } = {
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
                name = name.normalize();
                if (this.isDef) {
                    this.onDefRename(name);
                    this.needsLayout = true;
                } else {
                    this.ctx.history.commitChange('change-ref', () => {
                        const prevName = this.expr.name;
                        this.expr.name = name;
                        this.expr.ctx.notifyMutation(this.expr);

                        return () => {
                            this.expr.name = prevName;
                            this.expr.ctx.notifyMutation(this.expr);
                        };
                    });
                    new Transaction(1, 0.3).commitAfterLayout(this.ctx);
                }
            });
        },
        layout () {
            this.textLayer.text = this.expr.name;
            this.layer.strokeWidth = config.primitives.outlineWeight;

            let isBroken = false;
            if (!this._isDemo && !this.isDef) {
                const isFormVar = this.expr.name.startsWith('@');
                if (isFormVar) {
                    const formVarName = this.expr.name.substr(1);
                    isBroken = true;
                    for (const i of this.expr.ctx.formVars) {
                        if (i.name === formVarName) {
                            isBroken = false;
                            break;
                        }
                    }
                } else {
                    isBroken = !this.expr.refNode;
                }
            }

            if (isBroken) {
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

            this.ctx.history.commitChange('toggle-bool', () => {
                this.expr.value = !this.expr.value;
                this.expr.ctx.notifyMutation(this.expr);

                return () => {
                    this.expr.value = !this.expr.value;
                    this.expr.ctx.notifyMutation(this.expr);
                };
            });
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
                (this.expr.value || 0).toString(),
                { font: config.identFont },
            ).then(value => {
                value = Number.parseFloat(value);
                if (!Number.isFinite(value)) value = 0;

                const prevValue = this.expr.value;

                this.ctx.history.commitChange('change-number', () => {
                    this.expr.value = value;
                    this.expr.ctx.notifyMutation(this.expr);

                    return () => {
                        this.expr.value = prevValue;
                        this.expr.ctx.notifyMutation(this.expr);
                    };
                });
                new Transaction(1, 0.3).commitAfterLayout(this.ctx);
            });
        },
        layout () {
            this.textLayer.text = (this.expr.value || 0).toString();

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
                value = value.normalize();
                const prevValue = this.expr.value;
                this.ctx.history.commitChange('change-string', () => {
                    this.expr.value = value;
                    this.expr.ctx.notifyMutation(this.expr);

                    return () => {
                        this.expr.value = prevValue;
                        this.expr.ctx.notifyMutation(this.expr);
                    };
                });
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

            this.preview = new MatrixPreview();

            this.iconLayer = new PathLayer();
            this.iconLayer.path = config.icons.matrix;
            this.iconLayer.fill = config.primitives.iconColor;
        },
        deinit () {
            delete this.preview;
            delete this.iconLayer;
        },
        tapAction () {
            const cloneMatrix = o => {
                if (Array.isArray(o)) return o.map(cloneMatrix);
                else return o;
            };
            const prevValue = cloneMatrix(this.expr.value);

            editMatrix(this.ctx, this.expr.value, () => {
                const newValue = this.expr.value;
                this.ctx.history.commitChange('change-matrix', () => {
                    this.expr.value = newValue;
                    this.expr.ctx.notifyMutation(this.expr);

                    return () => {
                        this.expr.value = prevValue;
                        this.expr.ctx.notifyMutation(this.expr);
                    };
                });

                this.needsLayout = true;
                this.preview.needsLayout = true;
            });
        },
        layout () {
            const iconSize = config.icons.size;
            this.iconLayer.position = [4, 4];

            this.preview.value = this.expr.value;
            this.preview.layoutIfNeeded();

            this.layer.size = [this.preview.size[0] + iconSize + 4 + config.primitives.paddingX * 2, Math.max(iconSize, this.preview.size[1]) + config.primitives.paddingYS * 2];
            this.preview.position = [4 + iconSize + 4, (this.layer.size[1] - this.preview.size[1]) / 2];
        },
        *iterSublayers () {
            yield this.iconLayer;
        },
        *iterSubviews () {
            yield this.preview;
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
            delete this.label;
        },
        layout () {
            const itemCount = this.expr.items.length;

            while (this.slots.length > itemCount + 1) this.slots.pop();
            for (let i = this.slots.length; i < itemCount + 1; i++) {
                const index = i;
                this.slots.push(new ExprSlot(expr => {
                    const prevItem = i === this.expr.items.length ? null : this.expr.items[i];
                    const prevParent = expr.parent;

                    this.ctx.history.commitChange('slot-insert-expr', () => {
                        this.expr.items[index] = expr;
                        expr.parent = this.expr;
                        this.ctx.modelCtx.startMutation();
                        this.ctx.modelCtx.notifyMutation(this);
                        this.ctx.modelCtx.notifyMutation(this.expr);
                        this.ctx.modelCtx.flushMutation();

                        return () => {
                            if (prevItem) {
                                this.expr.items[index] = prevItem;
                            } else {
                                this.expr.items.pop();
                            }
                            expr.parent = prevParent;
                            this.ctx.modelCtx.startMutation();
                            this.ctx.modelCtx.notifyMutation(this);
                            this.ctx.modelCtx.notifyMutation(this.expr);
                            this.ctx.modelCtx.flushMutation();
                        };
                    }, expr);
                }, this.expr.ctx));
            }

            let width = config.primitives.paddingX;
            let height = 0;

            const refOnly = this.expr.parent && this.expr.parent.flatExpr;

            for (let i = 0; i < this.slots.length; i++) {
                const slot = this.slots[i];
                const expr = this.expr.items[i];
                slot.refOnly = refOnly;
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
                    const prevArg = this.expr.args[index];
                    const prevParent = expr.parent;

                    if (!this.ctx) return;
                    this.ctx.history.commitChange('slot-insert-expr', () => {
                        this.expr.args[index] = expr;
                        expr.parent = this.expr;
                        expr.ctx.startMutation();
                        expr.ctx.notifyMutation(this);
                        expr.ctx.notifyMutation(this.expr);
                        expr.ctx.flushMutation();

                        return () => {
                            this.expr.args[index] = prevArg;
                            expr.parent = prevParent;
                            expr.ctx.startMutation();
                            expr.ctx.notifyMutation(this);
                            expr.ctx.notifyMutation(this.expr);
                            expr.ctx.flushMutation();
                        };
                    }, expr);
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

            const refOnly = this.expr.parent && this.expr.parent.flatExpr;

            for (let i = 0; i < this.argSlots.length; i++) {
                const arg = this.expr.args[i] || null;
                const slot = this.argSlots[i];
                const label = this.argLabels[i];

                label.text = params[i];

                slot.refOnly = refOnly;
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
            this.textLayer.text = config.primitives.functionLabel + '(' + this.expr.params.join(', ') + ')';

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
    timestamp: {
        // view only!
        init () {
            this.layer.cornerRadius = config.cornerRadius;
            this.layer.background = config.primitives.timestamp;
            this.layer.stroke = config.primitives.timestampOutline;
            this.layer.strokeWidth = config.primitives.outlineWeight;
            this.textLayer = new TextLayer();
            this.textLayer.font = config.identFont;
            this.textLayer.color = config.primitives.color;

            this.iconLayer = new PathLayer();
            this.iconLayer.path = config.icons.timestamp;
            this.iconLayer.fill = config.primitives.iconColor;
        },
        deinit () {
            delete this.textLayer;
            delete this.iconLayer;
        },
        layout () {
            this.textLayer.text = stdlib.ts_fmt.apply(null, [this.expr.value]);

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
};

class SwitchCases extends View {
    exprView: ExprView;
    matchViews: SwitchMatch[];
    dragController: DragController | null = null;

    constructor (exprView: ExprView) {
        super();
        this.exprView = exprView;
        this.matchViews = [];
    }
    get expr (): Expr.Switch {
        return this.exprView.expr as Expr.Switch;
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
    expr: Expr.Switch;
    match: Expr.Switch.Case;
    ifLabel: TextLayer;
    thenLabel: TextLayer;
    cond: ExprSlot;
    value: ExprSlot;
    dragController: DragController | null = null;

    constructor (expr: Expr.Switch, match: Expr.Switch.Case) {
        super();
        this.expr = expr;
        this.match = match;

        this.ifLabel = new TextLayer();
        this.thenLabel = new TextLayer();

        this.ifLabel.font = this.thenLabel.font = config.identFont;
        this.ifLabel.text = config.primitives.switchIf;
        this.thenLabel.text = config.primitives.switchThen;

        this.cond = new ExprSlot(cond => {
            const prevCond = this.match.cond;
            const prevParent = cond.parent;

            this.ctx.history.commitChange('slot-insert-expr', () => {
                this.match.cond = cond;
                cond.parent = this.expr;
                this.expr.ctx.startMutation();
                this.expr.ctx.notifyMutation(cond);
                this.expr.ctx.notifyMutation(this.expr);
                this.expr.ctx.flushMutation();

                return () => {
                    this.match.cond = prevCond;
                    cond.parent = prevParent;
                    this.expr.ctx.startMutation();
                    this.expr.ctx.notifyMutation(this.expr);
                    this.expr.ctx.notifyMutation(cond);
                    this.expr.ctx.flushMutation();
                };
            }, cond);
        }, this.expr.ctx);
        this.cond.spec = { type: 'switchcond' };
        this.value = new ExprSlot(value => {
            const prevValue = this.match.value;
            const prevParent = value.parent;

            this.ctx.history.commitChange('slot-insert-expr', () => {
                this.match.value = value;
                value.parent = this.expr;
                this.expr.ctx.startMutation();
                this.expr.ctx.notifyMutation(value);
                this.expr.ctx.notifyMutation(this.expr);
                this.expr.ctx.flushMutation();

                return () => {
                    this.match.value = prevValue;
                    value.parent = prevParent;
                    this.expr.ctx.startMutation();
                    this.expr.ctx.notifyMutation(this.expr);
                    this.expr.ctx.notifyMutation(value);
                    this.expr.ctx.flushMutation();
                };
            }, value);
        }, this.expr.ctx);
    }
    layout () {
        super.layout();

        const refOnly = this.expr.parent && (this.expr.parent as Def).flatExpr;

        this.cond.refOnly = this.value.refOnly = refOnly;
        this.cond.exprCtx = this.value.exprCtx = this.expr.ctx;
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
    label: TextLayer;
    hasTentativeChild: View | null = null;
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

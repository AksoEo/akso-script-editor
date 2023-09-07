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
import { HelpTagged } from './help/help-tag';
import { Vec2 } from './spring';
import anyRuntimeAsAny = Expr.anyRuntimeAsAny;

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
        if (this.#expr) {
            const exprView = getProtoView(this.#expr, ExprView);
            if (exprView.parent) this.removeSubview(exprView);
        }
        this.#expr = value;
        this.needsLayout = true;
        this.#updateExprVisible();
    }

    #updateExprVisible () {
        if (this.#expr) {
            const exprView = getProtoView(this.#expr, ExprView);
            const shouldBeVisible = !this.#exprUI;
            if (shouldBeVisible && !exprView.parent) {
                this.addSubview(exprView);
            } else if (!shouldBeVisible && exprView.parent) {
                this.removeSubview(exprView);
            }
        }
    }

    get exprUI (): (View & ExprUI) | null {
        return this.#exprUI;
    }
    set exprUI (value: (View & ExprUI) | null) {
        if (this.#exprUI === value) return;
        if (this.#exprUI) this.removeSubview(this.#exprUI);
        this.#exprUI = value;
        if (this.#exprUI) this.addSubview(this.#exprUI);
        this.#updateExprVisible();
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

    acceptsExpr (expr: Expr.Any) {
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

    getIntrinsicSize(): Vec2 {
        let size = new Vec2(56, 24);

        if (this.#exprUI) {
            size = this.#exprUI.getIntrinsicSize();
            if (this.refOnlyLayer) {
                size.x += config.primitives.paddingX + config.icons.size;
            }
        } else if (this.expr) {
            const exprView = getProtoView(this.expr, ExprView);
            size = exprView.getIntrinsicSize();
        }

        if ((this.#exprUI || !this.expr) && this.tentativeChild) {
            size.x = Math.max(size.x, this.tentativeChild.size.x);
            size.y = Math.max(size.y, this.tentativeChild.size.y);
        }

        return size;
    }

    layout () {
        this.needsLayout = false;

        this.dragController?.registerTarget(this);

        let exprSize = new Vec2(56, 24);

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
            this.exprUI.size = this.exprUI.getIntrinsicSize();
            this.exprUI.layout();
            exprSize = this.exprUI.size.clone();
            if (this.refOnlyLayer) {
                this.exprUI.position = [config.primitives.paddingX + config.icons.size, 0];
                exprSize.x += this.exprUI.position.x;
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
            if (!this.size.eq(exprView.size) || exprView.needsLayout) {
                exprView.size = this.size;
                exprView.layout();
            }
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

        if (this.refOnlyLayer) {
            this.refOnlyLayer.fill = this.expr
                ? config.primitives.iconColor0
                : config.primitives.refOnlyColor;
            this.refOnlyLayer.position = [
                config.primitives.paddingX,
                (this.layer.size[1] - config.icons.size) / 2,
            ];
        }

        return exprSize;
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
        this.tooltip.contents = this.inner;
    }

    decorationOnly = true;

    get value () {
        return this.#value;
    }
    set value (value) {
        if (value === this.#value) return;
        this.#value = value;
        this.inner.value = value;
        this.needsLayout = this.inner.needsLayout = true;
    }
    get visible () {
        return this.tooltip.visible;
    }
    set visible (value) {
        this.tooltip.visible = value;
        this.needsLayout = true;
    }

    getIntrinsicSize(): Vec2 {
        return this.tooltip.getIntrinsicSize();
    }

    layout () {
        this.needsLayout = false;
        this.tooltip.size = this.size;
        this.tooltip.layout();
        return this.size;
    }
}

/// Renders a single expression.
export class ExprView extends View implements HelpTagged {
    wantsChildLayout = true;
    expr: Expr.AnyRuntime;
    noInteraction = false;
    decorationOnly = false;
    dragController: IExprDragController | null = null;

    exprView: AnyExprView;

    /** If true, this view is inert and non-interactive. */
    isInert = false;

    constructor (expr: Expr.AnyRuntime) {
        super();
        this.expr = expr;
        this.updateImpl();

        Gesture.onTap(this, this.onTap);
        Gesture.onDrag(this, this.onDragMove, this.onDragStart, this.onDragEnd, this.onDragCancel);
    }

    get isDef() {
        if (this.exprView instanceof RefExprView) return this.exprView.isDef;
        return false;
    }
    set isDef(value: boolean) {
        if (this.exprView instanceof RefExprView) this.exprView.isDef = value;
    }
    get onDefRename() {
        if (this.exprView instanceof RefExprView) return this.exprView.onDefRename;
        return null;
    }
    set onDefRename(value: (name: string) => void) {
        if (this.exprView instanceof RefExprView) this.exprView.onDefRename = value;
    }

    updateImpl () {
        const impl = getImplForExpr(this.expr);
        if (!impl) throw new Error(`no implementation for this expr type: ${this.expr.type}`);

        if (this.exprView?.constructor === impl) return; // it's the same, no need to reinit

        this.exprView = new (impl as any)(this.expr, this);
        this.flushSubviews();
        this.needsLayout = true;
    }

    get helpTag() {
        if (this.expr.type === 'r' && this.isDef) {
            return { id: 'expr.r.def', args: [this.expr] };
        }
        return { id: 'expr.' + this.expr.type, args: [this.expr] };
    }

    getIntrinsicSize(): Vec2 {
        return this.exprView.getIntrinsicSize();
    }

    layout () {
        this.needsLayout = false;
        this.updateImpl();

        this.exprView.position = [0, 0];
        this.exprView.size = this.size;
        this.exprView.layout();
        return this.exprView.size;
    }

    onTap = () => {
        const expr = anyRuntimeAsAny(this.expr);
        if (expr && this.ctx.isInDupMode && this.dragController instanceof DragController) {
            const defs = (this.dragController as DragController).defs;
            const dupExpr = cloneWithContext(expr, this.expr.ctx) as Expr.Any;
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
        if ('tapAction' in this.exprView) this.exprView.tapAction();
    };

    #dragging = false;
    onDragStart = ({ absX, absY }) => {
        if (this.noInteraction || !this.dragController) return;
        const expr = anyRuntimeAsAny(this.expr);
        if (!expr) return;

        if (this.ctx.isInDupMode && this.dragController instanceof DragController) {
            const defs = (this.dragController as DragController).defs;
            const dupExpr = cloneWithContext(expr, this.expr.ctx) as Expr.Any;
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
        this.dragController.beginExprDrag(expr, absX, absY);
        if ('onDragStart' in this.exprView) this.exprView.onDragStart();
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
        if ('onPointerEnter' in this.exprView) this.exprView.onPointerEnter(event);
    }
    onPointerMove (event) {
        if (this.noInteraction) return;
        if ('onPointerMove' in this.exprView) this.exprView.onPointerMove(event);
    }
    onPointerExit () {
        if (this.noInteraction) return;
        if ('onPointerExit' in this.exprView) this.exprView.onPointerExit();
    }

    *iterSubviews () {
        yield this.exprView as View;
    }
}

type AnyExprView = RefExprView | NullExprView | BoolExprView | NumberExprView | StringExprView
    | MatrixExprView | ListExprView | CallExprView | SwitchExprView | FnDefExprView | TimestampExprView;

function getImplForExpr(expr: Expr.AnyRuntime) {
    switch (expr.type) {
    case 'r': return RefExprView;
    case 'u': return NullExprView;
    case 'b': return BoolExprView;
    case 'n': return NumberExprView;
    case 's': return StringExprView;
    case 'm': return MatrixExprView;
    case 'l': return ListExprView;
    case 'c': return CallExprView;
    case 'f': return FnDefExprView;
    case 'w': return SwitchExprView;
    case 'timestamp': return TimestampExprView;
    }
}

interface ExprViewOwner {
    isInert: boolean;
    dragController: DragController;
}

class RefExprView extends View {
    expr: Expr.Ref;
    owner: ExprViewOwner;
    textLayer: TextLayer;
    iconLayer: PathLayer;
    peekView: PeekView;

    /** If true, this is the left-hand side of a definition. */
    isDef = false;
    onDefRename: (name: string) => void = () => {};

    constructor(expr: Expr.Ref, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

        this.layer.cornerRadius = config.cornerRadius;
        this.layer.strokeWidth = config.primitives.outlineWeight;
        this.textLayer = new TextLayer();
        this.textLayer.font = config.identFont;
        this.textLayer.color = config.primitives.color;

        this.iconLayer = new PathLayer();
        this.iconLayer.fill = config.primitives.iconColor;

        this.peekView = new PeekView();
    }

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
    }

    getIntrinsicSizeAndTextLayerPos(): [Vec2, Vec2] {
        this.textLayer.text = this.expr.name;
        const textSize = this.textLayer.getNaturalSize();
        const iconSize = config.icons.size;

        if (this.isDef) {
            const size = new Vec2(
                textSize.x + config.primitives.paddingX * 2,
                textSize.y + config.primitives.paddingYS * 2,
            );
            const position = new Vec2(8, this.layer.size[1] / 2);
            return [size, position];
        } else {
            const size = new Vec2(
                textSize.x + iconSize + 4 + config.primitives.paddingX * 2,
                textSize.y + config.primitives.paddingYS * 2,
            );
            const position = new Vec2(4 + iconSize + 4, this.layer.size[1] / 2);
            return [size, position];
        }
    }

    getIntrinsicSize(): Vec2 {
        return this.getIntrinsicSizeAndTextLayerPos()[0];
    }

    layout () {
        this.needsLayout = false;
        this.layer.strokeWidth = config.primitives.outlineWeight;

        let isBroken = false;
        if (!this.owner.isInert && !this.isDef) {
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

        this.iconLayer.position = [4, 4];

        const [size, position] = this.getIntrinsicSizeAndTextLayerPos();
        this.textLayer.position = position;

        this.peekView.size = this.layer.size;
        return size;
    }

    onPointerEnter() {
        if (!this.ctx.isInTestMode) return;

        const result = evalExpr(this.expr);
        if (!result) return;

        const t = new Transaction(1, 0.2);
        this.layer.strokeWidth = config.primitives.hoverOutlineWeight;
        this.layer.stroke = config.primitives.callHoverOutline;
        t.commit();

        this.peekView.value = result.result;
        this.peekView.analysis = result.analysis;
        this.peekView.visible = true;
    }
    onPointerExit() {
        this.peekView.visible = false;
        this.layout();
    }
    *iterSubviews() {
        yield this.peekView;
    }
    *iterSublayers() {
        yield this.textLayer;
        if (!this.isDef) yield this.iconLayer;
    }
}

class NullExprView extends View {
    expr: Expr.Null;
    owner: ExprViewOwner;
    textLayer: TextLayer;
    iconLayer: PathLayer;

    constructor(expr: Expr.Null, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

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
    }

    getIntrinsicSize(): Vec2 {
        const iconSize = config.icons.size;
        const textSize = this.textLayer.getNaturalSize();
        return new Vec2(textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2);
    }

    layout () {
        this.needsLayout = false;
        const iconSize = config.icons.size;
        this.iconLayer.position = [4, 4];

        const textSize = this.textLayer.getNaturalSize();
        this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];
        return new Vec2(textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2);
    }

    *iterSublayers () {
        yield this.textLayer;
        yield this.iconLayer;
    }
}

class BoolExprView extends View {
    expr: Expr.Bool;
    owner: ExprViewOwner;
    textLayer: TextLayer;
    iconLayer: PathLayer;

    constructor(expr: Expr.Bool, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

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
    }

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
    }

    getIntrinsicSize(): Vec2 {
        const iconSize = config.icons.size;
        const textSize = this.textLayer.getNaturalSize();
        return new Vec2(textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2);
    }

    layout () {
        this.needsLayout = false;
        this.textLayer.text = this.expr.value ? config.primitives.true : config.primitives.false;

        const iconSize = config.icons.size;
        this.iconLayer.position = [4, 4];
        this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];

        return this.size;
    }

    *iterSublayers () {
        yield this.textLayer;
        yield this.iconLayer;
    }
}

class NumberExprView extends View {
    expr: Expr.Number;
    owner: ExprViewOwner;
    textLayer: TextLayer;
    iconLayer: PathLayer;

    constructor(expr: Expr.Number, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

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
    }

    tapAction () {
        this.ctx.beginInput(
            this.layer.absolutePosition,
            this.size,
            (this.expr.value || 0).toString(),
            { font: config.identFont },
        ).then(stringValue => {
            let value = Number.parseFloat(stringValue);
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
    }

    getIntrinsicSize(): Vec2 {
        const iconSize = config.icons.size;
        const textSize = this.textLayer.getNaturalSize();
        return new Vec2(textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2);
    }

    layout () {
        this.needsLayout = false;
        this.textLayer.text = (this.expr.value || 0).toString();

        const iconSize = config.icons.size;
        this.iconLayer.position = [4, 4];
        this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];

        return this.size;
    }

    *iterSublayers () {
        yield this.textLayer;
        yield this.iconLayer;
    }
}

class StringExprView extends View {
    expr: Expr.String;
    owner: ExprViewOwner;
    textLayers: TextLayer[] = [];
    lineHeight = 0;
    iconLayer: PathLayer;

    constructor(expr: Expr.String, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

        this.layer.cornerRadius = config.cornerRadius;
        this.layer.background = config.primitives.string;
        this.layer.stroke = config.primitives.stringOutline;
        this.layer.strokeWidth = config.primitives.outlineWeight;

        this.iconLayer = new PathLayer();
        this.iconLayer.path = config.icons.string;
        this.iconLayer.fill = config.primitives.iconColor;
    }

    tapAction () {
        this.ctx.beginInput(
            this.layer.absolutePosition,
            [this.size[0], this.size[1], this.lineHeight],
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
    }

    syncTextLayers() {
        const textLines = this.expr.value.split('\n');

        while (this.textLayers.length < textLines.length) {
            const layer = new TextLayer();
            layer.font = config.identFont;
            layer.color = config.primitives.color;
            this.textLayers.push(layer);
        }
        while (this.textLayers.length > textLines.length) {
            this.textLayers.pop();
        }

        for (let i = 0; i < textLines.length; i++) {
            const isFirst = i === 0;
            const isLast = i === textLines.length - 1;
            const layer = this.textLayers[i];
            const line = textLines[i];

            if (isFirst && isLast) {
                layer.text = `“${line}”`;
            } else if (isFirst) {
                layer.text = `“${line}`;
            } else if (isLast) {
                layer.text = `${line}”`;
            } else {
                layer.text = line;
            }
        }
    }

    getTextSize(): [Vec2, number[]] {
        const textLines = this.expr.value.split('\n');

        let maxWidth = 0;
        let height = 0;
        const heights = [];
        for (let i = 0; i < textLines.length; i++) {
            const layer = this.textLayers[i];
            const textSize = layer.getNaturalSize();
            maxWidth = Math.max(textSize[0], maxWidth);
            height += textSize[1];
            heights.push(textSize[1]);
        }

        return [new Vec2(maxWidth, height), heights];
    }

    getIntrinsicSize(): Vec2 {
        this.syncTextLayers();
        const [[width, height]] = this.getTextSize();
        const iconSize = config.icons.size;
        return new Vec2(
            width + iconSize + 4 + config.primitives.paddingX * 2,
            height + config.primitives.paddingYS * 2,
        );
    }

    layout () {
        this.needsLayout = false;
        const iconSize = config.icons.size;
        this.iconLayer.position = [4, 4];

        this.syncTextLayers();

        const [[width, height], heights] = this.getTextSize();
        this.lineHeight = height / heights.length;

        const layerHeight = height + config.primitives.paddingYS * 2;

        let y = (layerHeight - height) / 2;
        for (let i = 0; i < this.textLayers.length; i++) {
            const layer = this.textLayers[i];
            layer.position = [4 + iconSize + 4, y + heights[i] / 2];
            y += heights[i];
        }

        return new Vec2(
            width + iconSize + 4 + config.primitives.paddingX * 2,
            layerHeight,
        );

    }

    *iterSublayers () {
        for (const layer of this.textLayers) yield layer;
        yield this.iconLayer;
    }
}

class MatrixExprView extends View {
    expr: Expr.Matrix;
    owner: ExprViewOwner;
    preview: MatrixPreview;
    iconLayer: PathLayer;

    wantsChildLayout = true;

    constructor(expr: Expr.Matrix, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

        this.layer.cornerRadius = config.cornerRadius;
        this.layer.background = config.primitives.matrix;
        this.layer.stroke = config.primitives.matrixOutline;
        this.layer.strokeWidth = config.primitives.outlineWeight;

        this.preview = new MatrixPreview();

        this.iconLayer = new PathLayer();
        this.iconLayer.path = config.icons.matrix;
        this.iconLayer.fill = config.primitives.iconColor;
    }

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
    }

    getIntrinsicSize(): Vec2 {
        const iconSize = config.icons.size;

        this.preview.value = this.expr.value;
        this.preview.size = this.preview.layoutIfNeeded();

        return new Vec2(
            this.preview.size[0] + iconSize + 4 + config.primitives.paddingX * 2,
            Math.max(iconSize, this.preview.size[1]) + config.primitives.paddingYS * 2,
        );
    }

    layout () {
        this.needsLayout = false;
        const iconSize = config.icons.size;
        this.iconLayer.position = [4, 4];

        this.preview.value = this.expr.value;
        this.preview.size = this.preview.layoutIfNeeded();

        this.preview.position = [4 + iconSize + 4, (this.layer.size[1] - this.preview.size[1]) / 2];

        return this.size;
    }

    *iterSublayers () {
        yield this.iconLayer;
    }
    *iterSubviews () {
        yield this.preview;
    }
}

class ListExprView extends View {
    expr: Expr.List;
    owner: ExprViewOwner;
    label: TextLayer;
    slots: ExprSlot[] = [];

    wantsChildLayout = true;

    constructor(expr: Expr.List, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

        this.layer.cornerRadius = config.cornerRadius;
        this.layer.background = config.primitives.list;
        this.layer.stroke = config.primitives.listOutline;
        this.layer.strokeWidth = config.primitives.outlineWeight;

        this.label = new TextLayer();
        this.label.font = config.labelFont;
        this.label.text = config.primitives.listLabel;
        this.label.baseline = 'top';
        this.label.color = config.primitives.color;
    }

    syncSlots() {
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
                        this.ctx.modelCtx.notifyMutation(this.expr);
                        this.ctx.modelCtx.flushMutation();
                    };
                }, expr);
            }, this.expr.ctx));
        }

        const refOnly = this.expr.parent && (this.expr.parent as Def).flatExpr;

        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            const expr = this.expr.items[i];
            slot.refOnly = refOnly;
            slot.expr = expr;
            slot.dragController = this.owner.dragController;
        }
    }

    getIntrinsicSize(): Vec2 {
        this.syncSlots();

        let height = config.primitives.paddingY * 2;
        for (const slot of this.slots) {
            height = Math.max(height, slot.size.y);
        }
        height += config.primitives.paddingY * 2;

        const labelSize = this.label.getNaturalSize();
        const minWidth = labelSize.x + config.primitives.paddingX * 2;
        const heightTop = config.primitives.paddingY + labelSize.y;

        let width = config.primitives.paddingX;
        for (const slot of this.slots) {
            width += slot.size.x + config.primitives.paddingX;
        }

        return new Vec2(Math.max(minWidth, width), height + heightTop);
    }

    layout () {
        this.needsLayout = false;
        let width = config.primitives.paddingX;
        let height = 0;

        this.syncSlots();

        for (const slot of this.slots) {
            height = Math.max(height, slot.size.y);
        }
        height += config.primitives.paddingY * 2;

        const labelSize = this.label.getNaturalSize();
        const heightTop = config.primitives.paddingY + labelSize.y;

        this.label.position = [config.primitives.paddingX, config.primitives.paddingY];

        for (let i = 0; i < this.slots.length; i++) {
            const slot = this.slots[i];
            slot.size = slot.getIntrinsicSize();
            slot.layout();
            slot.position = [
                width,
                heightTop + (height - slot.size[1]) / 2,
            ];
            width += slot.size.x;
            width += config.primitives.paddingX;
        }

        const minWidth = labelSize.x + config.primitives.paddingX * 2;
        if (width < minWidth) width = minWidth;

        return new Vec2(width, height + heightTop);
    }

    *iterSublayers () {
        yield this.label;
    }
    *iterSubviews () {
        for (const slot of this.slots) yield slot;
    }
}

class CallExprView extends View {
    expr: Expr.Call;
    owner: ExprViewOwner;
    nameLayer: TextLayer;
    trueNameLayer: TextLayer;
    argSlots: ExprSlot[] = [];
    argLabels: TextLayer[] = [];
    peekView: PeekView;

    wantsChildLayout = true;

    isInfix = false;

    constructor(expr: Expr.Call, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

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

        this.peekView = new PeekView();
    }

    getParamsAndSlots(): [string[], (ExprSlotSpec | null)[]] {
        const refNode: Def | undefined = (this.expr.func as any).refNode;

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

        return [params, slots];
    }

    syncSlots() {
        const [params, slots] = this.getParamsAndSlots();

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
                    expr.ctx.notifyMutation(this.expr);
                    expr.ctx.flushMutation();

                    return () => {
                        this.expr.args[index] = prevArg;
                        expr.parent = prevParent;
                        expr.ctx.startMutation();
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

        const refNode: Def | undefined = (this.expr.func as any).refNode;
        let funcName: string | undefined = (this.expr.func as any).name;
        let trueName = null;

        if (refNode && refNode.type === 'ds' && refNode.nameOverride) {
            if (refNode.nameOverride !== funcName) trueName = funcName;
            funcName = refNode.nameOverride;
        }

        this.nameLayer.text = funcName;
        this.trueNameLayer.text = trueName ? trueName : '';

        const refOnly = this.expr.parent && (this.expr.parent as Def).flatExpr;
        for (let i = 0; i < this.argSlots.length; i++) {
            const arg = this.expr.args[i] || null;
            const slot = this.argSlots[i];
            const label = this.argLabels[i];

            label.text = params[i];

            slot.refOnly = refOnly;
            slot.expr = arg;
            slot.exprCtx = this.expr.ctx;
            slot.spec = slots[i];
            slot.dragController = this.owner.dragController;
        }
    }

    getIntrinsicSize(): Vec2 {
        this.syncSlots();

        const displayNameSize = this.nameLayer.getNaturalSize();
        const trueNameSize = this.trueNameLayer.getNaturalSize();
        const nameSize = displayNameSize.clone();
        nameSize.x = Math.max(nameSize.x, trueNameSize.x);

        let width = nameSize.x + config.primitives.paddingX * 2;
        let height = nameSize.y + trueNameSize.y;

        let labelHeight = 0;
        for (let i = 0; i < this.argSlots.length; i++) {
            const slot = this.argSlots[i];
            const label = this.argLabels[i];

            const slotSize = slot.getIntrinsicSize();
            const labelSize = label.getNaturalSize();
            labelHeight = Math.max(labelHeight, labelSize.y);

            width += config.primitives.paddingX;
            width += this.isInfix ? slotSize.x : Math.max(slotSize.x, labelSize.x);
            height = Math.max(height, slotSize.y);
        }

        height += config.primitives.paddingY * 2;
        if (!this.isInfix) {
            height += labelHeight + config.primitives.paddingY;
        }

        return new Vec2(width, height);
    }

    layout () {
        this.needsLayout = false;
        this.syncSlots();

        const displayNameSize = this.nameLayer.getNaturalSize();
        const trueNameSize = this.trueNameLayer.getNaturalSize();
        const nameSize = displayNameSize.clone();
        nameSize.x = Math.max(nameSize.x, trueNameSize.x);

        let height = nameSize.y + trueNameSize.y;

        for (let i = 0; i < this.argSlots.length; i++) {
            const slot = this.argSlots[i];
            slot.size = slot.getIntrinsicSize();
            height = Math.max(height, slot.size.y);
        }

        height += config.primitives.paddingY * 2;

        let width = 0;
        if (!this.isInfix) {
            width += config.primitives.paddingX;
            this.nameLayer.position = [width, height / 2];
            this.trueNameLayer.position = [width + (nameSize.x - trueNameSize.x) / 2, height / 2 + nameSize.y - 2];
            width += nameSize.x;
        }

        let labelHeight = 0;

        for (let i = 0; i < this.argSlots.length; i++) {
            const slot = this.argSlots[i];
            const label = this.argLabels[i];
            const labelSize = label.getNaturalSize();
            labelHeight = labelSize.y;

            width += config.primitives.paddingX;

            slot.size = slot.layoutIfNeeded();
            const itemWidth = this.isInfix ? slot.size.x : Math.max(slot.size.x, labelSize.x);

            slot.layout();
            slot.position = [width + (itemWidth - slot.size.x) / 2, (height - slot.size.y) / 2];
            label.position = [width + itemWidth / 2, height];

            width += itemWidth;

            if (this.isInfix && i === 0) {
                width += config.primitives.paddingX;
                this.nameLayer.position = [width + (nameSize.x - displayNameSize.x) / 2, height / 2];
                this.trueNameLayer.position = [width + (nameSize.x - trueNameSize.x) / 2, height / 2 + nameSize[1] - 2];
                width += nameSize.x;
            }
        }

        if (!this.isInfix) {
            height += labelHeight + config.primitives.paddingY;
        }
        width += config.primitives.paddingX;

        this.peekView.position = [0, 0];
        this.peekView.size = this.size;

        return new Vec2(width, height);
    }
    *iterSublayers () {
        yield this.nameLayer;
        yield this.trueNameLayer;
        if (!this.isInfix) {
            for (const label of this.argLabels) yield label;
        }
    }
    *iterSubviews () {
        for (const slot of this.argSlots) yield slot;
        if (!this.owner.isInert) yield this.peekView;
    }
    onPointerEnter () {
        if (!this.ctx.isInTestMode) return;

        const result = evalExpr(this.expr);
        if (!result) return;

        const t = new Transaction(1, 0.2);
        this.layer.strokeWidth = config.primitives.hoverOutlineWeight;
        this.layer.stroke = config.primitives.callHoverOutline;
        t.commit();

        this.peekView.value = result.result;
        this.peekView.analysis = result.analysis;
        this.peekView.visible = true;
    }
    onDragStart () {
        this.peekView.visible = false;
    }
    onPointerExit () {
        const t = new Transaction(1, 0.2);
        this.layer.strokeWidth = config.primitives.outlineWeight;
        this.layer.stroke = config.primitives.callOutline;
        t.commit();
        this.peekView.visible = false;
    }
}

class FnDefExprView extends View {
    expr: Expr.FnDef;
    owner: ExprViewOwner;
    textLayer: TextLayer;

    constructor(expr: Expr.FnDef, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

        this.layer.cornerRadius = config.cornerRadius;
        this.layer.background = config.primitives.func;
        this.layer.stroke = config.primitives.funcOutline;
        this.layer.strokeWidth = config.primitives.outlineWeight;
        this.textLayer = new TextLayer();
        this.textLayer.font = config.identFont;
        this.textLayer.color = config.primitives.color;
    }

    syncContents() {
        this.textLayer.text = config.primitives.functionLabel + '(' + this.expr.params.join(', ') + ') …';
    }

    getIntrinsicSize(): Vec2 {
        const textSize = this.textLayer.getNaturalSize();
        return new Vec2(textSize.x + 16, textSize.y + 4);
    }

    layout () {
        this.needsLayout = false;
        this.syncContents();
        this.textLayer.position = [8, this.layer.size.y / 2];
        return this.size;
    }
    tapAction () {
        // TODO: edit function
    }
    *iterSublayers () {
        yield this.textLayer;
    }
}

class SwitchExprView extends View {
    expr: Expr.Switch;
    owner: ExprViewOwner;
    textLayer: TextLayer;
    cases: SwitchCases;

    wantsChildLayout = true;

    constructor(expr: Expr.Switch, owner: ExprViewOwner) {
        super();
        this.expr = expr;
        this.owner = owner;

        this.layer.cornerRadius = config.cornerRadius;
        this.layer.background = config.primitives.switch;
        this.layer.stroke = config.primitives.switchOutline;
        this.layer.strokeWidth = config.primitives.outlineWeight;
        this.textLayer = new TextLayer();
        this.textLayer.font = config.identFont;
        this.textLayer.color = config.primitives.color;
        this.textLayer.text = config.primitives.switchLabel;

        this.cases = new SwitchCases(this);
    }

    getIntrinsicSize(): Vec2 {
        const { paddingX, paddingY } = config.primitives;
        const textSize = this.textLayer.getNaturalSize();
        const casesSize = this.cases.getIntrinsicSize();

        const width = Math.max(textSize.x, casesSize.x) + paddingX * 2;
        const height = paddingY + textSize.y + paddingY + casesSize.y + paddingY;

        return new Vec2(width, height);
    }

    layout () {
        this.needsLayout = false;
        const { paddingX, paddingY } = config.primitives;
        const textSize = this.textLayer.getNaturalSize();
        this.textLayer.position = [paddingX, paddingY + textSize[1] / 2];

        this.cases.dragController = this.owner.dragController;
        this.cases.layout();

        this.cases.position = [paddingX, paddingY + textSize[1] + paddingY];

        const width = Math.max(textSize[0], this.cases.size[0]) + paddingX * 2;
        const height = paddingY + textSize[1] + paddingY + this.cases.size[1] + paddingY;

        return new Vec2(width, height);
    }
    *iterSublayers () {
        yield this.textLayer;
    }
    *iterSubviews () {
        yield this.cases;
    }
}

/** view only! */
class TimestampExprView extends View {
    expr: { value: Date };
    textLayer: TextLayer;
    iconLayer: PathLayer;

    constructor(expr: { value: Date }) {
        super();
        this.expr = expr;
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
    }

    getIntrinsicSize(): Vec2 {
        const textSize = this.textLayer.getNaturalSize();
        const iconSize = config.icons.size;
        return new Vec2(
            textSize.x + iconSize + 4 + config.primitives.paddingX * 2,
            textSize.y + config.primitives.paddingYS * 2,
        );
    }

    layout () {
        this.needsLayout = false;
        this.textLayer.text = stdlib.ts_fmt.apply(null, [this.expr.value]);

        const iconSize = config.icons.size;
        this.iconLayer.position = [4, 4];

        const textSize = this.textLayer.getNaturalSize();
        this.textLayer.position = [4 + iconSize + 4, this.layer.size[1] / 2];

        return new Vec2(textSize[0] + iconSize + 4 + config.primitives.paddingX * 2, textSize[1] + config.primitives.paddingYS * 2);
    }

    *iterSublayers () {
        yield this.textLayer;
        yield this.iconLayer;
    }
}

class SwitchCases extends View {
    exprView: SwitchExprView;
    matchViews: SwitchMatch[];
    dragController: DragController | null = null;

    wantsChildLayout = true;

    constructor (exprView: SwitchExprView) {
        super();
        this.exprView = exprView;
        this.matchViews = [];
    }
    get expr () {
        return this.exprView.expr;
    }

    getIntrinsicSize(): Vec2 {
        const { paddingY } = config.primitives;

        let maxWidth = 0;
        let y = 0;
        for (let i = 0; i < this.matchViews.length; i++) {
            const matchView = this.matchViews[i];
            const viewSize = matchView.getIntrinsicSize();
            maxWidth = Math.max(maxWidth, viewSize.x);
            y += (y ? paddingY : 0) + viewSize.y;
        }

        return new Vec2(maxWidth, y);
    }

    layout () {
        this.needsLayout = false;

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
            this.matchViews[i].size = this.matchViews[i].layout();
        }

        while (this.matchViews.length > this.expr.matches.length) this.matchViews.pop();

        const { paddingY } = config.primitives;

        let maxWidth = 0;
        let y = 0;
        for (let i = 0; i < this.matchViews.length; i++) {
            const matchView = this.matchViews[i];
            matchView.position = [0, y];
            maxWidth = Math.max(maxWidth, matchView.size.x);
            y += (y ? paddingY : 0) + matchView.size.y;
        }

        return new Vec2(maxWidth, y);
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

    update() {
        const refOnly = this.expr.parent && (this.expr.parent as Def).flatExpr;

        this.cond.refOnly = this.value.refOnly = refOnly;
        this.cond.exprCtx = this.value.exprCtx = this.expr.ctx;
        this.cond.expr = this.match.cond;
        this.value.expr = this.match.value;
    }

    getIntrinsicSize(): Vec2 {
        const { paddingX, paddingY } = config.primitives;
        this.update();

        const condSize = this.cond.getIntrinsicSize();
        const valueSize = this.value.getIntrinsicSize();

        const height = Math.max(condSize.y, valueSize.y) + paddingY * 2;

        let width = condSize.x + paddingX + valueSize.x;
        if (this.match.cond) {
            width += this.ifLabel.getNaturalSize().x + paddingX;
            width += this.thenLabel.getNaturalSize().x + paddingX;
        }

        return new Vec2(width, height);
    }

    layout () {
        this.needsLayout = false;
        this.update();

        this.cond.dragController = this.value.dragController = this.dragController;

        this.cond.size = this.cond.getIntrinsicSize();
        this.value.size = this.value.getIntrinsicSize();
        this.cond.layout();
        this.value.layout();

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

        return new Vec2(width, height);
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

    getIntrinsicSize(): Vec2 {
        const { paddingX, paddingYS } = config.primitives;
        const labelSize = this.label.getNaturalSize();
        return new Vec2(paddingX * 2 + labelSize.x, paddingYS * 2 + labelSize.y);
    }

    layout () {
        this.needsLayout = false;
        const { paddingX } = config.primitives;
        this.label.position = [paddingX, this.size.y / 2];
        return this.size;
    }
    *iterSublayers () {
        yield this.label;
    }
}

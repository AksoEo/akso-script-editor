import { View, Layer, TextLayer, PathLayer, ArrowLayer, Transaction, Gesture } from './ui';
import { viewPool, getProtoView } from './proto-pool';
import config from './config';
import { ExprSlot, ExprView } from './expr-view';
import { ValueView } from './value-view';
import {
    AscContext,
    cloneWithContext,
    Def,
    Defs,
    evalExpr,
    Expr,
    remove as removeNode,
} from './model';
import { DragController, IExprDragController } from './drag-controller';
import { HelpTagged } from './help/help-tag';
import { Vec2 } from './spring';
import { ScrollView } from './scroll-view';
import { FlexMainAlignOffset } from './ui/layout';

/// Renders a set of definitions.
export class DefsView extends View {
    scrollView = new ScrollView();
    innerDefs: InnerDefsView = new InnerDefsView(this);
    dragController = new DragController(this);
    defs: Defs;
    needsValueUpdate: boolean;
    trash: Trash;
    addDefView: AddDefView;

    isInRawExprMode = false;
    rawExprView: StandaloneExprView | null = null;
    rawExprScreenSpaceLocation: [number, number] | null = null;

    constructor (defs: Defs) {
        super();

        this.layer.background = config.defs.background;
        this.layoutProps.flexGrow = 1;

        this.defs = defs;

        this.trash = new Trash();
        this.trash.dragController = this.dragController;

        this.addDefView = new AddDefView(this.addDef);

        this.needsValueUpdate = true;

        this.scrollView.scrollX = true;
        this.scrollView.stretchX = true;

        this.addSubview(this.scrollView);
        this.addSubview(this.trash);
        this.scrollView.contentView.addSubview(this.innerDefs);
    }

    setRawExprMode (options) {
        this.isInRawExprMode = true;
        this.layer.background = [0, 0, 0, 0.2];
        this.addDefView = null;
        this.rawExprView = new StandaloneExprView(this.defs.ctx, this.dragController);
        this.innerDefs.addSubview(this.rawExprView);

        if (options.onClose) Gesture.onTap(this, options.onClose);
        if (options.location) {
            this.rawExprScreenSpaceLocation = options.location;
        }
    }

    updateValues () {
        this.needsValueUpdate = false;
        for (const def of this.defs.defs) {
            const defView = getProtoView(def, DefView);
            defView.updateValue();
        }
    }

    addDef = () => {
        const newDef: Def = {
            ctx: this.defs.ctx,
            type: 'ds',
            name: config.defs.newDefName(this.defs.defs.size),
            expr: null,
            parent: this.defs,
        };

        const newDefView = getProtoView(newDef, DefView);
        newDefView.position = this.addDefView.position;
        newDefView.size = this.addDefView.size;
        newDefView.layout();
        newDefView.size.y = 0;

        const t = new Transaction(1, 0.3);

        this.defs.defs.add(newDef);
        this.defs.ctx.notifyMutation(this.defs);

        this.innerDefs.flushSubviews();
        this.innerDefs.syncSubnodes();

        t.commitAfterLayout(this.ctx);
    };

    #showTrash = false;
    get showTrash () {
        return this.#showTrash;
    }
    set showTrash (value) {
        this.#showTrash = value;
        this.needsLayout = true;
    }

    leftTrash = false;
    _wasLeftTrash = false;
    leftTrashWidth = 0;

    getIntrinsicSize(): Vec2 {
        this.innerDefs.defs = this.defs;
        this.innerDefs.flushSubviews();

        return this.scrollView.getIntrinsicSize();
    }

    layout(): Vec2 {
        this.needsLayout = false;

        if (this.needsValueUpdate) this.updateValues();

        let t;
        if (this.leftTrash !== this._wasLeftTrash) t = new Transaction(1, 0);
        else t = new Transaction(1, 0.3);
        this._wasLeftTrash = this.leftTrash;
        if (this.leftTrash) {
            this.trash.size = [
                this.leftTrashWidth,
                this.size[1],
            ];
            this.trash.position = [-this.trash.size[0], 0];
        } else {
            this.trash.size = [
                186,
                Math.min(this.size[1] * 0.5, 100),
            ];
            this.trash.position = [
                8,
                this.showTrash
                    ? this.size[1] - this.trash.size[1] - 8
                    : this.size[1],
            ];
            this.trash.layer.opacity = 1;
        }
        this.trash.isLeftTrash = this.leftTrash;
        this.trash.shouldShow = this.showTrash;
        this.trash.decorationOnly = !this.showTrash;
        this.trash.layout();
        t.commit();

        for (const item of this.defs.defs) {
            const itemView = getProtoView(item, DefView);
            itemView.dragController = this.dragController;
        }

        this.innerDefs.defs = this.defs;
        this.innerDefs.addDefView = this.addDefView;
        this.innerDefs.flushSubviews();

        if (this.isInRawExprMode) {
            this.rawExprView.layoutIfNeeded();
            if (this.rawExprScreenSpaceLocation) {
                const ssl = this.rawExprScreenSpaceLocation;
                const ownLocation = this.layer.absolutePosition;
                const pos = new Vec2(ssl[0] - ownLocation[0], ssl[1] - ownLocation[1]);

                pos.x = Math.max(0, pos.x);
                pos.y = Math.max(0, pos.y);
                pos.x = Math.min(pos.x, this.size.x - this.rawExprView.size.x);
                pos.y = Math.min(pos.y, this.size.y - this.rawExprView.size.y);

                this.innerDefs.position = pos;
            }
        } else {
            this.scrollView.size = this.size;
            this.scrollView.layout();
        }

        return this.size;
    }

    tentativeDef: [number, number] | null = null;
    tentativeInsertPos: number | null = null;

    addFloatingExpr (expr: Expr.Any) {
        this.defs.floatingExpr.add(expr);
        this.defs.ctx.notifyMutation(this.defs);

        const view = getProtoView(expr, ExprView);

        this.addSubview(view);
        this.flushSubviews();

        view.size = view.getIntrinsicSize();
        view.layout();
    }
    removeFloatingExpr (expr: Expr.Any) {
        this.defs.floatingExpr.delete(expr);
        this.removeSubview(getProtoView(expr, ExprView));
        this.defs.ctx.notifyMutation(this.defs);
    }

    putTentative (y: number, height: number) {
        this.tentativeDef = [y, height];
        this.needsLayout = true;
        this.innerDefs.needsLayout = true;
    }
    endTentative (def?: Def) {
        if (def && this.tentativeInsertPos !== null) {
            const defs = [...this.defs.defs];
            defs.splice(this.tentativeInsertPos, 0, def);
            this.defs.defs = new Set(defs);
            def.parent = this.defs;
            this.defs.ctx.notifyMutation(def);
            this.defs.ctx.notifyMutation(this.defs);
        }
        this.tentativeDef = null;
        this.needsLayout = true;
        this.innerDefs.needsLayout = true;
    }
}

class InnerDefsView extends View {
    defs: Defs = { defs: [] } as any; // close enough for our purposes
    floatingExpr = [];
    addDefView: AddDefView | null = null;
    owner: DefsView;

    constructor(owner: DefsView) {
        super();
        this.owner = owner;
        this.layoutProps.padding = new Vec2(config.defs.padding, config.defs.padding);
        this.layoutProps.gap = config.defs.gap;
    }

    getIntrinsicSize(): Vec2 {
        let maxWidth = 0;
        let y = 0;

        let i = 0;
        for (const def of this.defs.defs) {
            const index = i++;
            const defView = getProtoView(def, DefView);
            const defSize = defView.getIntrinsicSize();

            maxWidth = Math.max(maxWidth, defSize.x);
            if (index) y += this.layoutProps.gap;
            y += defSize.y;
        }

        if (this.addDefView) {
            y += this.addDefView.getIntrinsicSize().y;
        }

        if (this.owner.tentativeDef) {
            y += this.owner.tentativeDef[1];
        }

        y += 24;

        return new Vec2(
            maxWidth + this.layoutProps.padding.x * 2,
            y + this.layoutProps.padding.y * 2,
        );
    }

    layout() {
        this.needsLayout = false;
        const defSizes = new Map<DefView, Vec2>();
        let maxWidth = this.size.x - this.layoutProps.padding.x * 2;

        for (const def of this.defs.defs) {
            const defView = getProtoView(def, DefView);
            const defSize = defView.getIntrinsicSize();
            defSizes.set(defView, defSize);
            maxWidth = Math.max(maxWidth, defSize.x);
        }

        let y = this.layoutProps.padding.y;
        let i = 0;
        this.owner.tentativeInsertPos = null;

        for (const def of this.defs.defs) {
            const index = i++;
            const defView = getProtoView(def, DefView);

            if (defView._isBeingDragged) continue;

            if (this.owner.tentativeDef) {
                const [ty, theight] = this.owner.tentativeDef;
                const py = ty + theight / 2;
                if (y <= py && y + defSizes.get(defView)!.y + this.layoutProps.gap >= py) {
                    y += theight + this.layoutProps.gap;
                    this.owner.tentativeInsertPos = index;
                }
            }

            defView.size = [maxWidth, defSizes.get(defView)!.y];
            defView.position = [this.layoutProps.padding.x, y];
            defView.layout();
            y += defView.size.y + this.layoutProps.gap;
        }

        if (this.addDefView) {
            this.addDefView.size = [maxWidth, this.addDefView.getIntrinsicSize().y];
            this.addDefView.position = [this.layoutProps.padding.x, y];
            this.addDefView.layout();
        }

        if (this.owner.tentativeDef && this.owner.tentativeInsertPos === null) {
            // did not find an insertion point; probably because it’s out of bounds
            this.owner.tentativeInsertPos = this.defs.defs.size;
        }

        return this.size;
    }

    *iterSubviews () {
        for (const item of this.defs.defs) {
            yield getProtoView(item, DefView);
        }
        if (this.addDefView) yield this.addDefView;
        for (const expr of this.floatingExpr) yield getProtoView(expr, ExprView);
    }
}

/// Contains a standalone expression. Used for raw expr mode.
class StandaloneExprView extends View {
    wantsChildLayout = true;
    def: Def;
    dragController: DragController | null = null;
    exprSlot: ExprSlot;
    constructor (modelCtx: AscContext, dragController: DragController) {
        super();

        this.def = {
            type: 'ds',
            ctx: modelCtx,
            expr: null,
            name: 'standalone expression',
            parent: null,
            flatExpr: true,
        };
        viewPool.set(this.def, this);

        this.dragController = dragController;
        this.exprSlot = new ExprSlot(expr => {
            const prevExpr = this.def.expr;
            const prevParent = expr.parent;

            this.ctx.history.commitChange('slot-insert-expr', () => {
                this.def.expr = expr;
                expr.parent = this.def;
                this.def.ctx.notifyMutation(expr);
                this.def.ctx.notifyMutation(this.def);

                return () => {
                    this.def.expr = prevExpr;
                    expr.parent = prevParent;
                    this.def.ctx.notifyMutation(expr);
                    this.def.ctx.notifyMutation(this.def);
                };
            }, expr);
        }, this.def.ctx);
        this.addSubview(this.exprSlot);
        this.needsLayout = true;

        // dummy to prevent DefsView tap handler from being called
        Gesture.onTap(this, () => {});
    }

    get expr () {
        return this.def.expr;
    }
    set expr (e) {
        this.exprSlot.insertExpr(e);
    }

    layout () {
        super.layout();

        this.exprSlot.expr = this.def.expr;
        this.exprSlot.exprCtx = this.def.ctx;
        this.exprSlot.dragController = this.dragController;
        this.exprSlot.layoutIfNeeded();
        this.layer.background = config.def.background;
        this.layer.cornerRadius = config.def.cornerRadius;
        this.exprSlot.position = [config.def.padding, config.def.padding];
        return new Vec2(
            this.exprSlot.size[0] + config.def.padding * 2,
            this.exprSlot.size[1] + config.def.padding * 2,
        );
    }
}

/// Renders a single definition.
export class DefView extends View implements IExprDragController {
    wantsChildLayout = true;
    def: Def;
    refView: ExprView;
    exprSlot: ExprSlot;
    valueView: DefValueView;
    dragController: DragController | null = null;
    _isBeingDragged = false;

    static LIST_MAIN_ALIGN: FlexMainAlignOffset = {
        subviewIndex: 2,
        alignToOffset: config.lhsAlignWidth,
    };

    constructor (def: Def) {
        super();

        this.def = def;

        this.layoutProps.layout = 'flex';
        this.layoutProps.padding = new Vec2(config.def.padding, config.def.padding);
        this.layoutProps.gap = 8;
        this.layoutProps.crossAlign = 'center';

        this.refView = new ExprView({
            ctx: def.ctx,
            parent: null,
            type: 'r',
            name: '',
        });
        this.refView.isDef = true;
        this.refView.onDefRename = this.onRename;
        this.refView.dragController = this;

        this.layer.background = config.def.background;
        this.layer.cornerRadius = config.def.listCornerRadius;

        this.exprSlot = new ExprSlot(expr => {
            const prevExpr = this.def.expr;
            const prevParent = expr.parent;

            this.ctx.history.commitChange('slot-insert-expr', () => {
                this.def.expr = expr;
                expr.parent = this.def;
                this.def.ctx.notifyMutation(expr);
                this.def.ctx.notifyMutation(this.def);

                return () => {
                    this.def.expr = prevExpr;
                    expr.parent = prevParent;
                    this.def.ctx.notifyMutation(expr);
                    this.def.ctx.notifyMutation(this.def);
                };
            }, expr);
        }, this.def.ctx);

        this.valueView = new DefValueView();

        this.addSubview(this.refView);
        this.addSubview(new DefEqualsView());
        this.addSubview(this.exprSlot);
        this.addSubview(this.valueView);

        this.needsLayout = true;

        Gesture.onTap(this, this.onTap);
        Gesture.onDrag(this, this.onDragMove, this.onDragStart, this.onDragEnd, this.onDragCancel);
    }

    cachedValue = undefined;
    cachedLoading = true;
    cachedError = false;
    updateValue () {
        this.cachedLoading = false;
        this.cachedError = false;
        // do we want a preview value?
        const result = evalExpr(this.def.expr);
        if (!result) {
            this.cachedValue = undefined;
            this.cachedError = true;
            return;
        }

        // we always want a preview if it's an error
        let wantPreview = !result.analysis.valid;
        if (!wantPreview && this.def.expr && this.ctx?.isInTestMode) {
            const previewTypes = ['c', 'r', 'l', 'w'];
            if (previewTypes.includes(this.def.expr.type)) wantPreview = true;
        }
        if (!wantPreview) {
            this.cachedValue = undefined;
            return;
        }
        if (!result.analysis.valid) {
            this.cachedValue = undefined;
            this.cachedError = true;
            return;
        }
        this.cachedValue = result.result;
    }

    onTap = () => {
        if (this.ctx.isInDupMode) {
            const dupDef = cloneWithContext(this.def, this.def.ctx) as Def;
            {
                const trailingNumber = dupDef.name.match(/(\d+)$/);
                if (trailingNumber) {
                    dupDef.name = dupDef.name.substring(0, trailingNumber.index) + (+trailingNumber[1] + 1);
                } else {
                    dupDef.name += ' 2';
                }
            }
            const defs = (this.def.parent as Defs);
            dupDef.parent = defs;
            const defsList = [...defs.defs];
            defsList.splice(defsList.indexOf(this.def) + 1, 0, dupDef);
            defs.defs = new Set(defsList);
            defs.ctx.notifyMutation(defs);
            new Transaction(1, 0.3).commitAfterLayout(this.ctx);
        }
    };

    onDragStart = ({ absX, absY }) => {
        if (this.ctx.isInDupMode) {
            const dupDef = cloneWithContext(this.def, this.def.ctx) as Def;
            {
                const trailingNumber = dupDef.name.match(/(\d+)$/);
                if (trailingNumber) {
                    dupDef.name = dupDef.name.substring(0, trailingNumber.index) + (+trailingNumber[1] + 1);
                } else {
                    dupDef.name += ' 2';
                }
            }
            const defs = (this.def.parent as Defs);
            dupDef.parent = defs;
            const defsList = [...defs.defs];
            defsList.splice(defsList.indexOf(this.def) + 1, 0, dupDef);
            defs.defs = new Set(defsList);
            defs.ctx.notifyMutation(defs);
            const dupView = getProtoView(dupDef, DefView);
            dupView.position = this.position;
            dupView.size = this.size;

            this.parent.layout();

            this.dragController.beginDefDrag(dupDef, absX, absY);
            return;
        }

        this.dragController.beginDefDrag(this.def, absX, absY);
    };
    onDragMove = ({ absX, absY }) => {
        this.dragController.moveDefDrag(absX, absY);
    };
    onDragEnd = () => {
        this.dragController.endDefDrag();
    };
    onDragCancel = () => {
        // TODO: proper handling
        this.onDragEnd();
    };

    // fake dragcontroller interface for the left hand side
    // FIXME: can the drag detection stuff be removed?
    #dragStartPos = [0, 0];
    #createdDragRef = false;
    beginExprDrag (expr: Expr.Any, x: number, y: number) {
        this.#dragStartPos = [x, y];
        this.#createdDragRef = false;
    }
    createDragRef (x: number, y: number) {
        const ref: Expr.Ref = { ctx: this.def.ctx, parent: null, type: 'r', name: this.def.name };
        const refView = getProtoView(ref, ExprView);
        const transaction = new Transaction(1, 0);
        refView.dragController = this.dragController;
        const refPos = this.refView.absolutePosition;
        const defsPos = this.dragController.defs.absolutePosition;
        refView.position = [refPos[0] - defsPos[0], refPos[1] - defsPos[1]];

        this.ctx.history.commitChange('create-def-ref', () => {
            this.dragController.defs.addFloatingExpr(ref);
            return () => {
                this.dragController.defs.removeFloatingExpr(ref);
            };
        }, ref);
        this.dragController.beginExprDrag(ref, x, y);
        transaction.commit();
    }
    moveExprDrag (x: number, y: number) {
        if (this.#createdDragRef) {
            this.dragController.moveExprDrag(x, y);
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
            this.dragController.endExprDrag();
        }
    }
    cancelExprDrag () {
        if (this.#createdDragRef) {
            this.dragController.cancelExprDrag();
        }
    }

    onRename = (name: string) => {
        if (name === this.def.name) return; // nothing to do
        if (name.startsWith('@') || name.startsWith('_')) {
            // TODO: handle better
            alert('illegal identifier');
            return;
        }

        let isDup = false;
        for (const category in config.stdlibCategories) {
            if (config.stdlibCategories[category].includes(name)) {
                isDup = true;
                break;
            }
        }

        if (this.def.parent && !isDup) {
            const defs = this.def.parent as Defs;
            for (const def of defs.defs) {
                if (def.name === name) {
                    isDup = true;
                    break;
                }
            }
        }
        if (isDup) {
            // TODO: handle better
            alert('duplicate identifier');
            return;
        }

        this.def.name = name;

        const refSources = new Set();
        for (const ref of this.def.referencedBy) {
            refSources.add(ref.source);
            if (ref.source.type === 'r') {
                ref.source.name = this.def.name;
            } else if (ref.source.type === 'c' && ref.source.func.type === 'r') {
                ref.source.func.name = this.def.name;
            } else {
                console.warn(`Failed to rename to ${name} in ref with type ${ref.source.type}`);
            }
            ref.source.ctx.notifyMutation(ref.source);
        }

        this.def.ctx.notifyMutation(this.def);

        setTimeout(() => {
            // a bit hacky: wait for refs to update
            // refs have now updated; do we have any new ones?
            for (const ref of this.def.referencedBy) {
                if (!refSources.has(ref.source)) {
                    // they need updating too
                    ref.source.ctx.notifyMutation(ref.source);
                }
            }
        }, 10);

        new Transaction(1, 0.3).commitAfterLayout(this.ctx);
    };

    sync() {
        (this.refView.expr as Expr.Ref).name = this.def.name;
        this.exprSlot.expr = this.def.expr;
        this.exprSlot.exprCtx = this.def.ctx;
        this.exprSlot.dragController = this.dragController;

        this.valueView.loading = this.cachedLoading;
        this.valueView.value = this.cachedValue;
        this.valueView.error = this.cachedError;
        this.valueView.hidden = !this.cachedError && this.cachedValue === undefined;

        if (this.parent instanceof InnerDefsView || this._isBeingDragged) {
            this.layoutProps.mainAlign = DefView.LIST_MAIN_ALIGN;
        } else {
            this.layoutProps.mainAlign = 'center';
        }
    }

    getIntrinsicSize(): Vec2 {
        this.sync();
        return super.getIntrinsicSize();
    }

    layout(): Vec2 {
        this.sync();
        return super.layout();
    }
}

class DefEqualsView extends View {
    label = new TextLayer();
    constructor() {
        super();
        this.label.text = '=';
        this.label.font = config.identFont;
        this.addSublayer(this.label);
    }
    getIntrinsicSize(): Vec2 {
        return this.label.getNaturalSize();
    }
    layout(): Vec2 {
        this.needsLayout = false;
        this.label.position = [0, this.size.y / 2];
        return this.size;
    }
}

class DefValueView extends View implements HelpTagged {
    arrowLayer: ArrowLayer;
    inner: ValueView;
    loading = false;

    helpHidden = true;

    constructor () {
        super();
        this.layer.cornerRadius = config.cornerRadius + 6;
        this.layer.background = config.peek.background;
        this.arrowLayer = new ArrowLayer();
        this.arrowLayer.stroke = config.peek.background;
        this.arrowLayer.arrowSize = 8;
        this.arrowLayer.strokeWidth = 4;
        this.addSublayer(this.arrowLayer);

        this.inner = new ValueView();
        this.addSubview(this.inner);
        this.needsLayout = true;
    }
    wantsChildLayout = true;
    get value () {
        return this.inner.value;
    }
    set value (v) {
        this.inner.value = v;
    }
    get error () {
        return this.inner.error;
    }
    set error (v) {
        this.inner.error = v;
    }
    hidden = false;

    getIntrinsicSize(): Vec2 {
        if (this.hidden) return Vec2.zero();

        const innerSize = this.inner.getIntrinsicSize();
        return new Vec2(innerSize.x + 12, innerSize.y + 12);
    }

    layout () {
        super.layout();
        this.inner.size = new Vec2(this.size.x - 12, this.size.y - 12);
        this.inner.layout();

        let ownSize = Vec2.zero();
        if (this.inner.size[0] && !this.hidden) {
            // non-zero size means it has a value
            ownSize = new Vec2(
                this.inner.size[0] + 12,
                this.inner.size[1] + 12,
            );
        }

        this.inner.position = [6, 6];
        this.layer.opacity = this.hidden ? 0 : 1;

        this.arrowLayer.start = [0, ownSize[1] / 2];
        this.arrowLayer.control1 = this.arrowLayer.start;
        this.arrowLayer.end = [ownSize[0] ? -10 : 0, ownSize[1] / 2];
        this.arrowLayer.control2 = this.arrowLayer.end;

        return ownSize;
    }
}

class AddDefView extends View {
    onAdd: () => void;
    label: TextLayer;
    parentWidth = 0;

    constructor (onAdd: () => void) {
        super();
        this.onAdd = onAdd;
        this.layer.background = config.def.background;
        this.layer.cornerRadius = config.def.listCornerRadius;
        this.label = new TextLayer();
        this.label.font = config.identFont;
        this.label.text = '+';
        this.label.align = 'center';
        this.needsLayout = true;

        Gesture.onTap(this, this.onAdd);
    }

    getIntrinsicSize(): Vec2 {
        return new Vec2(this.parentWidth, 32);
    }

    layout () {
        this.needsLayout = false;
        this.label.position = [this.layer.size[0] / 2, this.layer.size[1] / 2];
        return this.size;
    }

    *iterSublayers () {
        yield this.label;
    }
}

export class Trash extends View {
    titleLayer: TextLayer;
    dragController: DragController | null = null;
    active = false;
    isLeftTrash = false;
    shouldShow = false;
    decorationOnly = false;

    iconLayer: Layer;
    canLayer: Layer;
    canRectLayer: PathLayer;
    canLinesLayer: PathLayer;
    lidLayer: Layer;
    lidRectLayer: PathLayer;
    lidHandleLayer: PathLayer;

    constructor () {
        super();

        this.iconLayer = new Layer();
        this.canLayer = new Layer();
        this.lidLayer = new Layer();
        this.canRectLayer = new PathLayer();
        this.canRectLayer.path = config.trash.can.rect;
        this.canLinesLayer = new PathLayer();
        this.canLinesLayer.path = config.trash.can.lines;
        this.lidRectLayer = new PathLayer();
        this.lidRectLayer.path = config.trash.lid.rect;
        this.lidHandleLayer = new PathLayer();
        this.lidHandleLayer.path = config.trash.lid.handle;

        this.iconLayer.addSublayer(this.canLayer);
        this.iconLayer.addSublayer(this.lidLayer);
        this.canLayer.addSublayer(this.canRectLayer);
        this.canLayer.addSublayer(this.canLinesLayer);
        this.lidLayer.addSublayer(this.lidRectLayer);
        this.lidLayer.addSublayer(this.lidHandleLayer);

        this.layer.background = config.trash.background;
        this.layer.cornerRadius = config.cornerRadius;

        this.titleLayer = new TextLayer();
        this.titleLayer.font = config.identFont;
        this.titleLayer.text = config.trash.title;
        this.titleLayer.baseline = 'top';
    }

    didUnmount () {
        this.dragController?.unregisterTarget(this);
    }

    get isEmpty () {
        return true; // always hungry
    }
    get acceptsDef () {
        return true; // accepts everything
    }
    beginTentative (expr: Expr.Any) {
        void expr;
        const t = new Transaction(1, 0.3);
        this.active = true;
        this.layout();
        t.commit();
    }
    endTentative () {
        const t = new Transaction(1, 0.3);
        this.active = false;
        this.layout();
        t.commit();
    }
    insertExpr (expr: Expr.Any) {
        const t = new Transaction(1, 0.3);
        this.active = false;
        this.layout();
        t.commit();
        void expr;
    }
    insertDef (def: Def) {
        const t = new Transaction(1, 0.3);
        this.active = false;
        this.layout();
        t.commit();
        this.ctx.history.commitChange('remove-node', () => {
            const removal = removeNode(def);

            return () => {
                removal.undo();
                const defView = getProtoView(def, DefView);
                defView.layer.scale = 1;
            };
        });
    }

    layout () {
        super.layout();
        this.dragController.registerTarget(this);
        const titleSize = this.titleLayer.getNaturalSize();

        this.iconLayer.position = [
            (this.size[0] - config.trash.iconSize * 2) / 2,
            (this.size[1] - config.trash.iconSize * 2) / 2,
        ];
        this.iconLayer.scale = 2;

        this.titleLayer.position = [
            (this.size[0] - titleSize[0]) / 2,
            this.iconLayer.position[1] + config.trash.iconSize * 2 + 4,
        ];

        this.canRectLayer.fill = config.trash.fill;
        this.lidRectLayer.fill = config.trash.fill;
        this.canLinesLayer.fill = config.trash.fillLines;
        this.canRectLayer.stroke = config.trash.outline;
        this.canRectLayer.strokeWidth = config.trash.outlineWidth;
        this.lidRectLayer.stroke = config.trash.outline;
        this.lidRectLayer.strokeWidth = config.trash.outlineWidth;
        this.lidHandleLayer.fill = [0, 0, 0, 0];
        this.lidHandleLayer.stroke = config.trash.outline;
        this.lidHandleLayer.strokeWidth = config.trash.outlineWidth;

        this.lidLayer.rotation = this.active ? -30 : 0;
        this.lidLayer.position = this.active ? [-2, 4] : [0, 0];
        this.canLayer.rotation = this.active ? 10 : 0;
        this.canLayer.position = this.active ? [2, 2] : [0, 0];

        this.layer.background = this.isLeftTrash
            ? (this.active ? config.trash.bigActiveBackground : config.trash.bigBackground)
            : (this.active ? config.trash.activeBackground : config.trash.background);

        this.layer.opacity = !this.isLeftTrash || this.shouldShow ? 1 : 0;

        return this.layer.size;
    }

    *iterSublayers () {
        yield this.titleLayer;
        yield this.iconLayer;
    }
}


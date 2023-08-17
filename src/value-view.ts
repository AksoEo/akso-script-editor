import { VMFun } from '@tejo/akso-script';
import { View, Layer, PathLayer, Transaction } from './ui';
import { ExprView } from './expr-view';
import config from './config';
import { Vec2 } from "./spring";
import { Expr } from './model';
import { ViewContext } from './ui/context';

// TODO: add loading indicator

/// Renders a runtime value.
///
/// # Properties
/// - value: the value to render
/// - error: if true, will show an error icon instead
/// - loading: if true, will show a loading indicator instead
export class ValueView extends View {
    valueView: ExprView;
    errorView: ErrorView;

    wantsChildLayout = true;

    constructor() {
        super();
        this.valueView = new ExprView({ type: 'u', ctx: null, parent: null });
        this.valueView.noInteraction = true;
        this.valueView.decorationOnly = true;
        this.addSubview(this.valueView);

        this.errorView = new ErrorView();

        this.layer.opacity = 0;
    }

    #value: Expr.AnyRuntime | null = null;
    #valueDidChange = false;
    get value() {
        return this.#value;
    }

    set value(v) {
        if (v === this.#value) return;
        this.#value = v;
        this.#valueDidChange = true;
        this.needsLayout = true;
    }

    #error = false;
    get error() {
        return this.#error;
    }

    set error(error) {
        if (this.#error === error) return;
        this.#error = error;
        this.updateErrorVisible();
        this.needsLayout = true;
    }

    #valueIsError = false;

    updateErrorVisible() {
        this.#setErrorVisible(this.error || this.#valueIsError);
    }

    #errorVisible = null;
    #setErrorVisible = (visible: boolean) => {
        if (this.#errorVisible === visible) return;
        this.#errorVisible = visible;
        if (visible) {
            this.removeSubview(this.valueView);
            this.addSubview(this.errorView);
        } else {
            this.addSubview(this.valueView);
            this.removeSubview(this.errorView);
        }
    };

    updateValue() {
        if (!this.#valueDidChange) return;
        this.#valueDidChange = false;
        const value = this.value;

        let isError = false;
        let e: Expr.AnyRuntime;
        if (value === null) e = { type: 'u', ctx: null, parent: null };
        else if (typeof value === 'boolean') e = { type: 'b', value, ctx: null, parent: null };
        else if (typeof value === 'number') e = { type: 'n', value, ctx: null, parent: null };
        else if (typeof value === 'string') e = { type: 's', value, ctx: null, parent: null };
        else if (Array.isArray(value)) e = { type: 'm', value, ctx: null, parent: null };
        else if (value instanceof VMFun) {
            const fun = value as VMFun;
            e = {
                type: 'f',
                params: fun.params,
                body: { type: 'd', defs: new Set(), floatingExpr: new Set(), ctx: null, parent: null },
                ctx: null,
                parent: null,
            };
        }
        else if (value instanceof Date) e = { type: 'timestamp', value, ctx: null, parent: null };
        else if (value === undefined) {
            // probably an error
            e = { type: 'u', ctx: null, parent: null };
            isError = true;
        } else e = { type: 's', value: `error: unknown value type ${typeof value}`, ctx: null, parent: null };

        this.valueView.expr = e;
        this.valueView.needsLayout = true;

        this.#valueIsError = isError;
        this.updateErrorVisible();

    }

    getIntrinsicSize(): Vec2 {
        this.updateValue();

        if (this.#errorVisible) {
            return this.errorView.getIntrinsicSize();
        } else {
            return this.valueView.getIntrinsicSize();
        }
    }

    layout() {
        this.needsLayout = false;
        this.updateValue();

        this.layer.opacity = 1;
        if (this.#errorVisible) {
            this.errorView.size = this.size;
            return this.errorView.layout();
        } else {
            this.valueView.size = this.size;
            return this.valueView.layout();
        }
    }
}

class ErrorView extends View {
    iconContainer: Layer;
    exclamDot: Layer;
    exclamTop: Layer;

    constructor() {
        super();

        this.layer.background = config.primitives.error;
        this.layer.stroke = config.primitives.errorOutline;
        this.layer.cornerRadius = config.cornerRadius;
        this.layer.strokeWidth = config.primitives.outlineWeight;

        this.iconContainer = new Layer();
        this.iconContainer.size = [14, 14];
        this.addSublayer(this.iconContainer);

        this.exclamDot = new Layer();
        this.exclamDot.position = [5, 10];
        this.exclamDot.size = [3, 3];
        this.exclamDot.cornerRadius = 1.5;
        this.exclamDot.background = config.primitives.errorColor;
        this.iconContainer.addSublayer(this.exclamDot);

        this.exclamTop = new Layer();
        this.exclamTop.position = [7, 9];
        const exclamTopPath = new PathLayer();
        this.exclamTop.addSublayer(exclamTopPath);
        exclamTopPath.path = config.icons.exclamTop;
        exclamTopPath.fill = config.primitives.errorColor;
        exclamTopPath.position = [-7, -9];
        this.iconContainer.addSublayer(this.exclamTop);

        this.needsLayout = true;
    }

    didAttach(ctx: ViewContext) {
        super.didAttach(ctx);
        {
            const t = new Transaction(0, 0);
            this.exclamDot.position = [6, 11];
            this.exclamDot.scale = 0.1;
            this.exclamTop.scale = 0.5;
            this.exclamTop.rotation = 25;
            t.commit();
        }
        {
            const t = new Transaction(0.5, 0.3);
            this.exclamDot.position = [5, 10];
            this.exclamDot.scale = 1;
            this.exclamTop.scale = 1;
            this.exclamTop.rotation = 0;
            t.commit();
        }
    }

    getIntrinsicSize() {
        return new Vec2(
            config.icons.size + 2 * config.primitives.paddingX,
            config.icons.size + 2 * config.primitives.paddingYS,
        );
    }

    layout () {
        this.needsLayout = false;
        this.iconContainer.position = [config.primitives.paddingX, config.primitives.paddingYS];
        return this.layer.size;
    }
}

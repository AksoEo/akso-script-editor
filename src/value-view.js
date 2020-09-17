import { VMFun } from '@tejo/akso-script';
import { View, Layer, PathLayer, Transaction } from './ui';
import { ExprView } from './expr-view';
import config from './config';

/// Renders a runtime value.
///
/// # Properties
/// - value: the value to render
/// - error: if true, will show an error icon instead
export class ValueView extends View {
    constructor () {
        super();
        this.valueView = new ExprView({ type: 'u' });
        this.valueView.noInteraction = true;
        this.valueView.decorationOnly = true;
        this.addSubview(this.valueView);

        this.errorView = new ErrorView();

        this.layer.opacity = 0;
    }

    #value = undefined;
    get value () {
        return this.#value;
    }
    set value (v) {
        if (v === this.#value) return;
        this.#value = v;
        this.needsLayout = true;
    }

    #error = false;
    get error () {
        return this.#error;
    }
    set error (error) {
        if (this.#error === error) return;
        this.#error = error;
        this.updateErrorVisible();
        this.needsLayout = true;
    }

    #valueIsError = false;
    updateErrorVisible () {
        this.#setErrorVisible(this.error || this.#valueIsError);
    }

    #errorVisible = null;
    #setErrorVisible = (visible) => {
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

    layout () {
        super.layout();
        const value = this.value;

        let isError = false;
        let e;
        if (value === null) e = { type: 'u' };
        else if (typeof value === 'boolean') e = { type: 'b', value };
        else if (typeof value === 'number') e = { type: 'n', value };
        else if (typeof value === 'string') e = { type: 's', value };
        else if (Array.isArray(value)) e = { type: 'm', value };
        else if (value instanceof VMFun) e = { type: 'f', params: value.params, body: [] };
        // TODO: these
        else if (value instanceof Date) e = { type: 's', value: `(TODO: date fmt) ${value}` };
        else if (value === undefined) {
            // probably an error
            e = { type: 'u' };
            isError = true;
        } else e = { type: 's', value: `error: unknown value type ${typeof value}` };

        this.valueView.expr = e;
        this.valueView.layout();

        this.errorView.layout();

        this.#valueIsError = isError;
        this.updateErrorVisible();

        this.layer.opacity = 1;
        this.layer.size = this.#errorVisible ? this.errorView.size : this.valueView.size;
    }
}

class ErrorView extends View {
    constructor () {
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

    didAttach (ctx) {
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

    layout () {
        this.layer.size = [
            config.icons.size + 2 * config.primitives.paddingX,
            config.icons.size + 2 * config.primitives.paddingYS,
        ];
        this.iconContainer.position = [config.primitives.paddingX, config.primitives.paddingYS];
    }
}

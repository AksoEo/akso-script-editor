import { VMFun } from '@tejo/akso-script';
import { View } from './ui';
import { ExprView } from './expr-view';

/// Renders a runtime value.
///
/// # Properties
/// - value: the value to render
export class ValueView extends View {
    constructor () {
        super();
        this.valueView = new ExprView({ type: 'u' });
        this.valueView.noInteraction = true;
        this.valueView.decorationOnly = true;
        this.addSubview(this.valueView);

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

        if (!isError) {
            this.layer.opacity = 1;
            this.layer.size = this.valueView.size;
        } else {
            this.layer.opacity = 0;
            this.layer.size = [0, 0];
        }
    }
}


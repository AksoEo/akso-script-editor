import { h, Component, render } from 'preact';
import config from './config';
import './extras.css';

class FormVarEditor extends Component {
    onTypeChange (type) {
        if (type === this.props.node.type) return;
        let newValue = this.props.node.value;
        if (type === 'null') newValue = null;
        else if (type === 'bool') newValue = !!newValue;
        else if (type === 'number') {
            newValue = parseFloat(newValue, 10);
            if (!Number.isFinite(newValue)) newValue = 0;
        } else if (type === 'string') newValue = '' + newValue;
        else if (type === 'matrix') newValue = [];

        this.props.onChange({ ...this.props.node, type, value: newValue });
    };

    render ({ node, onChange }) {
        let editor = null;

        const onValueChange = value => this.props.onChange({ ...node, value });

        if (node.type === 'bool') {
            editor = (
                <input
                    type="checkbox"
                    checked={node.value}
                    onChange={e => {
                        onValueChange(e.target.checked);
                    }} />
            );
        } else if (node.type === 'number') {
            editor = (
                <input
                    type="number"
                    value={node.value}
                    onChange={e => {
                        let n = +e.target.value;
                        if (!Number.isFinite(n)) n = 0;
                        onValueChange(n);
                    }} />
            );
        } else if (node.type === 'string') {
            editor = (
                <textarea
                    value={node.value}
                    onChange={e => onValueChange(e.target.value)} />
            );
        }

        return (
            <div class="fv-item">
                <div class="fv-item-header">
                    <button class="fv-remove" onClick={this.props.onRemove}>-</button>
                    <span class="fv-at">@</span>
                    <input
                        class="fv-name"
                        type="text"
                        value={node.name}
                        onChange={e => onChange({ ...node, name: e.target.value })} />
                    <span class="fv-eq">=</span>
                </div>
                <select
                    class="fv-type"
                    value={node.type}
                    onChange={e => this.onTypeChange(e.target.value)}>
                    {Object.entries(config.formVars.types).map(([id, name]) => (
                        <option value={id}>{name}</option>
                    ))}
                </select>
                {editor}
            </div>
        );
    }
}

class FormVars extends Component {
    pushFV = () => {
        this.props.vars.push({
            name: config.formVars.defaultName(this.props.vars.length),
            type: 'null',
            value: null,
        });
        this.props.onVarsChange();
        this.forceUpdate();
    };
    onItemChange = i => item => {
        this.props.vars[i] = item;
        this.props.onVarsChange();
        this.forceUpdate();
    };
    removeItem = i => () => {
        this.props.vars.splice(i, 1);
        this.props.onVarsChange();
        this.forceUpdate();
    };

    render ({ open, vars }) {
        return (
            <div class={'asce-form-vars' + (open ? ' is-open' : '')}>
                <div class="fv-editor">
                    <div class="fv-title">
                        {config.formVars.title}
                    </div>
                    <p class="fv-desc">
                        {config.formVars.description}
                    </p>
                    {vars.map((v, i) => (
                        <FormVarEditor
                            node={v}
                            onChange={this.onItemChange(i)}
                            onRemove={this.removeItem(i)} />
                    ))}
                    <button class="fv-add" onClick={this.pushFV}>
                        +
                    </button>
                </div>
            </div>
        );
    }
}

class Extras extends Component {
    state = {
        showVars: false,
        modelCtx: null,
    };

    componentDidMount () {
        const { root } = this.props;
        root.toggleVars = () => this.setState({ showVars: !this.state.showVars });
        root.setModelCtx = modelCtx => this.setState({ modelCtx });
        root.isVarsOpen = () => this.state.showVars;
    }

    render () {
        if (!this.state.modelCtx) return null;
        return (
            <div class="asce-extras">
                <FormVars
                    open={this.state.showVars}
                    vars={this.state.modelCtx.formVars}
                    onVarsChange={() => this.state.modelCtx.notifyFormVarsMutation()} />
            </div>
        );
    }
}

export class ExtrasRoot {
    constructor () {
        this.node = document.createElement('div');
        Object.assign(this.node.style, {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 2,
            font: config.identFont,
        });
        render(<Extras root={this} />, this.node);
    }
}

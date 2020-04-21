import { SpringSolver } from './spring';

const svgNS = 'http://www.w3.org/2000/svg';

export function vec2rgb(vec) {
    const r = Math.max(0, Math.min(Math.round(vec[0] * 255), 255));
    const g = Math.max(0, Math.min(Math.round(vec[1] * 255), 255));
    const b = Math.max(0, Math.min(Math.round(vec[2] * 255), 255));
    const a = Math.max(0, Math.min(vec[3], 1)).toFixed(3);

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const globalTransactions = [];

function getTransaction () {
    return globalTransactions[globalTransactions.length - 1] || null;
}

/// Base layer class. Handles display scheduling and such.
class BaseLayer {
    #needsDisplay = false;

    /// Rendering context
    ctx = null;

    /// Parent layer
    parent = null;

    didMount (ctx) {
        this.ctx = ctx;
    }
    didUnmount () {}

    get needsDisplay () {
        return this.#needsDisplay;
    }
    set needsDisplay (value) {
        if (value && this.ctx) this.ctx.scheduleDisplay(this);
        this.#needsDisplay = value;
    }

    get clipContents () {
        return false;
    }

    get position () {
        return [0, 0];
    }

    get absolutePosition () {
        const parentPos = this.parent ? this.parent.absolutePosition : [0, 0];
        return [this.position[0] + parentPos[0], this.position[1] + parentPos[1]];
    }

    get sublayers () {
        return new Set();
    }
}

/// A simple graphics layer.
export class Layer extends BaseLayer {
    #background = new LayerProperty([0, 0, 0, 0]);
    #stroke = new LayerProperty([0, 0, 0, 0]);
    #strokeWidth = new LayerProperty([0]);
    #cornerRadius = new LayerProperty([0]);
    #position = new LayerProperty([0, 0]);
    #size = new LayerProperty([0, 0]);
    #scale = new LayerProperty([1]);
    #opacity = new LayerProperty([1]);
    #sublayers = new Set();
    #clipContents = false;

    constructor (owner) {
        super();
        this.owner = owner;
        this.node = document.createElementNS(svgNS, 'g');
        this.node.setAttribute('class', 'asce-layer');
        this.fillNode = document.createElementNS(svgNS, 'rect');
        this.fillNode.setAttribute('class', 'asce-layer-fill');
        this.node.appendChild(this.fillNode);
    }

    draw () {
        this.needsDisplay = false;
        const position = this.#position.getDynamic();
        const size = this.#size.getDynamic();

        const scale = +this.#scale.getDynamic()[0].toFixed(3);

        let pos = [position[0], position[1]];
        pos = [
            pos[0] + size[0] / 2 - size[0] * scale / 2,
            pos[1] + size[1] / 2 - size[1] * scale / 2,
        ];

        this.node.style.transform = `translate(${pos[0]}px, ${pos[1]}px) scale(${scale})`;
        this.node.style.opacity = this.#opacity.getDynamic()[0].toFixed(3);
        this.fillNode.setAttribute('width', size[0].toFixed(3));
        this.fillNode.setAttribute('height', size[1].toFixed(3));
        this.fillNode.setAttribute('rx', this.#cornerRadius.getDynamic()[0].toFixed(3));

        if (this.owner) {
            this.node.dataset.class = this.owner.constructor.name;
        }

        const fill = this.#background.getDynamic();
        const stroke = this.#stroke.getDynamic();

        this.fillNode.setAttribute('fill', fill[3] > 1e-3
            ? vec2rgb(fill)
            : 'none');
        this.fillNode.setAttribute('stroke', stroke[3] > 1e-3
            ? vec2rgb(stroke)
            : 'none');

        this.fillNode.setAttribute('stroke-width', this.#strokeWidth.getDynamic()[0]);

        this.node.style.overflow = this.#clipContents ? 'hidden' : '';

        const needsUpdate = !!globalTransactions.length
            || this.#background.needsUpdate
            || this.#cornerRadius.needsUpdate
            || this.#position.needsUpdate
            || this.#size.needsUpdate
            || this.#stroke.needsUpdate
            || this.#strokeWidth.needsUpdate
            || this.#scale.needsUpdate
            || this.#opacity.needsUpdate;

        if (needsUpdate) this.needsDisplay = true;

        this.syncSublayers();

        for (const layer of this.#sublayers) {
            layer.draw();
        }
    }

    didMount (ctx) {
        super.didMount(ctx);

        if (this.owner) this.owner.didMount(ctx);
        for (const layer of this.#sublayers) layer.didMount(ctx);
    }

    didUnmount () {
        super.didUnmount();

        if (this.owner) this.owner.didUnmount();
    }

    #prevSublayers = null;
    #prevSubviews = null;
    syncSublayers () {
        if (!this.owner) return;
        const { sublayers, subviews } = this.owner;

        // if nothing changed, skip
        if (sublayers === this.#prevSublayers && subviews === this.#prevSubviews) return;

        const allLayers = new Set();
        for (const s of sublayers) allLayers.add(s);
        for (const s of subviews) allLayers.add(s.layer);

        for (const item of this.#sublayers) {
            if (!allLayers.has(item)) this.removeSublayer(item);
        }
        for (const item of allLayers) {
            if (!this.#sublayers.has(item)) this.addSublayer(item);
        }
    }

    addSublayer (layer) {
        this.#sublayers.add(layer);
        if (layer.parent) layer.didUnmount();
        layer.parent = this;
        layer.didMount(this.ctx);
        if (layer.node.parentNode) layer.node.parentNode.removeChild(layer.node);
        this.node.appendChild(layer.node);
    }

    removeSublayer (layer) {
        if (this.#sublayers.has(layer)) {
            this.#sublayers.delete(layer);
            if (layer.node.parentNode === this.node) {
                this.node.removeChild(layer.node);
                layer.didUnmount();
            }
        }
    }

    get sublayers () {
        return this.#sublayers;
    }

    get clipContents () {
        return this.#clipContents;
    }
    set clipContents (value) {
        this.#clipContents = value;
        this.needsDisplay = true;
    }

    get background () {
        return this.#background.getStatic();
    }
    set background (value) {
        if (this.#background.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get stroke () {
        return this.#stroke.getStatic();
    }
    set stroke (value) {
        if (this.#stroke.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get strokeWidth () {
        return this.#strokeWidth.getStatic()[0];
    }
    set strokeWidth (value) {
        if (this.#strokeWidth.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
    get cornerRadius () {
        return this.#cornerRadius.getStatic()[0];
    }
    set cornerRadius (value) {
        if (this.#cornerRadius.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
    get position () {
        return this.#position.getStatic();
    }
    set position (value) {
        if (this.#position.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get size () {
        return this.#size.getStatic();
    }
    set size (value) {
        if (this.#size.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get scale () {
        return this.#scale.getStatic()[0];
    }
    set scale (value) {
        if (this.#scale.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
    get opacity () {
        return this.#opacity.getStatic()[0];
    }
    set opacity (value) {
        if (this.#opacity.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
}

const textMeasurerCanvas = document.createElement('canvas');
const textMeasurer = textMeasurerCanvas.getContext('2d');

/// A text layer.
export class TextLayer extends BaseLayer {
    #color = new LayerProperty([0, 0, 0, 1]);
    #font = '12px sans-serif';
    #text = '';
    #align = 'left';
    #baseline = 'middle';
    #position = new LayerProperty([0, 0]);

    constructor () {
        super();
        this.node = document.createElementNS(svgNS, 'text');
        this.node.setAttribute('class', 'asce-text-layer');
    }

    getNaturalSize () {
        textMeasurer.font = this.#font;

        let fontSize = 10;

        // probably!!
        const probablyFontSize = this.#font.match(/(\d+)px/);
        if (probablyFontSize) fontSize = +probablyFontSize[1];

        const metrics = textMeasurer.measureText(this.#text);
        return [metrics.width, fontSize * 1.3];
    }

    draw () {
        const position = this.#position.getDynamic();

        this.node.setAttribute('fill', vec2rgb(this.#color.getDynamic()));
        this.node.setAttribute('x', position[0].toFixed(3));
        this.node.setAttribute('y', position[1].toFixed(3));
        this.node.textContent = this.#text;

        let anchor = 'middle';
        if (this.#align === 'left') anchor = 'start';
        else if (this.#align === 'right') anchor = 'end';

        let baseline = 'middle';
        if (this.#baseline === 'top') baseline = 'hanging';
        else if (this.#baseline === 'baseline') baseline = 'baseline';

        this.node.style.font = this.#font;
        this.node.setAttribute('text-anchor', anchor);
        this.node.setAttribute('dominant-baseline', baseline);

        const needsUpdate = !!globalTransactions.length
            || this.#position.needsUpdate
            || this.#color.needsUpdate;

        if (needsUpdate) this.needsDisplay = true;
    }

    get align () {
        return this.#align;
    }
    set align (value) {
        this.#align = value;
        this.needsDisplay = true;
    }
    get baseline () {
        return this.#baseline;
    }
    set baseline (value) {
        this.#baseline = value;
        this.needsDisplay = true;
    }
    get font () {
        return this.#font;
    }
    set font (value) {
        this.#font = value;
        this.needsDisplay = true;
    }
    get text () {
        return this.#text;
    }
    set text (value) {
        this.#text = value;
        this.needsDisplay = true;
    }
    get color () {
        return this.#color.getStatic();
    }
    set color (value) {
        if (this.#color.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get position () {
        return this.#position.getStatic();
    }
    set position (value) {
        if (this.#position.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
}

export class ArrowLayer extends BaseLayer {
    #start = new LayerProperty([0, 0]);
    #control1 = new LayerProperty([0, 0]);
    #control2 = new LayerProperty([0, 0]);
    #end = new LayerProperty([0, 0]);
    #stroke = new LayerProperty([0, 0, 0, 1]);
    #strokeWidth = new LayerProperty([1]);
    #arrowSize = new LayerProperty([0]);

    constructor () {
        super();
        this.node = document.createElementNS(svgNS, 'path');
        this.node.setAttribute('class', 'asce-arrow-layer');
    }

    draw () {
        const width = this.#strokeWidth.getDynamic()[0];
        this.node.setAttribute('stroke-width', width);
        this.node.setAttribute('stroke', vec2rgb(this.#stroke.getDynamic()));
        this.node.setAttribute('fill', 'none');

        const start = this.#start.getDynamic();
        const c1 = this.#control1.getDynamic();
        const c2 = this.#control2.getDynamic();
        const end = this.#end.getDynamic();

        const d = `M ${start} C ${c1} ${c2} ${end}`;
        this.node.setAttribute('d', d); // we need to set it here because we need to get points on it

        const totalLen = this.node.getTotalLength();
        const tangentHelperPoint = this.node.getPointAtLength(totalLen - 1);

        const tangentDir = Math.atan2(
            end[1] - tangentHelperPoint.y,
            end[0] - tangentHelperPoint.x,
        );
        const tipSize = Math.min(this.#arrowSize.getDynamic()[0], totalLen);

        let dTip = '';
        if (tipSize) {
            const tip1 = [
                end[0] + tipSize * Math.cos(tangentDir + Math.PI * 3 / 4),
                end[1] + tipSize * Math.sin(tangentDir + Math.PI * 3 / 4),
            ];
            const tip2 = [
                end[0] + tipSize * Math.cos(tangentDir - Math.PI * 3 / 4),
                end[1] + tipSize * Math.sin(tangentDir - Math.PI * 3 / 4),
            ];

            dTip = `M ${tip1} ${end} ${tip2}`;
        }

        this.node.setAttribute('d', d + ' ' + dTip);

        const needsUpdate = !!globalTransactions.length
            || this.#start.needsUpdate
            || this.#control1.needsUpdate
            || this.#control2.needsUpdate
            || this.#end.needsUpdate
            || this.#stroke.needsUpdate
            || this.#strokeWidth.needsUpdate
            || this.#arrowSize.needsUpdate;

        if (needsUpdate) this.needsDisplay = true;
    }

    get start () {
        return this.#start.getStatic();
    }
    set start (value) {
        if (this.#start.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get control1 () {
        return this.#control1.getStatic();
    }
    set control1 (value) {
        if (this.#control1.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get control2 () {
        return this.#control2.getStatic();
    }
    set control2 (value) {
        if (this.#control2.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get end () {
        return this.#end.getStatic();
    }
    set end (value) {
        if (this.#end.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get stroke () {
        return this.#stroke.getStatic();
    }
    set stroke (value) {
        if (this.#stroke.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get strokeWidth () {
        return this.#strokeWidth.getDynamic()[0];
    }
    set strokeWidth (value) {
        if (this.#strokeWidth.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
    get arrowSize () {
        return this.#arrowSize.getDynamic()[0];
    }
    set arrowSize (value) {
        if (this.#arrowSize.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
}

export class PathLayer extends BaseLayer {
    #path = '';
    #position = new LayerProperty([0, 0]);
    #fill = new LayerProperty([0, 0, 0, 1]);
    #stroke = new LayerProperty([0, 0, 0, 0]);
    #strokeWidth = new LayerProperty([0]);

    constructor () {
        super();
        this.node = document.createElementNS(svgNS, 'path');
        this.node.setAttribute('class', 'asce-path-layer');
    }

    draw () {
        this.node.setAttribute('fill', vec2rgb(this.#fill.getDynamic()));
        this.node.setAttribute('stroke', vec2rgb(this.#stroke.getDynamic()));
        this.node.setAttribute('stroke-width', this.#strokeWidth.getDynamic()[0]);
        this.node.setAttribute('d', this.#path);

        const position = this.#position.getDynamic();
        this.node.style.transform = `translate(${position[0]}px, ${position[1]}px)`;

        const needsUpdate = !!globalTransactions.length
            || this.#position.needsUpdate
            || this.#fill.needsUpdate
            || this.#stroke.needsUpdate
            || this.#strokeWidth.needsUpdate;

        if (needsUpdate) this.needsDisplay = true;
    }

    get path () {
        return this.#path;
    }
    set path (value) {
        if (value === this.#path) return;
        this.#path = value;
        this.needsDisplay = true;
    }
    get position () {
        return this.#position.getStatic();
    }
    set position (value) {
        if (this.#position.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get fill () {
        return this.#fill.getStatic();
    }
    set fill (value) {
        if (this.#fill.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get stroke () {
        return this.#stroke.getStatic();
    }
    set stroke (value) {
        if (this.#stroke.setStatic(value, getTransaction())) this.needsDisplay = true;
    }
    get strokeWidth () {
        return this.#strokeWidth.getDynamic()[0];
    }
    set strokeWidth (value) {
        if (this.#strokeWidth.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
}

/// Threshold below which layer properties should stop updating.
const PROP_UPDATE_THRESHOLD = 1e-4;

/// A layer property. Handles animation.
class LayerProperty {
    // target value of this property
    target = null;
    // spring animating this property
    // time at which the spring was initialized (Date.now())
    initTime = null;

    hasPending = false;
    pendingValue = null;

    constructor (initial) {
        this.spring = new SpringSolver(1, 1, initial.length || 1);
        this.target = initial;
    }

    get needsUpdate () {
        const value = this.getDynamic();
        const target = this.target;
        const velocity = this.getDynamicVelocity();

        if (target.length) {
            for (let i = 0; i < target.length; i++) {
                if (Math.abs(target[i] - value[i]) + Math.abs(velocity[i]) > PROP_UPDATE_THRESHOLD) return true;
            }
        } else if (Math.abs(target - value) + Math.abs(velocity) > PROP_UPDATE_THRESHOLD) return true;
        return false;
    }

    /// Returns the current static value of this property.
    getStatic () {
        return this.hasPending ? this.pendingValue : this.target;
    }

    /// Sets the static value of this property with an optional transaction.
    setStatic (target, transaction = null) {
        let isTheSame = true;
        if (target.length) {
            for (let i = 0; i < target.length; i++) {
                if (target[i] !== this.target[i]) {
                    isTheSame = false;
                    break;
                }
            }
        } else {
            isTheSame = target === this.target;
        }
        if (isTheSame) return false;

        if (transaction) {
            this.hasPending = true;
            this.pendingValue = target;
            transaction.addProperty(this, target);
        } else {
            this.initTime = null;
            this.hasPending = false;
            this.target = target;
        }
        return true;
    }

    getTime () {
        return (Date.now() - this.initTime) / 1000;
    }

    /// Returns the current actual value of this property.
    getDynamic () {
        if (this.initTime === null) return this.target;
        const t = this.getTime();
        return this.spring.getValue(t);
    }

    /// Returns the current velocity of this property.
    getDynamicVelocity () {
        if (this.initTime === null) return 0;
        const t = this.getTime();
        return this.spring.getVelocity(t);
    }

    /// Commits a transaction (internal method)
    commitTransaction (target, damping, period) {
        if (period === 0) {
            this.hasPending = false;
            this.initTime = null;
            this.target = target;
            return;
        }

        if (this.initTime === null) {
            this.initTime = Date.now();
            this.spring.resetValue(0, this.target);
        }
        this.hasPending = false;

        const t = this.getTime();
        this.initTime = Date.now();

        this.spring.resetDampingRatio(t, damping);
        this.spring.resetPeriod(0, period);
        this.spring.retarget(0, target);

        this.target = target;
    }
}

/// An animation transaction.
export class Transaction {
    properties = [];

    constructor (damping = 1, period = 1) {
        this.damping = damping;
        this.period = period;
        globalTransactions.push(this);
    }

    /// Commits this transaction
    commit () {
        globalTransactions.splice(globalTransactions.indexOf(this), 1);
        for (const { property, target } of this.properties) {
            property.commitTransaction(target, this.damping, this.period);
        }
    }

    commitAfterLayout (ctx) {
        ctx.scheduleCommitAfterLayout(this);
    }

    /// Internal function
    addProperty (property, target) {
        this.properties.push({ property, target });
    }
}

import { USE_WAAPI, BaseLayer, svgNS, getTransaction, vec2rgb, LayerProperty } from './base';
import { RawVec2, RawVec4, Vec2, Vec4 } from '../../spring';

const textMeasurerCanvas = document.createElement('canvas');
const textMeasurer = textMeasurerCanvas.getContext('2d');

/// A text layer.
export class TextLayer extends BaseLayer {
    #color = new LayerProperty(new Vec4(0, 0, 0, 1));
    #font = '12px sans-serif';
    #text = '';
    #align: 'left' | 'center' | 'right' = 'left';
    #baseline = 'middle';
    #position = new LayerProperty(new Vec2(0, 0));

    node: SVGTextElement;

    constructor () {
        super();
        this.node = document.createElementNS(svgNS, 'text');
        this.node.setAttribute('class', 'asce-text-layer');

        this.#color.waCommitCallback = k => {
            const kf = k.getKeyframes().map(vec2rgb);
            const anim = new Animation(new KeyframeEffect(this.node, {
                fill: kf,
            }, { duration: kf.length * 1000 / 60 }));
            k.waAnimation = [anim];
            anim.play();
        };
    }

    getNaturalSize () {
        textMeasurer.font = this.#font;

        let fontSize = 10;

        // probably!!
        const probablyFontSize = this.#font.match(/(\d+)px/);
        if (probablyFontSize) fontSize = +probablyFontSize[1];

        const metrics = textMeasurer.measureText(this.#text);
        return new Vec2(metrics.width, fontSize * 1.3);
    }

    draw () {
        const position = this.#position.getDynamic();

        this.node.setAttribute('fill', vec2rgb(this.#color.getWADynamic()));
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

        let propNeedsUpdate = this.#position.needsUpdate;
        if (!USE_WAAPI) {
            propNeedsUpdate = propNeedsUpdate || this.#color.needsUpdate;
        }

        const needsUpdate = !!getTransaction() || propNeedsUpdate;
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
    get color (): Vec4 {
        return this.#color.getStatic();
    }
    set color (value: Vec4 | RawVec4) {
        if (this.#color.setStatic(Vec4.from(value), getTransaction())) this.needsDisplay = true;
    }
    get position (): Vec2 {
        return this.#position.getStatic();
    }
    set position (value: Vec2 | RawVec2) {
        if (this.#position.setStatic(Vec2.from(value), getTransaction())) this.needsDisplay = true;
    }
}


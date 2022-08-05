import { USE_WAAPI, BaseLayer, svgNS, LayerProperty, getTransaction, vec2rgb } from './base';

/// Renders an arbitrary SVG path. The path is not animatable.
export class PathLayer extends BaseLayer {
    #path = '';
    #position = new LayerProperty([0, 0]);
    #fill = new LayerProperty([0, 0, 0, 1]);
    #stroke = new LayerProperty([0, 0, 0, 0]);
    #strokeWidth = new LayerProperty([0]);

    node: SVGPathElement;

    constructor () {
        super();
        this.node = document.createElementNS(svgNS, 'path');
        this.node.setAttribute('class', 'asce-path-layer');

        const waPropCommit = (node, prop, map) => (k) => {
            const kf = k.getKeyframes().map(map);
            const anim = k.waAnimation = new Animation(new KeyframeEffect(node, {
                [prop]: kf,
            }, { duration: kf.length * 1000 / 60 }));
            anim.play();
        };

        this.#position.waCommitCallback = waPropCommit(this.node, 'transform', k => `translate(${k[0].toFixed(3)}px, ${k[1].toFixed(3)}px)`);
        this.#strokeWidth.waCommitCallback = waPropCommit(this.node, 'strokeWidth', k => k[0].toFixed(3) + 'px');
        this.#stroke.waCommitCallback = waPropCommit(this.node, 'stroke', vec2rgb);
        this.#fill.waCommitCallback = waPropCommit(this.node, 'fill', vec2rgb);
    }

    draw () {
        this.node.setAttribute('fill', vec2rgb(this.#fill.getWADynamic()));
        this.node.setAttribute('stroke', vec2rgb(this.#stroke.getWADynamic()));
        this.node.setAttribute('stroke-width', this.#strokeWidth.getWADynamic()[0]);
        this.node.setAttribute('d', this.#path);

        const position = this.#position.getWADynamic();
        this.node.style.transform = `translate(${position[0]}px, ${position[1]}px)`;

        let propNeedsUpdate = false;
        if (!USE_WAAPI) {
            propNeedsUpdate = this.#position.needsUpdate
            || this.#fill.needsUpdate
            || this.#stroke.needsUpdate
            || this.#strokeWidth.needsUpdate;
        }

        const needsUpdate = !!getTransaction() || propNeedsUpdate;

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

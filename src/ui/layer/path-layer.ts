import { USE_WAAPI, BaseLayer, svgNS, LayerProperty, getTransaction, vec2rgb } from './base';
import { RawVec2, RawVec4, Vec1, Vec2, Vec4 } from '../../spring';

/// Renders an arbitrary SVG path. The path is not animatable.
export class PathLayer extends BaseLayer {
    #path = '';
    #position = new LayerProperty(new Vec2(0, 0));
    #fill = new LayerProperty(new Vec4(0, 0, 0, 1));
    #stroke = new LayerProperty(new Vec4(0, 0, 0, 0));
    #strokeWidth = new LayerProperty(new Vec1(0));

    node: SVGPathElement;

    constructor () {
        super();
        this.node = document.createElementNS(svgNS, 'path');
        this.node.setAttribute('class', 'asce-path-layer');

        const waPropCommit = (node, prop, map) => (k) => {
            const kf = k.getKeyframes().map(map);
            const anim = new Animation(new KeyframeEffect(node, {
                [prop]: kf,
            }, { duration: kf.length * 1000 / 60 }));
            k.waAnimation = [anim];
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
    get position (): Vec2 {
        return this.#position.getStatic();
    }
    set position (value: Vec2 | RawVec2) {
        if (this.#position.setStatic(Vec2.from(value), getTransaction())) this.needsDisplay = true;
    }
    get fill (): Vec4 {
        return this.#fill.getStatic();
    }
    set fill (value: Vec4 | RawVec4) {
        if (this.#fill.setStatic(Vec4.from(value), getTransaction())) this.needsDisplay = true;
    }
    get stroke (): Vec4 {
        return this.#stroke.getStatic();
    }
    set stroke (value: Vec4 | RawVec4) {
        if (this.#stroke.setStatic(Vec4.from(value), getTransaction())) this.needsDisplay = true;
    }
    get strokeWidth (): number {
        return this.#strokeWidth.getDynamic().x;
    }
    set strokeWidth (value: number) {
        if (this.#strokeWidth.setStatic(new Vec1(value), getTransaction())) this.needsDisplay = true;
    }
}

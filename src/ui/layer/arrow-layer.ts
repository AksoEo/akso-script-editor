import { USE_WAAPI, BaseLayer, svgNS, LayerProperty, getTransaction, vec2rgb } from './base';
import { RawVec2, RawVec4, Vec1, Vec2, Vec4 } from '../../spring';

/// Renders an arrow from start -> control1 -> control2 -> end (cubic-bezier).
export class ArrowLayer extends BaseLayer {
    #start = new LayerProperty(new Vec2(0, 0));
    #control1 = new LayerProperty(new Vec2(0, 0));
    #control2 = new LayerProperty(new Vec2(0, 0));
    #end = new LayerProperty(new Vec2(0, 0));
    #stroke = new LayerProperty(new Vec4(0, 0, 0, 1));
    #strokeWidth = new LayerProperty(new Vec1(1));
    #arrowSize = new LayerProperty(new Vec1(0));
    node: SVGPathElement;

    constructor () {
        super();
        this.node = document.createElementNS(svgNS, 'path');
        this.node.setAttribute('class', 'asce-arrow-layer');

        const waPropCommit = (node, prop, map) => (k) => {
            const kf = k.getKeyframes().map(map);
            const anim = new Animation(new KeyframeEffect(node, {
                [prop]: kf,
            }, { duration: kf.length * 1000 / 60 }));
            k.waAnimation = [anim];
            anim.play();
        };

        this.#stroke.waCommitCallback = waPropCommit(this.node, 'stroke', vec2rgb);
        this.#strokeWidth.waCommitCallback = waPropCommit(this.node, 'strokeWidth', k => k[0].toFixed(3) + 'px');
    }

    draw () {
        const width = this.#strokeWidth.getWADynamic()[0];
        this.node.setAttribute('stroke-width', width);
        this.node.setAttribute('stroke', vec2rgb(this.#stroke.getWADynamic()));
        this.node.setAttribute('fill', 'none');

        const fix = m => m.map(x => x.toFixed(3));

        const start = this.#start.getDynamic();
        const c1 = this.#control1.getDynamic();
        const c2 = this.#control2.getDynamic();
        const end = this.#end.getDynamic();

        const d = `M ${fix(start)} C ${fix(c1)} ${fix(c2)} ${fix(end)}`;
        this.node.setAttribute('d', d); // we need to set it here because we need to get points on it

        const arrowSize = this.#arrowSize.getDynamic()[0];

        if (arrowSize > 1e-2) {
            const totalLen = this.node.getTotalLength();
            const tangentHelperPoint = this.node.getPointAtLength(totalLen - 1);

            const tangentDir = Math.atan2(
                end[1] - tangentHelperPoint.y,
                end[0] - tangentHelperPoint.x,
            );
            const tipSize = Math.min(arrowSize, totalLen);

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

                dTip = `M ${fix(tip1)} ${fix(end)} ${fix(tip2)}`;
            }

            this.node.setAttribute('d', d + ' ' + dTip);
        }

        let propNeedsUpdate = this.#start.needsUpdate
            || this.#control1.needsUpdate
            || this.#control2.needsUpdate
            || this.#end.needsUpdate
            || this.#arrowSize.needsUpdate;

        if (!USE_WAAPI) {
            propNeedsUpdate = propNeedsUpdate
                || this.#stroke.needsUpdate
                || this.#strokeWidth.needsUpdate;
        }

        const needsUpdate = !!getTransaction() || propNeedsUpdate;

        if (needsUpdate) this.needsDisplay = true;
    }

    get start (): Vec2 {
        return this.#start.getStatic();
    }
    set start (value: Vec2 | RawVec2) {
        if (this.#start.setStatic(Vec2.from(value), getTransaction())) this.needsDisplay = true;
    }
    get control1 (): Vec2 {
        return this.#control1.getStatic();
    }
    set control1 (value: Vec2 | RawVec2) {
        if (this.#control1.setStatic(Vec2.from(value), getTransaction())) this.needsDisplay = true;
    }
    get control2 (): Vec2 {
        return this.#control2.getStatic();
    }
    set control2 (value: Vec2 | RawVec2) {
        if (this.#control2.setStatic(Vec2.from(value), getTransaction())) this.needsDisplay = true;
    }
    get end (): Vec2 {
        return this.#end.getStatic();
    }
    set end (value: Vec2 | RawVec2) {
        if (this.#end.setStatic(Vec2.from(value), getTransaction())) this.needsDisplay = true;
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
    get arrowSize (): number {
        return this.#arrowSize.getDynamic().x;
    }
    set arrowSize (value: number) {
        if (this.#arrowSize.setStatic(new Vec1(value), getTransaction())) this.needsDisplay = true;
    }
}

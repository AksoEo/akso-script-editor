import { USE_WAAPI, BaseLayer, svgNS, LayerProperty, getTransaction, vec2rgb } from './base';

/// Renders an arrow from start -> control1 -> control2 -> end (cubic-bezier).
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

        const waPropCommit = (node, prop, map) => (k) => {
            const kf = k.getKeyframes().map(map);
            const anim = k.waAnimation = new Animation(new KeyframeEffect(node, {
                [prop]: kf,
            }, { duration: kf.length * 1000 / 60 }));
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

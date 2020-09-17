import { USE_WAAPI, BaseLayer, svgNS, vec2rgb, getTransaction, LayerProperty } from './base';

/// A simple graphics layer.
///
/// Only a view's designated backing layer should have its owner field set.
export class Layer extends BaseLayer {
    #background = new LayerProperty([0, 0, 0, 0]);
    #stroke = new LayerProperty([0, 0, 0, 0]);
    #strokeWidth = new LayerProperty([0]);
    #cornerRadius = new LayerProperty([0]);
    #position = new LayerProperty([0, 0]);
    #size = new LayerProperty([0, 0]);
    #scale = new LayerProperty([1]);
    #rotation = new LayerProperty([0]);
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

        this.clipPath = document.createElementNS(svgNS, 'clipPath');
        this.clipPath.id = 'asce-layer-' + Math.random().toString(36).replace(/\./g, '');
        this.clipNode = document.createElementNS(svgNS, 'rect');
        this.clipPath.appendChild(this.clipNode);
        this.node.appendChild(this.clipPath);

        const waTransformCommit = () => {
            const p = this.#position.getKeyframes() || [];
            const s = this.#scale.getKeyframes() || [];
            const r = this.#rotation.getKeyframes() || [];
            const pv = this.#position.getStatic();
            const sv = this.#scale.getStatic();
            const rv = this.#rotation.getStatic();
            const keyframes = [];
            for (let i = 0; i < Math.max(p.length, s.length, r.length); i++) {
                const [dx, dy] = p[i] || pv;
                const [ds] = s[i] || sv;
                const [dr] = r[i] || rv;
                keyframes.push(`translate(${dx.toFixed(3)}px, ${dy.toFixed(3)}px) scale(${ds.toFixed(3)}) rotate(${dr.toFixed(3)}deg)`);
            }
            if (!keyframes.length) return;

            const anim = new Animation(new KeyframeEffect(this.node, {
                transform: keyframes,
            }, {
                duration: keyframes.length * 1000 / 60,
            }));
            this.#position.waAnimation = anim;
            this.#scale.waAnimation = anim;
            this.#rotation.waAnimation = anim;
            anim.play();
        };
        const waSizeCommit = (k) => {
            const kf = k.getKeyframes();
            const a = {
                width: kf.map(k => Math.max(0, k[0]).toFixed(3) + 'px'),
                height: kf.map(k => Math.max(0, k[1]).toFixed(3) + 'px'),
            };
            const b = { duration: kf.length * 1000 / 60 };
            const anim = new Animation(new KeyframeEffect(this.fillNode, a, b));
            const anim2 = new Animation(new KeyframeEffect(this.clipNode, a, b));
            k.waAnimation = [anim, anim2];
            anim.play();
            anim2.play();
        };
        const waPropCommit = (node, prop, map) => (k) => {
            const kf = k.getKeyframes().map(map);
            const anim = k.waAnimation = new Animation(new KeyframeEffect(node, {
                [prop]: kf,
            }, { duration: kf.length * 1000 / 60 }));
            anim.play();
        };

        this.#position.waCommitCallback = waTransformCommit;
        this.#scale.waCommitCallback = waTransformCommit;
        this.#rotation.waCommitCallback = waTransformCommit;
        this.#opacity.waCommitCallback = waPropCommit(this.node, 'opacity', k => Math.max(0, Math.min(1, k[0])).toFixed(3));
        this.#size.waCommitCallback = waSizeCommit;
        this.#cornerRadius.waCommitCallback = waPropCommit(this.fillNode, 'rx', k => k[0].toFixed(3) + 'px');
        this.#strokeWidth.waCommitCallback = waPropCommit(this.fillNode, 'strokeWidth', k => k[0].toFixed(3) + 'px');
        this.#stroke.waCommitCallback = waPropCommit(this.fillNode, 'stroke', vec2rgb);
        this.#background.waCommitCallback = waPropCommit(this.fillNode, 'fill', vec2rgb);
    }

    draw () {
        this.needsDisplay = false;
        const position = this.#position.getWADynamic();
        const size = this.#size.getWADynamic();

        const scale = +this.#scale.getWADynamic()[0].toFixed(3);
        const rotation = +this.#rotation.getWADynamic()[0].toFixed(3);

        let pos = [position[0], position[1]];
        pos = [
            pos[0] + size[0] / 2 - size[0] * scale / 2,
            pos[1] + size[1] / 2 - size[1] * scale / 2,
        ];

        this.node.style.transform = `translate(${pos[0]}px, ${pos[1]}px) scale(${scale}) rotate(${rotation}deg)`;
        this.node.style.opacity = this.#opacity.getWADynamic()[0].toFixed(3);
        this.fillNode.setAttribute('width', Math.max(0, size[0]).toFixed(3));
        this.fillNode.setAttribute('height', Math.max(0, size[1]).toFixed(3));
        this.fillNode.setAttribute('rx', Math.max(0, this.#cornerRadius.getWADynamic()[0]).toFixed(3));

        if (this.owner) {
            this.node.dataset.class = this.owner.constructor.name;
        }

        const fill = this.#background.getWADynamic();
        const stroke = this.#stroke.getWADynamic();

        this.fillNode.setAttribute('fill', fill[3] > 1e-3
            ? vec2rgb(fill)
            : 'none');
        this.fillNode.setAttribute('stroke', stroke[3] > 1e-3
            ? vec2rgb(stroke)
            : 'none');

        this.fillNode.setAttribute('stroke-width', this.#strokeWidth.getWADynamic()[0]);

        if (this.#clipContents) {
            this.clipNode.setAttribute('width', this.fillNode.getAttribute('width'));
            this.clipNode.setAttribute('height', this.fillNode.getAttribute('height'));
            this.clipNode.setAttribute('rx', this.fillNode.getAttribute('rx'));
            this.node.style.clipPath = `url(#${this.clipPath.id})`;
            if (!this.clipPath.parentNode) this.node.appendChild(this.clipPath);
        } else {
            this.node.style.clipPath = null;
            if (this.clipPath.parentNode) this.node.removeChild(this.clipPath);
        }

        let propNeedsUpdate = false;
        if (!USE_WAAPI) {
            const willChange = [];

            if (this.#background.needsUpdate) willChange.push('fill');
            if (this.#cornerRadius.needsUpdate) willChange.push('rx');
            if (this.#stroke.needsUpdate) willChange.push('stroke');
            if (this.#strokeWidth.needsUpdate) willChange.push('stroke-width');
            if (this.#size.needsUpdate) willChange.push('width', 'height');

            this.fillNode.style.willChange = willChange.join(', ');

            propNeedsUpdate = this.#background.needsUpdate
                || this.#cornerRadius.needsUpdate
                || this.#position.needsUpdate
                || this.#size.needsUpdate
                || this.#stroke.needsUpdate
                || this.#strokeWidth.needsUpdate
                || this.#scale.needsUpdate
                || this.#rotation.needsUpdate
                || this.#opacity.needsUpdate;
        }

        const needsUpdate = !!getTransaction() || propNeedsUpdate;

        if (needsUpdate) this.needsDisplay = true;

        for (const layer of this.#sublayers) {
            if (layer.needsDisplay) layer.draw();
        }

        if (this.owner && this.owner.syncSubnodes) this.owner.syncSubnodes();
    }

    didMount (ctx) {
        super.didMount(ctx);
        for (const layer of this.#sublayers) layer.didMount(ctx);
    }

    didUnmount () {
        super.didUnmount();
    }

    addSublayer (layer) {
        this.#sublayers.add(layer);
        if (layer.parent) {
            console.warn('Layer is still mounted somewhere', 'self, other parent, sublayer:', this, layer.parent, layer);
            layer.parent.removeSublayer(layer);
        }
        layer.parent = this;
        layer.didMount(this.ctx);
        this.node.appendChild(layer.node);
    }

    removeSublayer (layer) {
        if (this.#sublayers.has(layer)) {
            this.#sublayers.delete(layer);
            if (layer.node.parentNode === this.node) {
                this.node.removeChild(layer.node);
                layer.parent = null;
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
    get rotation () {
        return this.#rotation.getStatic()[0];
    }
    set rotation (value) {
        if (this.#rotation.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
    get opacity () {
        return this.#opacity.getStatic()[0];
    }
    set opacity (value) {
        if (this.#opacity.setStatic([value], getTransaction())) this.needsDisplay = true;
    }
}

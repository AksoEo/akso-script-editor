import { Layer } from './layer';
import { Gesture } from './gesture';
import { BaseLayer } from './layer/base';
import { ViewContext } from './context';

/// A UI view.
///
/// Has a list of direct sublayers, and a list of subviews.
export class View {
    layer = new Layer(this);

    /// Gesture recognizers.
    gestures = new Set<Gesture>();

    /// Set this to true to have your own needsLayout set to true when a child updates.
    wantsChildLayout = false;

    /// Current context.
    ctx: ViewContext | null = null;

    /// Parent view.
    #parent: View | null = null;

    /// List of sublayers.
    #sublayers: BaseLayer[] = [];
    /// List of subviews.
    #subviews: View[] = [];

    /// Returns a list of sublayers. Please do not mutate this list.
    get sublayers () {
        return this.#sublayers;
    }
    /// Returns a list of subviews. Please do not mutate this list.
    get subviews () {
        return this.#subviews;
    }

    get position () {
        return this.layer.position;
    }
    set position (v) {
        this.layer.position = v;
    }
    get size () {
        return this.layer.size;
    }
    set size (v) {
        if (v[0] === this.layer.size[0] && v[1] === this.layer.size[1]) return;
        this.layer.size = v;
        this.needsLayout = true;
    }
    get absolutePosition () {
        return this.layer.absolutePosition;
    }

    get parent () {
        return this.#parent;
    }

    #needsLayout = false;
    get needsLayout () {
        return this.#needsLayout;
    }
    set needsLayout (value) {
        if (value && this.ctx) this.ctx.render.scheduleLayout(this);
        this.#needsLayout = value;
    }

    /// Lays out this view (and possibly subviews) if needed.
    ///
    /// (Also see needsLayout)
    layoutIfNeeded () {
        if (this.needsLayout) this.layout();
    }

    /// Runs layout.
    layout () {
        this.#cachedSublayers = null;
        this.#cachedSubviews = null;
        this.needsLayout = false;
        if (this.parent && this.parent.wantsChildLayout) this.parent.needsLayout = true;
    }

    addSublayer (layer) {
        if (this.#sublayers.includes(layer)) return;
        this.#sublayers.push(layer);
        this.layer.addSublayer(layer);
    }
    removeSublayer (layer) {
        const index = this.#sublayers.indexOf(layer);
        if (index !== -1) {
            this.#sublayers.splice(index, 1);
            this.layer.removeSublayer(layer);
        }
    }

    addSubview (view: View) {
        if (!view) throw new Error('missing view argument');
        if (this.#subviews.includes(view)) return;
        if (view.parent) {
            console.warn('View is still mounted somewhere', 'self, other parent, subview:', this, view.parent, view);
            view.parent.removeSubview(view);
        }
        this.#subviews.push(view);
        this.layer.addSublayer(view.layer);
        if (this.ctx) view.didAttach(this.createSubContext());
        view.didMount(this);
    }
    removeSubview (view) {
        const index = this.#subviews.indexOf(view);
        if (index !== -1) {
            this.#subviews.splice(index, 1);
            this.layer.removeSublayer(view.layer);
            view.didUnmount();
            if (this.ctx) view.didDetach();
        }
    }

    #prevSublayers = null;
    #prevSubviews = null;
    syncSubnodes () {
        const sublayers = this.getISublayers();
        const subviews = this.getISubviews();

        if (sublayers !== this.#prevSublayers) {
            for (const s of sublayers) {
                if (!this.#sublayers.includes(s)) this.addSublayer(s);
            }
            if (this.#prevSublayers) {
                for (const s of this.#prevSublayers) {
                    if (!sublayers.has(s)) this.removeSublayer(s);
                }
            }
            this.#prevSublayers = sublayers;
        }

        if (subviews !== this.#prevSubviews) {
            for (const s of subviews) {
                if (!this.#subviews.includes(s)) this.addSubview(s);
            }
            if (this.#prevSubviews) {
                for (const s of this.#prevSubviews) {
                    if (!subviews.has(s)) this.removeSubview(s);
                }
            }
            this.#prevSubviews = subviews;
        }
    }

    // cached dynamic sublayers and subviews. Cache is cleared upon needsLayout
    #cachedSublayers = null;
    #cachedSubviews = null;

    /// Returns this view's extra sublayers.
    getISublayers () {
        if (!this.#cachedSublayers) {
            this.#cachedSublayers = new Set(this.iterSublayers());
        }
        return this.#cachedSublayers;
    }

    /// Returns this view's subviews.
    getISubviews () {
        if (!this.#cachedSubviews) {
            this.#cachedSubviews = new Set(this.iterSubviews());
        }
        return this.#cachedSubviews;
    }

    *iterSublayers (): Generator<BaseLayer> {}
    *iterSubviews (): Generator<View> {}

    flushSubviews () {
        this.#cachedSublayers = null;
        this.#cachedSubviews = null;
        this.layer.needsDisplay = true;
    }

    getGesturesForType (type: Gesture.Type, pointerType: Gesture.PointerType) {
        const gestures = [];
        for (const g of this.gestures) {
            const handler = g.getHandlerForType(type, pointerType);
            if (handler) gestures.push(handler);
        }
        return gestures;
    }

    /// Override this in subclasses to provide different child contexts.
    /// These will be provided in *addition* to parent context values.
    getSubCtx () {
        return {};
    }

    #cachedSubContext = null;
    createSubContext () {
        if (this.#cachedSubContext) return this.#cachedSubContext;
        const ctx = this.getSubCtx();
        if (!Object.keys(ctx).length) return this.ctx;
        const pctx = this.ctx;
        const sctx = Object.create(pctx); // use parent context as prototype
        Object.assign(sctx, ctx);
        this.#cachedSubContext = sctx;
        return sctx;
    }

    /// Fired when this view is attached to a context.
    didAttach (ctx) {
        this.ctx = ctx;
        if (this.ctx) this.ctx.render.scheduleLayout(this);
        const subCtx = this.createSubContext();
        for (const view of this.#subviews) view.didAttach(subCtx);
    }
    /// Fired before this view is detached from the current context.
    willDetach () {}
    /// Fired after this view is detached from the current context.
    didDetach () {
        this.willDetach();
        this.ctx = null;
        for (const view of this.#subviews) view.didDetach();
    }

    /// Fired when this view is added to a parent.
    didMount (parent) {
        this.#parent = parent;
        if (this.ctx) this.ctx.render.scheduleLayout(this);
    }

    /// Fired when this view is removed from a parent.
    didUnmount () {
        this.#parent = null;
    }
}

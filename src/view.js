import { Layer } from './layer';

/// A UI view.
///
/// This is a wrapper around Layer that facilitates layout and having managed sublayers.
/// There is no real view tree; instead, subviews are asked for on demand (see iterSubviews).
/// This allows for arbitrary storage of subview references.
export class View {
    // graphics layer for this view
    layer = new Layer(this);

    wantsChildLayout = false;

    // view frame
    get position () {
        return this.layer.position;
    }
    set position (value) {
        this.layer.position = value;
    }
    get absolutePosition () {
        return this.layer.absolutePosition;
    }
    get size () {
        return this.layer.size;
    }
    set size (value) {
        this.layer.size = value;
    }

    // ui context
    get ctx () {
        return this.layer.ctx;
    }

    didMount () {
        if (this.needsLayout) this.ctx.scheduleLayout(this);
    }

    didUnmount () {}

    // cached sublayers and subviews. Cache is cleared upon needsLayout
    #cachedSublayers = null;
    #cachedSubviews = null;

    #needsLayout = false;

    get needsLayout () {
        return this.#needsLayout;
    }
    set needsLayout (value) {
        if (value && this.ctx) this.ctx.scheduleLayout(this);
        this.#needsLayout = value;
    }

    /// Lays out this view (and possibly subviews) if needed.
    ///
    /// (Also see needsLayout)
    layoutIfNeeded () {
        if (this.needsLayout) this.layout();
    }

    /// Tries to obtain the current parent view using heuristics.
    get parent () {
        if (this.layer.parent && this.layer.parent.owner) return this.layer.parent.owner;
        return null;
    }

    /// Returns this view's extra sublayers.
    get sublayers () {
        if (!this.#cachedSublayers) {
            this.#cachedSublayers = new Set(this.iterSublayers());
        }
        return this.#cachedSublayers;
    }

    /// Returns this view's subviews.
    get subviews () {
        if (!this.#cachedSubviews) {
            this.#cachedSubviews = new Set(this.iterSubviews());
        }
        return this.#cachedSubviews;
    }

    flushSubviews () {
        this.#cachedSublayers = null;
        this.#cachedSubviews = null;
        this.layer.needsDisplay = true;
    }

    // - following methods are to be overridden in subclasses

    /// Lays out this view. Subclasses must call super.
    layout () {
        this.#cachedSublayers = null;
        this.#cachedSubviews = null;
        this.needsLayout = false;

        const parent = this.parent;
        if (parent && parent.wantsChildLayout) parent.needsLayout = true;
    }
    *iterSublayers () {}
    *iterSubviews () {}
}

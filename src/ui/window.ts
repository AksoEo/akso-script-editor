import { View } from './view';
import { Vec2 } from '../spring';

export class Window extends View {
    wantsRootSize = true;
    wantsChildLayout = true;

    /// A list of portals.
    portals: View[] = [];

    constructor() {
        super();
    }

    addPortal (view: PortalView) {
        this.portals.push(view);
        this.addSubview(view);
    }
    removePortal (view: PortalView) {
        const index = this.portals.indexOf(view);
        if (index !== -1) {
            this.portals.splice(index, 1);
            this.removeSubview(view);
        }
    }

    getIntrinsicSize(): Vec2 {
        if (!this.subviews.length) return Vec2.zero();
        return this.subviews[0].getIntrinsicSize();
    }

    layout(): Vec2 {
        this.needsLayout = false;
        for (const subview of this.subviews) {
            if (this.portals.includes(subview)) continue;
            subview.size = this.size;
            subview.layout();
        }
        return this.size;
    }

    getSubCtx () {
        return { window: this };
    }
}

/// Use Portal#contents to set portal contents.
export class PortalView extends View {
    #contents = null;
    get contents() {
        return this.#contents;
    }
    set contents (view) {
        if (view === this.#contents) return;
        this.close();
        this.#contents = view;
        this.open();
    }

    #currentPortaledView = null;
    open () {
        if (!this.ctx) return;
        if (this.#currentPortaledView) this.close();
        this.#currentPortaledView = this.contents;
        this.ctx.window.addPortal(this.#currentPortaledView);
    }

    close () {
        if (!this.#currentPortaledView) return;
        this.ctx.window.removePortal(this.#currentPortaledView);
        this.#currentPortaledView = null;
    }

    didAttach (ctx) {
        super.didAttach(ctx);
        this.open();
    }
    willDetach () {
        this.close();
    }
}

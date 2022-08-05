import { View } from './view';

export class Window extends View {
    wantsRootSize = true;

    /// A list of portals.
    portals: View[] = [];

    layout () {
        super.layout();
        for (const s of this.subviews) {
            s.size = this.size;
            s.layout();
        }
    }

    addPortal (view: View) {
        this.portals.push(view);
        this.addSubview(view);
    }
    removePortal (view: View) {
        const index = this.portals.indexOf(view);
        if (index !== -1) {
            this.portals.splice(index, 1);
            this.removeSubview(view);
        }
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

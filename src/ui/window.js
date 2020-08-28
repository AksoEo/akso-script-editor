import { View } from './view';

// TODO: this, properly
export class Window extends View {
    wantsRootSize = true;

    /// A list of portals.
    portals = [];

    constructor () {
        super();
    }

    layout () {
        super.layout();
        for (const s of this.subviews) {
            s.size = this.size;
            s.layout();
        }
    }

    /// Contents view.
    #contents = null;
    get contents () { return this.#contents; }
    set contents (c) {
        this.#contents = c;
        // TODO: update
    }
}

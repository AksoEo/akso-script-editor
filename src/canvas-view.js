import { View } from './view';
import { createContext, fromRawDefs, toRawDefs, resolveRefs } from './model';
import { viewPool } from './proto-pool';
import { DefsView } from './defs-view';

/// Root view of the editor canvas.
///
/// This view contains all program nodes.
export class CanvasView extends View {
    /// Model data context.
    modelCtx = null;
    /// Root node of the model data.
    root = null;
    /// Root defs view
    defsView = null;

    constructor () {
        super();

        this.modelCtx = createContext();
        this.modelCtx.onMutation(this.#onMutation);
        this.root = fromRawDefs({}, this.modelCtx);
        this.defsView = new DefsView(this.root);
    }

    #onMutation = node => {
        // set needsLayout on the representing view when a model node is mutated
        const view = viewPool.get(node);
        if (view) view.needsLayout = true;
        this.defsView.needsLayout = true;
        this.resolveRefs();
    };

    layout () {
        super.layout();
        this.ctx.canvas = this;
        this.defsView.defs = this.root;
        this.defsView.size = this.size;
        this.defsView.needsLayout = true;
    }

    /// Loads a raw asc root node.
    setRawRoot (data) {
        this.root = fromRawDefs(data, this.modelCtx);
        this.resolveRefs();
    }
    getRawRoot () {
        return toRawDefs(this.root);
    }

    resolveRefs () {
        resolveRefs(this.root);
        this.needsLayout = true;
    }

    *iterSubviews () {
        yield this.defsView;
    }
}

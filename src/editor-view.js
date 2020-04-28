import { View } from './view';
import { CanvasView } from './canvas-view';

export class EditorView extends View {
    canvasView = new CanvasView();

    layout () {
        super.layout();
        this.canvasView.position = [0, 0];
        this.canvasView.size = this.size;
        this.canvasView.needsLayout = true;
    }

    /// Loads a raw asc root node.
    setRawRoot (data) {
        this.canvasView.setRawRoot(data);
    }
    getRawRoot () {
        return this.canvasView.getRawRoot();
    }

    *iterSubviews () {
        yield this.canvasView;
    }

    get wantsRootSize () {
        return true;
    }
}

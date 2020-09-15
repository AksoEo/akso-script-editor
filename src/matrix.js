import { View, TextLayer } from './ui';
import config from './config';

function findDim (arr) {
    let dim = 1;
    for (const item of arr) {
        if (Array.isArray(item)) {
            dim = Math.max(dim, 1 + findDim(item));
        }
    }
    return dim;
}

function shallowEq (a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    } else return a === b;
}

/// Renders a matrix preview.
///
/// # Properties
/// - value: matrix to render
export class MatrixPreview extends View {
    #value = null;
    get value () {
        return this.#value;
    }
    set value (v) {
        if (v === this.#value) return;
        this.#value = v;
        this.needsLayout = true;
    }

    get decorationOnly () {
        return true;
    }

    #previewLines = [];

    addPreviewLine () {
        const pl = new PreviewLine();
        this.addSubview(pl);
        this.#previewLines.push(pl);
    }
    removePreviewLine () {
        this.removeSubview(this.#previewLines.pop());
    }

    layout () {
        super.layout();
        if (!Array.isArray(this.value)) {
            // no matrix!
            this.layer.opacity = 0;
            this.layer.size = [0, 0];
            return;
        }

        const dim = findDim(this.value);
        const lines = dim === 1 ? 1 : this.value.length;

        while (this.#previewLines.length < lines) this.addPreviewLine();
        while (this.#previewLines.length > lines) this.removePreviewLine();

        for (let i = 0; i < lines; i++) {
            const line = this.#previewLines[i];
            line.contents = dim === 1 ? this.value : this.value[i];
            line.layoutIfNeeded();
        }

        const cellSizes = [];
        for (const line of this.#previewLines) {
            while (cellSizes.length < line.cellSizes.length) cellSizes.push(0);
            for (let i = 0; i < line.cellSizes.length; i++) {
                cellSizes[i] = Math.max(cellSizes[i], line.cellSizes[i]);
            }
        }

        let width = 0;
        let y = -config.primitives.paddingYS;
        for (const ln of this.#previewLines) {
            ln.layoutPart2(cellSizes);

            y += config.primitives.paddingYS;
            ln.position = [0, y];
            y += ln.size[1];
            width = Math.max(width, ln.size[0]);
        }

        this.layer.size = [width, Math.max(0, y)];
    }
}
class PreviewLine extends View {
    #contents = [];
    cellSizes = [];
    height = 0;
    get contents () {
        return this.#contents;
    }
    set contents (v) {
        if (shallowEq(v, this.#contents)) return;
        this.#contents = v;
        this.needsLayout = true;
    }
    #items = [];
    addItem () {
        const item = new PreviewItem();
        this.addSubview(item);
        this.#items.push(item);
    }
    removeItem () {
        this.removeSubview(this.#items.pop());
    }
    layout () {
        super.layout();
        while (this.#items.length < this.contents.length) this.addItem();
        while (this.#items.length > this.contents.length) this.removeItem();

        let maxHeight = 0;
        for (let i = 0; i < this.contents.length; i++) {
            this.#items[i].content = this.contents[i];
            this.#items[i].layoutIfNeeded();
            maxHeight = Math.max(maxHeight, this.#items[i].size[1]);
        }

        this.cellSizes = this.#items.map(item => item.size[0]);
        this.height = maxHeight;
    }
    layoutPart2 (cellSizes) {
        const height = this.height;
        let x = -config.primitives.paddingXS;
        for (let i = 0; i < this.#items.length; i++) {
            const item = this.#items[i];
            const cellSize = cellSizes[i];
            x += config.primitives.paddingXS;
            item.position = [x + (cellSize - item.size[0]) / 2, (height - item.size[1]) / 2];
            x += cellSize;
        }
        this.layer.size = [Math.max(0, x), height];
    }
}
class PreviewItem extends View {
    constructor () {
        super();
        this.text = new TextLayer();
        this.text.font = config.identFont;
        this.text.color = config.primitives.color;
        this.addSublayer(this.text);
        this.needsLayout = true;
    }

    #content = null;
    get content () {
        return this.#content;
    }
    set content (v) {
        if (v === this.#content) return;
        this.#content = v;
        this.needsLayout = true;
    }
    layout () {
        super.layout();
        const value = this.content;
        let label;
        if (value === undefined) label = ' ';
        else if (value === null) label = 'null';
        else if (typeof value === 'number') label = '' + value;
        else if (typeof value === 'string') {
            if (value.length > 10) label = value.substr(0, 10) + '…';
            else label = value;
        } else if (typeof value === 'boolean') label = config.primitives['' + value];
        else if (Array.isArray(value)) label = '[…]';
        else label = '…';

        this.text.text = label;
        const textSize = this.text.getNaturalSize();
        this.layer.size = textSize;
        this.text.position = [0, this.layer.size[1] / 2];
    }
}

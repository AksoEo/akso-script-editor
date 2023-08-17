import { Window, View, Gesture, Transaction, Layer, TextLayer, PathLayer } from './ui';
import { ValueView } from './value-view';
import { Tooltip } from './tooltip';
import config from './config';
import {Vec2} from "./spring";

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
        if (shallowEq(this.value, v)) {
            if (!Array.isArray(this.value) || this.value.map((x, i) => shallowEq(x, v[i]))) return;
        }
        const vClone = v.slice();
        for (let i = 0; i < vClone.length; i++) if (Array.isArray(vClone[i])) vClone[i] = vClone[i].slice();
        this.#value = vClone;
        this.needsLayout = true;
    }

    decorationOnly = true;

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

        const is1D = !this.value.filter(x => Array.isArray(x)).length;
        const lines = is1D ? 1 : this.value.length;

        while (this.#previewLines.length < lines) this.addPreviewLine();
        while (this.#previewLines.length > lines) this.removePreviewLine();

        for (let i = 0; i < lines; i++) {
            const line = this.#previewLines[i];
            line.contents = is1D ? this.value : this.value[i];
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

        return new Vec2(width, Math.max(0, y));
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
        if (!Array.isArray(v)) {
            this.#contents = [v];
            this.needsLayout = true;
            return;
        }
        this.#contents = v.slice();
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

        return this.size;
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
        this.text.position = [0, this.layer.size[1] / 2];
        return textSize;
    }
}

export function editMatrix (ctx, value, onMutation) {
    const win = new Window();
    const handle = ctx.push(win);
    const container = new MatrixEditorContainer();
    const me = new MatrixEditor(value);
    container.addSubview(me);
    container.windowHandle = handle;
    win.addSubview(container);
    if (onMutation) me.onMutation = onMutation;
}

class MatrixEditorContainer extends View{
    constructor () {
        super();
        // fade in backdrop
        {
            const tBackdrop = config.matrix.backdrop.slice();
            tBackdrop[3] = 0;
            this.layer.background = tBackdrop;
            const t = new Transaction(1, 0.3);
            this.layer.background = config.matrix.backdrop;
            t.commit();
        }

        Gesture.onTap(this, this.onTap);
    }

    onTap = () => {
        // close on tap
        if (this.windowHandle) this.windowHandle.pop();
    };

    layout () {
        super.layout();
        for (const subview of this.subviews) subview.layout();
    }
}

/// Matrix editor. Should be in a new window.
///
/// # Properties
/// - value: the array to edit
/// - onMutation: will be called every time the value is mutated
class MatrixEditor extends View {
    wantsChildLayout = true;
    value = [];
    onMutation = () => {};
    selection = { start: [0, 0], end: [1, 1] };

    constructor (value) {
        super();

        this.layer.background = config.matrix.background;
        this.layer.cornerRadius = config.cornerRadius;
        this.layer.stroke = config.primitives.matrixOutline;
        this.layer.strokeWidth = config.primitives.outlineWeight;

        this.value = value || this.value;
        this.tableView = new MatrixTableView();
        this.tableView.value = this.value;
        this.tableView.selection = this.selection;
        this.tableView.onMutation = this.onTableViewMutation;
        this.addSubview(this.tableView);

        this.typeSwitch = new CellTypeSwitch();
        this.typeSwitch.onSetSelectionType = this.tableView.setSelectionType;
        this.addSubview(this.typeSwitch);

        this.tableView.typeSwitch = this.typeSwitch;

        // add a gesture recognizer that does nothing so the gesture isn't passed to the backdrop
        Gesture.onTap(this, () => {});

        this.needsLayout = true;
    }

    onTableViewMutation = () => {
        this.onMutation();
    };

    layout () {
        super.layout();
        this.typeSwitch.layoutIfNeeded();
        this.tableView.layoutIfNeeded();

        let width = 16 + Math.max(
            this.typeSwitch.size[0],
            this.tableView.size[0],
        );
        let y = 8;

        {
            this.typeSwitch.position = [(width - this.typeSwitch.size[0]) / 2, y];
            width = Math.max(width, this.typeSwitch.size[0]);
            y += this.typeSwitch.size[1];
            y += 8;
        }
        {
            this.tableView.position = [(width - this.tableView.size[0]) / 2, y];
            width = Math.max(width, this.tableView.size[0]);
            y += this.tableView.size[1];
            y += 8;
        }

        this.layer.size = [width, y];

        if (this.parent) {
            // parent is full-size; center
            this.layer.position = [
                (this.parent.size[0] - this.layer.size[0]) / 2,
                (this.parent.size[1] - this.layer.size[1]) / 2,
            ];
        }
    }
}

function transmuteCellValue (value, type) {
    const valueType = typeof value === 'boolean' ? 'bool'
        : typeof value === 'number' ? 'number'
            : typeof value === 'string' ? 'string'
                : Array.isArray(value) ? 'matrix'
                    : 'null';
    if (valueType === type) return value;
    if (type === 'null') return null;

    if (valueType === 'string' && type === 'number') {
        const num = parseFloat(value, 10);
        if (Number.isFinite(num)) return num;
        return 0;
    }
    if (type === 'string') {
        if (valueType === 'null') return '';
        else if (valueType === 'bool') return config.primitives['' + value];
        else if (valueType === 'number') return '' + value;
    }

    if (type === 'bool') return false;
    else if (type === 'number') return 0;
    else if (type === 'string') return '';
    else if (type === 'matrix') return [];
}

// FIXME: 2d arrays can also be heterogenous like [[1, 2], 2]
class MatrixTableView extends View {
    wantsChildLayout = true;
    typeSwitch = null;
    onMutation = () => {};

    constructor () {
        super();
        this.needsLayout = true;

        this.cellsContainer = new View();
        this.cellsContainer.wantsChildLayout = true;
        this.addSubview(this.cellsContainer);

        this.extensionX = new TableExtension(this.onExtendX);
        this.extensionY = new TableExtension(this.onExtendY);
        this.addSubview(this.extensionX);
        this.addSubview(this.extensionY);

        this.selectionView = new EditorSelection();
        this.addSubview(this.selectionView);

        Gesture.onTap(this, this.onTap);
        Gesture.onDrag(this, this.onDragMove, this.onDragStart, this.onDragEnd, this.onDragCancel);
    }

    // cached value
    #is2D = false;

    /// Returns the 2D size of the matrix (i.e. any deeper dimensions are ignored).
    get2DSize () {
        let maxSubLen = 1;
        let is2D = false;
        for (const item of this.value) {
            if (Array.isArray(item)) {
                maxSubLen = Math.max(maxSubLen, item.length);
                is2D = true;
            }
        }
        this.#is2D = is2D;
        return [maxSubLen, this.value.length];
    }
    /// Must call get2DSize beforehand to sync is2D!
    getValueAt (x, y) {
        let v = this.value[y];
        if (Array.isArray(v)) v = v[x];
        return v === undefined ? null : v;
    }

    onExtendX = () => {
        for (let i = 0; i < this.value.length; i++) {
            // 2d-ify any row that's not already 2d
            if (!Array.isArray(this.value[i])) {
                this.value[i] = [this.value[i]];
            }
            // add another item
            this.value[i].push(null);
        }
        const t = new Transaction(1, 0.3);
        this.layout();
        t.commitAfterLayout(this.ctx);
        this.onMutation();
    };
    onExtendY = () => {
        const is2D = this.value.map(x => Array.isArray(x)).reduce((a, b) => a || b, false);
        if (is2D) {
            const width = this.get2DSize()[0];
            this.value.push([...new Array(width)].map(() => null));
        } else {
            this.value.push(null);
        }

        const t = new Transaction(1, 0.3);
        this.layout();
        t.commitAfterLayout(this.ctx);
        this.onMutation();
    };
    onDeleteRow = row => {
        this.value.splice(row, 1);
        // shift cells by 1 and put the ones at row at the end so they'll be the ones that get
        // deleted
        this.#cells.push(this.#cells.splice(row, 1)[0]);
        const t = new Transaction(1, 0.3);
        this.fixSelection();
        this.layout();
        t.commitAfterLayout(this.ctx);
        this.onMutation();
    };
    onDeleteCol = col => {
        let width = 0;
        for (let y = 0; y < this.value.length; y++) {
            if (Array.isArray(this.value[y]) && col < this.value[y].length) {
                this.value[y].splice(col, 1);
            }
            if (Array.isArray(this.value[y])) width = Math.max(width, this.value[y].length);

            // shift cells by 1 and put the ones at col at the end so they'll be the ones that get
            // deleted
            const cellRow = this.#cells[y];
            if (col < cellRow.length) {
                cellRow.push(cellRow.splice(col, 1)[0]);
            }
        }

        // if there's only one column left, 1d-ify
        if (width === 1) {
            for (let i = 0; i < this.value.length; i++) {
                if (Array.isArray(this.value[i])) {
                    if (this.value[i].length) this.value[i] = this.value[i][0];
                    else this.value[i] = null;
                }
            }
        }

        const t = new Transaction(1, 0.3);
        this.fixSelection();
        this.layout();
        t.commitAfterLayout(this.ctx);
        this.onMutation();
    };

    fixSelection () {
        const size = this.get2DSize();
        const minX = 0;
        const maxX = size[0] - 1;
        const minY = 0;
        const maxY = size[1] - 1;
        this.selection.start[0] = Math.max(minX, Math.min(this.selection.start[0], maxX));
        this.selection.start[1] = Math.max(minY, Math.min(this.selection.start[1], maxY));
        this.selection.end[0] = Math.max(minX, Math.min(this.selection.end[0] - 1, maxX)) + 1;
        this.selection.end[1] = Math.max(minY, Math.min(this.selection.end[1] - 1, maxY)) + 1;
    }

    #cells = [];
    #rowHeaders = [];
    #colHeaders = [];
    layout () {
        super.layout();
        const size = this.get2DSize();

        // adjust row and column count
        while (this.#cells.length < size[1]) {
            this.#cells.push([]);

            const row = this.#rowHeaders.length;
            const rh = new TableHeader('row');
            rh.onDelete = () => this.onDeleteRow(row);
            this.cellsContainer.addSubview(rh);
            this.#rowHeaders.push(rh);
        }
        while (this.#cells.length > size[1]) {
            const row = this.#cells.pop();
            for (const cell of row) this.cellsContainer.removeSubview(cell);

            this.cellsContainer.removeSubview(this.#rowHeaders.pop());
        }
        while (this.#colHeaders.length < size[0]) {
            const col = this.#colHeaders.length;
            const ch = new TableHeader('col');
            ch.onDelete = () => this.onDeleteCol(col);
            this.cellsContainer.addSubview(ch);
            this.#colHeaders.push(ch);
        }
        while (this.#colHeaders.length > size[0]) {
            this.cellsContainer.removeSubview(this.#colHeaders.pop());
        }
        for (let row = 0; row < size[1]; row++) {
            while (this.#cells[row].length < size[0]) {
                const cell = new MatrixCell();
                const cellRow = row;
                const cellCol = this.#cells[row].length;
                cell.onMutation = () => {
                    this.setValueAt(cellCol, cellRow, cell.value);
                    this.onMutation();
                };
                this.cellsContainer.addSubview(cell);
                this.#cells[row].push(cell);
            }
            while (this.#cells[row].length > size[0]) {
                this.cellsContainer.removeSubview(this.#cells[row].pop());
            }
        }

        // calculate row and column sizes
        const rowSizes = [...new Array(size[1])].map(() => 0);
        const colSizes = [...new Array(size[0])].map(() => 0);
        for (let y = 0; y < size[1]; y++) {
            for (let x = 0; x < size[0]; x++) {
                const cell = this.#cells[y][x];
                cell.value = this.getValueAt(x, y);
                const cellSize = cell.getCellSize();

                rowSizes[y] = Math.max(rowSizes[y], cellSize[1]);
                colSizes[x] = Math.max(colSizes[x], cellSize[0]);
            }

            this.#rowHeaders[y].headerSize = rowSizes[y];
            this.#rowHeaders[y].layoutIfNeeded();
        }
        for (let x = 0; x < size[0]; x++) {
            this.#colHeaders[x].headerSize = colSizes[x];
            this.#colHeaders[x].layoutIfNeeded();
        }

        if (colSizes.length === 1 && !colSizes[0]) {
            // only 1 column and empty; fix width
            colSizes[0] = config.matrix.minCellWidth;
        }

        // layout cells
        const rowPositions = [];
        const colPositions = [];
        const posX0 = this.#rowHeaders[0] ? this.#rowHeaders[0].size[0] : 0;
        let posX = posX0;
        let posY = this.#colHeaders[0] ? this.#colHeaders[0].size[1] : 0;
        for (let y = 0; y < size[1]; y++) {
            if (posY) posY += config.matrix.cellSpacing;
            posX = posX0;
            rowPositions[y] = posY - config.matrix.cellSpacing / 2;

            for (let x = 0; x < size[0]; x++) {
                if (posX) posX += config.matrix.cellSpacing;
                colPositions[x] = posX - config.matrix.cellSpacing / 2;

                const cell = this.#cells[y][x];
                cell.position = [posX, posY];
                cell.layer.size = [colSizes[x], rowSizes[y]];
                cell.layout();

                posX += colSizes[x];
            }
            colPositions.push(posX + config.matrix.cellSpacing / 2);

            posY += rowSizes[y];
        }
        rowPositions.push(posY + config.matrix.cellSpacing / 2);

        let isEmpty = false;
        if (!rowSizes.length) {
            isEmpty = true;
            // empty; fix posX
            posX += colSizes[0];
            posY += config.matrix.minCellHeight;
        }

        while (colPositions.length < 2) colPositions.push(colPositions[0] || 0);
        while (rowPositions.length < 2) rowPositions.push(rowPositions[0] || 0);

        for (let y = 0; y < this.#rowHeaders.length; y++) {
            this.#rowHeaders[y].position = [0, rowPositions[y]];
        }
        for (let x = 0; x < this.#colHeaders.length; x++) {
            this.#colHeaders[x].position = [colPositions[x], 0];
        }

        this.extensionX.layer.opacity = isEmpty ? 0 : 1;

        this.extensionX.position = [posX, 0];
        this.extensionY.position = [0, posY];
        posX += this.extensionX.size[0];
        posY += this.extensionY.size[1];

        this.colPositions = colPositions;
        this.rowPositions = rowPositions;

        this.updateSelection();

        this.layer.size = [posX, posY];
    }

    updateSelection () {
        this.selectionView.startPos = [
            this.colPositions[this.selection.start[0]],
            this.rowPositions[this.selection.start[1]],
        ];
        this.selectionView.endPos = [
            this.colPositions[this.selection.end[0]],
            this.rowPositions[this.selection.end[1]],
        ];
        this.selectionView.layout();
        this.updateTypeSwitch();
    }

    updateTypeSwitch () {
        if (!this.typeSwitch) return;
        const types = new Set();
        for (let y = this.selection.start[1]; y < this.selection.end[1]; y++) {
            for (let x = this.selection.start[0]; x < this.selection.end[0]; x++) {
                if (!this.#cells[y]) continue;
                const cell = this.#cells[y][x];
                if (cell) types.add(cell.type);
            }
        }
        this.typeSwitch.update(types);
    }

    setSelectionType = (type) => {
        for (let y = this.selection.start[1]; y < this.selection.end[1]; y++) {
            for (let x = this.selection.start[0]; x < this.selection.end[0]; x++) {
                if (!this.#cells[y]) continue;
                const cell = this.#cells[y][x];
                if (cell) {
                    this.setCellType(x, y, type);
                }
            }
        }
        this.onMutation();
        const t = new Transaction(1, 0.3);
        this.layout();
        t.commit();
    };

    setCellType (x, y, type) {
        if (this.#is2D) {
            while (y >= this.value.length) this.value.push([]);
            const row = this.value[y];
            while (x >= row.length) row.push(null);
            row[x] = transmuteCellValue(row[x], type);
        } else {
            while (y >= this.value.length) this.value.push(null);
            this.value[y] = transmuteCellValue(this.value[y], type);
        }
    }

    setValueAt (x, y, value) {
        if (this.#is2D) {
            while (y >= this.value.length) this.value.push([]);
            const row = this.value[y];
            while (x >= row.length) row.push(null);
            row[x] = value;
        } else {
            while (x >= this.value.length) this.value.push(null);
            this.value[y] = value;
        }
        this.needsLayout = true;
    }

    getCellPositionAt (x, y) {
        let cellX = null;
        let cellY = null;
        for (let i = 0; i < this.rowPositions.length - 1; i++) {
            const ry = this.rowPositions[i];
            const rny = this.rowPositions[i + 1];
            if (y >= ry && y < rny) {
                cellY = i;
                break;
            }
        }
        if (cellY === null) return null;
        for (let i = 0; i < this.colPositions.length - 1; i++) {
            const cx = this.colPositions[i];
            const cnx = this.colPositions[i + 1];
            if (x >= cx && x < cnx) {
                cellX = i;
                break;
            }
        }
        if (cellX === null) return null;
        return [cellX, cellY];
    }

    isPosInSelection (x, y) {
        return this.selection.start[0] <= x && this.selection.end[0] > x
            && this.selection.start[1] <= y && this.selection.end[1] > y;
    }

    onTap = ({ x, y }) => {
        const pos = this.getCellPositionAt(x - this.position[0], y - this.position[1]);
        if (pos) {
            if (this.isPosInSelection(pos[0], pos[1])) {
                // edit cell
                this.#cells[pos[1]][pos[0]].beginEditing();
            } else {
                const t = new Transaction(1, 0.15);
                // set selection
                this.selection.start = pos;
                this.selection.end = [pos[0] + 1, pos[1] + 1];
                this.updateSelection();
                t.commit();
            }
        }
    };
    #dragStartPos = null;
    onDragStart = ({ x, y }) => {
        this.#dragStartPos = this.getCellPositionAt(x - this.position[0], y - this.position[1]);
        if (this.#dragStartPos) {
            const t = new Transaction(1, 0);
            this.selection.start = this.#dragStartPos.slice();
            this.selection.end = [this.#dragStartPos[0] + 1, this.#dragStartPos[1] + 1];
            this.updateSelection();
            t.commit();
        }
    };
    onDragMove = ({ x, y }) => {
        const pos = this.getCellPositionAt(x - this.position[0], y - this.position[1]);
        if (pos && this.#dragStartPos) {
            const t = new Transaction(1, 0.1);
            const minX = Math.min(pos[0], this.#dragStartPos[0]);
            const maxX = Math.max(pos[0], this.#dragStartPos[0]);
            const minY = Math.min(pos[1], this.#dragStartPos[1]);
            const maxY = Math.max(pos[1], this.#dragStartPos[1]);
            this.selection.start = [minX, minY];
            this.selection.end = [maxX + 1, maxY + 1];
            this.updateSelection();
            t.commit();
        }
    };
}

class TableHeader extends View {
    constructor (type) {
        super();
        this.type = type;
        this.needsLayout = true;

        this.layer.background = config.matrix.tableHeader.background;
        this.layer.cornerRadius = config.cornerRadius;
        this.deleteLayer = new Layer();
        this.deleteLayer.cornerRadius = config.cornerRadius;
        this.addSublayer(this.deleteLayer);

        this.deleteIcon = new PathLayer();
        this.deleteIcon.path = config.icons.delete;
        this.deleteLayer.addSublayer(this.deleteIcon);

        Gesture.onTap(this, this.onTap);
    }

    onTap = ({ x, y }) => {
        const px = x - this.position[0];
        const py = y - this.position[1];
        if (px < this.deleteLayer.size[0] && py < this.deleteLayer.size[1] && this.onDelete) {
            this.onDelete();
        }
    };

    #headerSize = 0;
    get headerSize () {
        return this.#headerSize;
    }
    set headerSize (v) {
        if (v === this.#headerSize) return;
        this.#headerSize = v;
        this.layout();
    }

    hovering = false;

    layout () {
        super.layout();

        this.deleteLayer.background = this.hovering
            ? config.matrix.tableHeader.delete
            : config.matrix.tableHeader.deleteIdle;
        this.deleteIcon.fill = this.hovering
            ? config.matrix.tableHeader.deleteColor
            : config.matrix.tableHeader.deleteColorIdle;
        this.deleteLayer.size = [20, 20];
        this.deleteIcon.position = [
            (this.deleteLayer.size[0] - config.icons.size) / 2,
            (this.deleteLayer.size[1] - config.icons.size) / 2,
        ];

        if (this.type === 'row') {
            this.size = [20, this.headerSize];
        } else {
            this.size = [this.headerSize, 20];
        }
    }

    updatePointer (x, y) {
        const px = x - this.position[0];
        const py = y - this.position[1];
        if (px < this.deleteLayer.size[0] && py < this.deleteLayer.size[0]) {
            if (!this.hovering) {
                const t = new Transaction(1, 0.1);
                this.hovering = true;
                this.layout();
                t.commit();
            }
        } else if (this.hovering) {
            const t = new Transaction(1, 0.3);
            this.hovering = false;
            this.layout();
            t.commit();
        }
    }
    onPointerEnter ({ x, y }) {
        this.updatePointer(x, y);
    }
    onPointerMove ({ x, y }) {
        this.updatePointer(x, y);
    }
    onPointerExit () {
        this.updatePointer(Infinity, 0);
    }
}

class TableExtension extends View {
    constructor (onExtend) {
        super();

        this.layer.background = config.matrix.tableExtension.background;
        this.layer.cornerRadius = config.cornerRadius;
        this.needsLayout = true;

        this.iconLayer = new PathLayer();
        this.iconLayer.path = config.icons.add;
        this.addSublayer(this.iconLayer);

        Gesture.onTap(this, onExtend);
    }

    hovering = false;

    layout () {
        super.layout();

        this.layer.background = this.hovering
            ? config.matrix.tableExtension.background
            : config.matrix.tableExtension.backgroundIdle;
        this.iconLayer.fill = this.hovering
            ? config.matrix.tableExtension.color
            : config.matrix.tableExtension.colorIdle;

        this.layer.size = [20, 20];
        this.iconLayer.position = [
            (this.layer.size[0] - config.icons.size) / 2,
            (this.layer.size[1] - config.icons.size) / 2,
        ];
    }

    onPointerEnter () {
        const t = new Transaction(1, 0.1);
        this.hovering = true;
        this.layout();
        t.commit();
    }
    onPointerExit () {
        const t = new Transaction(1, 0.3);
        this.hovering = false;
        this.layout();
        t.commit();
    }
}

/// A single cell in the editor.
class MatrixCell extends View {
    onMutation = () => {};

    constructor () {
        super();
        this.layer.strokeWidth = config.primitives.outlineWeight;
        this.layer.cornerRadius = config.cornerRadius;

        this.textLayer = new TextLayer();
        this.addSublayer(this.textLayer);
        this.textLayer.font = config.identFont;
        this.textLayer.color = config.primitives.color;

        this.previewTooltip = new Tooltip();
        this.previewView = new ValueView();
        this.addSubview(this.previewTooltip);
        this.previewTooltip.contents = this.previewView;

        this.needsLayout = true;
    }

    #value = null;
    get value () {
        return this.#value;
    }
    set value (v) {
        if (v === this.#value) return;
        this.#value = v;
        this.needsLayout = true;
    }
    /// Layout part 1
    getCellSize () {
        if (this.value === null) {
            this.type = 'null';
            this.layer.background = config.primitives.null;
            this.layer.stroke = config.primitives.nullOutline;
            this.textLayer.text = 'null';
            this.textLayer.align = 'center';
        } else if (typeof this.value === 'boolean') {
            this.type = 'bool';
            this.layer.background = config.primitives.bool;
            this.layer.stroke = config.primitives.boolOutline;
            this.textLayer.text = config.primitives['' + this.value];
            this.textLayer.align = 'center';
        } else if (typeof this.value === 'number') {
            this.type = 'number';
            this.layer.background = config.primitives.number;
            this.layer.stroke = config.primitives.numberOutline;
            this.textLayer.text = '' + this.value;
            this.textLayer.align = 'right';
        } else if (typeof this.value === 'string') {
            this.type = 'string';
            this.layer.background = config.primitives.string;
            this.layer.stroke = config.primitives.stringOutline;
            this.textLayer.text = this.value;
            this.textLayer.align = 'left';
        } else if (Array.isArray(this.value)) {
            this.type = 'matrix';
            this.layer.background = config.primitives.matrix;
            this.layer.stroke = config.primitives.matrixOutline;
            this.textLayer.text = '[…]';
            this.textLayer.align = 'center';
        }

        const textSize = this.textLayer.getNaturalSize();
        this.layoutTextSize = textSize;
        return [
            Math.max(config.matrix.minCellWidth, textSize[0] + 2 * config.primitives.paddingXS),
            Math.max(config.matrix.minCellHeight, textSize[1] + 2 * config.primitives.paddingYS),
        ];
    }
    /// Call getCellSize first!!
    layout () {
        super.layout();
        if (this.textLayer.align === 'center') {
            this.textLayer.position = [
                this.layer.size[0] / 2,
                this.layer.size[1] / 2,
            ];
        } else if (this.textLayer.align === 'left') {
            this.textLayer.position = [
                config.primitives.paddingXS,
                this.layer.size[1] / 2,
            ];
        } else if (this.textLayer.align === 'right') {
            this.textLayer.position = [
                this.layer.size[0] - config.primitives.paddingXS,
                this.layer.size[1] / 2,
            ];
        }

        this.previewTooltip.size = this.layer.size;
        this.previewTooltip.layoutIfNeeded();
    }

    beginEditing () {
        if (this.type === 'bool') {
            this.value = !this.value;
            this.onMutation();
            new Transaction(1, 0.3).commitAfterLayout(this.ctx);
        } else if (this.type === 'number') {
            this.ctx.beginInput(
                this.layer.absolutePosition,
                this.size,
                this.value.toString(),
                { font: config.identFont },
            ).then(value => {
                this.value = Number.parseFloat(value, 10);
                if (!Number.isFinite(this.value)) this.value = 0;
                this.onMutation();
                new Transaction(1, 0.3).commitAfterLayout(this.ctx);
            });
        } else if (this.type === 'string') {
            this.ctx.beginInput(
                this.layer.absolutePosition,
                this.size,
                this.value,
                { font: config.identFont },
            ).then(value => {
                this.value = value.normalize();
                this.onMutation();
                new Transaction(1, 0.3).commitAfterLayout(this.ctx);
            });
        } else if (this.type === 'matrix') {
            editMatrix(this.ctx, this.value, () => {
                this.onMutation();
            });
        }
    }

    onPointerEnter () {
        if (this.type === 'matrix') {
            this.previewView.value = this.value;
            this.previewView.layout();
            this.previewTooltip.visible = true;
        } else {
            this.previewView.value = null;
        }
    }
    onPointerExit () {
        this.previewTooltip.visible = false;
    }
}

/// Shows editor status such as selected cell count, cell index, etc.
class EditorStatus extends View {
    // TODO
}

/// Editor cell type switch at the top.
/// Displays types in the current selection and allows changing the type of all selected cells.
class CellTypeSwitch extends View {
    onSetSelectionType = () => {};
    constructor () {
        super();
        this.layer.cornerRadius = config.cornerRadius;
        this.layer.clipContents = true;

        this.items = [];
        for (const type in config.matrix.cellTypes) {
            const item = new CellTypeSwitchItem(config.matrix.cellTypes[type], () => this.setType(type));
            item.type = type;
            this.addSubview(item);
            this.items.push(item);
        }
        this.needsLayout = true;
    }
    update (types) {
        for (const item of this.items) {
            item.active = types.has(item.type);
            item.layout();
        }
    }
    setType (type) {
        this.onSetSelectionType(type);
    }
    layout () {
        super.layout();
        let x = 0;
        for (const item of this.items) {
            item.layoutIfNeeded();
            item.position = [x, 0];
            x += item.size[0];
        }
        this.layer.size = [x, this.items[0].size[1]];
    }
}
class CellTypeSwitchItem extends View {
    active = false;
    pressed = false;
    hovering = false;

    constructor (label, onTap) {
        super();
        this.labelLayer = new TextLayer();
        this.labelLayer.text = label;
        this.labelLayer.font = config.identFont;
        this.addSublayer(this.labelLayer);

        Gesture.onTap(this, onTap, this.onTapStart, this.onTapEnd);
        this.needsLayout = true;
    }
    layout () {
        super.layout();
        this.layer.background = (this.active || this.pressed)
            ? config.matrix.typeSwitch.activeBackground
            : config.matrix.typeSwitch.background;
        this.labelLayer.color = (this.active || this.pressed)
            ? config.matrix.typeSwitch.activeColor
            : config.matrix.typeSwitch.color;

        const labelSize = this.labelLayer.getNaturalSize();
        this.layer.size = [
            labelSize[0] + 2 * config.matrix.typeSwitch.paddingX,
            labelSize[1] + 2 * config.matrix.typeSwitch.paddingY,
        ];
        this.labelLayer.position = [
            config.matrix.typeSwitch.paddingX,
            this.size[1] / 2,
        ];
    }

    onTapStart = () => {
        const t = new Transaction(1, 0.1);
        this.pressed = true;
        this.layout();
        t.commit();
    };
    onTapEnd = () => {
        const t = new Transaction(1, 0.4);
        this.pressed = false;
        this.layout();
        t.commit();
    };
}

/// Selection box.
class EditorSelection extends View {
    constructor () {
        super();

        this.decorationOnly = true;

        this.boundStart = new Layer();
        this.boundEnd = new Layer();

        this.boundStart.size = this.boundEnd.size = [
            config.matrix.selectionBoundSize,
            config.matrix.selectionBoundSize,
        ];
        this.boundStart.background = this.boundEnd.background = this.layer.stroke = config.matrix.selectionColor;
        this.boundStart.cornerRadius = this.boundEnd.cornerRadius = config.matrix.selectionBoundSize / 2;
        this.layer.strokeWidth = config.matrix.selectionOutlineWidth;
        this.layer.cornerRadius = config.cornerRadius + config.matrix.cellSpacing / 2;

        this.addSublayer(this.boundStart);
        this.addSublayer(this.boundEnd);
    }

    startPos = [0, 0];
    endPos = [0, 0];

    layout () {
        // layout is controlled by table view
        // super.layout();

        this.layer.position = this.startPos;
        this.boundStart.position = [-this.boundStart.size[0] / 2, -this.boundStart.size[1] / 2];
        this.layer.size = [
            this.endPos[0] - this.startPos[0],
            this.endPos[1] - this.startPos[1],
        ];
        this.boundEnd.position = [
            this.layer.size[0] - this.boundEnd.size[0] / 2,
            this.layer.size[1] - this.boundEnd.size[1] / 2,
        ];
    }
}

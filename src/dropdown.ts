import { Window, View, Layer, TextLayer, PathLayer, Transaction, Gesture } from './ui';
import config from './config';
import { InputCapture, PushedWindow } from './ui/context';
import { Vec2 } from './spring';

/// A dropdown.
///
/// # Properties
/// - expr: { value: string, ctx }
/// - spec: { variants: { [value]: label } }
export class Dropdown extends View {
    anchorView: View;
    anchorLayer: Layer;
    bgLayer: Layer;
    highlightLayer: Layer;
    iconLayer: PathLayer;
    labels: Map<string, TextLayer>;
    anchored: boolean;

    worldAnchor: PushedWindow | null = null;
    capture: InputCapture | null = null;
    hitWidth = 0;
    hovering = false;
    dragStart: [number, number] | null = null;
    lastLocation: [number, number] | null = null;
    didDragSelect = false;

    constructor (expr, spec) {
        super();

        this.expr = expr;
        this.spec = spec;

        this.layer.background = config.primitives.string;
        this.layer.stroke = config.primitives.stringOutline;
        this.layer.strokeWidth = config.primitives.outlineWeight;
        this.layer.cornerRadius = config.cornerRadius;

        this.anchorView = new View();
        this.anchorLayer = this.anchorView.layer;
        this.addSubview(this.anchorView);

        this.bgLayer = new Layer();
        this.bgLayer.background = this.layer.background;
        this.bgLayer.stroke = this.layer.stroke;
        this.bgLayer.strokeWidth = this.layer.strokeWidth;
        this.bgLayer.cornerRadius = this.layer.cornerRadius;
        this.anchorLayer.addSublayer(this.bgLayer);

        this.highlightLayer = new Layer();
        this.highlightLayer.background = config.primitives.stringHighlight;
        this.highlightLayer.cornerRadius = this.layer.cornerRadius;
        this.anchorLayer.addSublayer(this.highlightLayer);

        this.iconLayer = new PathLayer();
        this.iconLayer.path = config.icons.dropdown;
        this.anchorLayer.addSublayer(this.iconLayer);
        this.labels = new Map();

        this.anchored = true;

        Gesture.rawPointerCapture(this, this.onPointerStart, this.onPointerDrag, this.onPointerEnd, this.onPointerCancel);
    }

    #expr;
    #spec;
    #hasTentativeChild: View | null = null;
    #expanded = false;

    get expr () {
        return this.#expr;
    }
    set expr (value) {
        if (value === this.#expr) return;
        this.#expr = value;
        this.needsLayout = true;
    }
    get spec () {
        return this.#spec;
    }
    set spec (value) {
        if (value === this.#spec) return;
        this.#spec = value;
        this.needsLayout = true;
    }
    get hasTentativeChild () {
        return this.#hasTentativeChild;
    }
    set hasTentativeChild (value) {
        if (value === this.#hasTentativeChild) return;
        this.#hasTentativeChild = value;
        this.needsLayout = true;
    }

    get expanded () {
        return this.#expanded;
    }
    set expanded (value) {
        this.#expanded = value;
        this.layout();
    }

    hitTargets = [];
    highlight = null;

    getIntrinsicSize(): Vec2 {
        // FIXME: don't do this probably
        return this.layoutIfNeeded();
    }

    layout () {
        super.layout();

        for (const k in this.spec.variants) {
            if (!this.labels.has(k)) {
                const textLayer = new TextLayer();
                textLayer.font = config.identFont;
                this.labels.set(k, textLayer);
                this.anchorLayer.addSublayer(textLayer);
            }
            const textLayer = this.labels.get(k);
            textLayer.text = this.spec.variants[k];
            this.labels.set(k, textLayer);
        }

        for (const [k, v] of this.labels) {
            if (!(k in this.spec.variants)) {
                this.anchorLayer.removeSublayer(v);
                this.labels.delete(k);
            }
        }

        const selected = this.expr.value;
        const selectedLabel = this.labels.get(selected);

        if (this.#expanded) {
            if (this.anchored) {
                // the content view is anchored to this view, but we actually want it in its own
                // window
                this.anchored = false;
                this.removeSubview(this.anchorView);
                const t = new Transaction(0, 0);
                const win = new Window();
                const windowRoot = new View();
                win.addSubview(windowRoot);
                windowRoot.addSubview(this.anchorView);
                this.worldAnchor = this.ctx.push(win);
                this.capture = this.ctx.beginCapture(this);
                this.anchorView.position = this.absolutePosition;
                t.commit();
            }

            const keyArray = [...this.labels.keys()];
            const selectedIndex = keyArray.indexOf(selected);

            let itemWidth = 0;
            let itemHeight = 8;
            for (const label of this.labels.values()) {
                const labelSize = label.getNaturalSize();
                itemWidth = Math.max(itemWidth, labelSize[0]);
                itemHeight = Math.max(itemHeight, labelSize[1]);
            }

            this.bgLayer.size = [
                itemWidth + config.icons.size + 4 + config.primitives.paddingX * 2,
                itemHeight * keyArray.length + config.primitives.paddingY * (keyArray.length + 1),
            ];
            this.bgLayer.position = [
                0,
                -config.primitives.paddingY - selectedIndex * (itemHeight + config.primitives.paddingY),
            ];
            this.bgLayer.stroke = this.highlightLayer.background;

            // anchor view position is the absolute position
            if (this.anchorView.position[1] + this.bgLayer.position[1] < 0) {
                // clipping the top!
                this.bgLayer.position[1] = -this.anchorView.position[1];
            }
            if (this.anchorView.position[1] + this.bgLayer.position[1] + this.bgLayer.size[1] > this.ctx.window.size[1]) {
                // clipping the bottom!
                this.bgLayer.position[1] = this.ctx.window.size[1] - this.bgLayer.size[1] - this.anchorView.position[1];
            }

            this.layer.size = [
                this.bgLayer.size[0],
                itemHeight + config.primitives.paddingYS * 2,
            ];

            this.iconLayer.position = [
                this.layer.size[0] - config.primitives.paddingX - config.icons.size,
                (this.layer.size[1] - config.icons.size) / 2,
            ];
            this.iconLayer.fill = config.primitives.iconColor0;

            this.highlightLayer.size = [this.bgLayer.size[0], itemHeight + config.primitives.paddingY * 2];
            if (this.highlight !== null) {
                this.highlightLayer.position = [
                    0,
                    this.bgLayer.position[1] + this.highlight * (itemHeight + config.primitives.paddingY),
                ];
                this.highlightLayer.opacity = 1;
            } else {
                this.highlightLayer.opacity = 0;
            }

            this.hitTargets = [];
            this.hitWidth = this.bgLayer.size[0];

            let i = 0;
            for (const [id, label] of this.labels) {
                const yStart = this.bgLayer.position[1] + config.primitives.paddingY + i * (itemHeight + config.primitives.paddingY);

                label.position = [
                    this.bgLayer.position[0] + config.primitives.paddingX,
                    yStart + itemHeight / 2,
                ];

                this.hitTargets.push([yStart - config.primitives.paddingY, yStart + itemHeight + config.primitives.paddingY / 2, id]);

                const isHighlighted = this.highlight === i;

                label.color = isHighlighted ? config.primitives.colorH : config.primitives.color;
                i++;
            }
        } else {
            if (!this.anchored) {
                this.anchored = true;
                if (this.worldAnchor) {
                    this.worldAnchor.pop();
                    this.anchorView.parent.removeSubview(this.anchorView);
                    this.addSubview(this.anchorView);
                }
                if (this.capture) {
                    this.capture.end();
                    this.capture = null;
                }
                const t = new Transaction(1, 0);
                this.anchorView.position = [0, 0];
                t.commit();
            }

            let selectedLabelSize = [0, 0];
            if (selectedLabel) {
                selectedLabelSize = selectedLabel.getNaturalSize();
            }

            this.layer.stroke = this.hovering ? config.primitives.stringHighlight : config.primitives.stringOutline;

            this.layer.size = [
                selectedLabelSize[0] + 4 + config.icons.size + config.primitives.paddingX * 2,
                selectedLabelSize[1] + config.primitives.paddingYS * 2,
            ];
            this.bgLayer.position = [0, 0];
            this.bgLayer.size = this.layer.size;
            this.bgLayer.stroke = this.layer.stroke;
            this.highlightLayer.position = this.bgLayer.position;
            this.highlightLayer.size = this.bgLayer.size;
            this.highlightLayer.opacity = 0;

            this.iconLayer.position = [
                this.layer.size[0] - config.primitives.paddingX - config.icons.size,
                (this.layer.size[1] - config.icons.size) / 2,
            ];
            this.iconLayer.fill = config.primitives.iconColor;

            for (const label of this.labels.values()) {
                label.color = label === selectedLabel ? config.primitives.color : config.primitives.color0;
                label.position = [config.primitives.paddingX, this.layer.size[1] / 2];
            }
        }

        this.layer.opacity = this.hasTentativeChild ? 0.5 : 1;

        return this.size;
    }

    expand (x, y) {
        const t = new Transaction(1, 0.1);
        this.highlight = [...this.labels.keys()].indexOf(this.expr.value);
        this.expanded = true;
        this.dragStart = [x, y];
        this.didDragSelect = false;
        t.commitAfterLayout(this.ctx);
    }
    collapse () {
        const t = new Transaction(1, 0.3);
        this.expanded = false;
        t.commitAfterLayout(this.ctx);
        this.dragStart = null;
    }
    selectAndCollapse (x, y) {
        let hit = null;
        if (x >= 0 && x < this.hitWidth) {
            for (const [tby, ty, target] of this.hitTargets) {
                if (y > tby && y < ty) {
                    hit = target;
                    break;
                }
            }
        }

        const t = new Transaction(1, 0.3);

        if (hit) {
            this.expr.value = hit;
            this.expr.ctx.notifyMutation(this.expr);
        }
        this.expanded = false;

        t.commitAfterLayout(this.ctx);
        this.dragStart = null;
    }

    onPointerStart = ({ x, y }) => {
        if (this.expanded) this.selectAndCollapse(x, y);
        else this.expand(x, y);
    };
    onPointerDrag = (event) => {
        if (this.expanded) {
            this.onPointerMove(event);

            const { x, y } = event;
            const distance = Math.hypot(x - this.dragStart[0], y - this.dragStart[1]);
            if (distance > 6) {
                this.didDragSelect = true;
            }
            this.lastLocation = [x, y];
        }
    };
    onPointerEnd = () => {
        if (this.didDragSelect) {
            const [x, y] = this.lastLocation;
            this.selectAndCollapse(x, y);
        }
    };
    onPointerCancel = () => {
        this.collapse();
    };
    onPointerEnter () {
        this.hovering = true;
        const t = new Transaction(1, 0.3);
        this.layout();
        t.commit();
    }
    onPointerExit () {
        this.hovering = false;
        const t = new Transaction(1, 0.3);
        this.layout();
        t.commit();
    }
    onPointerMove ({ x, y }) {
        let newHighlight = null;
        let i = 0;
        if (x >= 0 && x < this.hitWidth) {
            for (const [tby, ty] of this.hitTargets) {
                if (y >= tby && y < ty) {
                    newHighlight = i;
                    break;
                }
                i++;
            }
        }

        if (newHighlight !== this.highlight) {
            const t = new Transaction(0.8, 0.2);
            this.highlight = newHighlight;
            this.layout();
            t.commit();
        }
    }
}

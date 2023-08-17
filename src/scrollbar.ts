import { View, Layer, Transaction, Gesture } from './ui';
import config from './config';

export class Scrollbar extends View {
    orientation: 'vertical' | 'horizontal' = 'vertical';
    edge = 0;
    length = 0;
    scrollMax = 0;
    scroll = 0;
    onScroll: ((delta: number) => void) = () => {};

    thumbLayer: Layer;

    constructor () {
        super();

        this.layer.background = config.scrollbar.background;
        this.layer.cornerRadius = config.cornerRadius;

        this.thumbLayer = new Layer();
        this.thumbLayer.background = config.scrollbar.thumb;
        this.thumbLayer.cornerRadius = config.cornerRadius;

        this.needsLayout = true;

        Gesture.onTap(this, this.onTap);
        Gesture.onDrag(this, this.onDragMove);
    }

    layout () {
        const posAcross = this.edge - config.scrollbar.margin - config.scrollbar.size;
        const posAlong = config.scrollbar.margin;

        const length = this.length - config.scrollbar.margin * 2;

        const thumbSize = Math.max(
            length * length / (length + this.scrollMax),
            config.scrollbar.minThumbSize
        );
        const thumbPos = (length - thumbSize) * (this.scroll / this.scrollMax);

        switch (this.orientation) {
            case 'horizontal':
                this.position = [posAlong, posAcross];
                this.size = [length, config.scrollbar.size];

                if (this.scrollMax) {
                    this.thumbLayer.size = [thumbSize, config.scrollbar.size];
                    this.thumbLayer.position = [thumbPos, 0];
                    this.thumbLayer.opacity = 1;
                } else {
                    this.thumbLayer.position = [0, 0];
                    this.thumbLayer.size = [length, config.scrollbar.size];
                    this.thumbLayer.opacity = 0;
                }
                break;
            case 'vertical':
                this.position = [posAcross, posAlong];
                this.size = [config.scrollbar.size, length];

                if (this.scrollMax) {
                    this.thumbLayer.size = [config.scrollbar.size, thumbSize];
                    this.thumbLayer.position = [0, thumbPos];
                    this.thumbLayer.opacity = 1;
                } else {
                    this.thumbLayer.position = [0, 0];
                    this.thumbLayer.size = [config.scrollbar.size, length];
                    this.thumbLayer.opacity = 0;
                }
                break;
        }

        return this.size;
    }

    onDragMove = ({ dx, dy }: { dx: number, dy: number }) => {
        const axis = this.orientation === 'horizontal' ? 'x' : 'y';
        const delta = { x: dx, y: dy }[axis];

        const scale = this.scrollMax / (this.size[axis] - this.thumbLayer.size[axis]);
        this.onScroll(delta * scale);
    };

    onTap = ({ x, y }: { x: number, y: number }) => {
        const axis = this.orientation === 'horizontal' ? 'x' : 'y';
        const pos = { x, y }[axis];

        // scroll burst when the user clicks above or below the thumb
        if (pos < this.thumbLayer.position[axis]) this.scrollBurst(-1);
        else if (pos > this.thumbLayer.position[axis] + this.thumbLayer.size[axis]) this.scrollBurst(1);
    };

    scrollBurst (dir: number) {
        const axis = this.orientation === 'horizontal' ? 'x' : 'y';

        const t = new Transaction(1, 0.5);
        this.onScroll(dir * Math.max(Math.min(this.size[axis], 100), this.size[axis] / 3));
        t.commitAfterLayout(this.ctx);
    }

    onPointerEnter () {
        const t = new Transaction(1, 0.1);
        this.thumbLayer.background = config.scrollbar.hoverThumb;
        t.commit();
    }
    onPointerExit () {
        const t = new Transaction(1, 0.5);
        this.thumbLayer.background = config.scrollbar.thumb;
        t.commit();
    }

    *iterSublayers () {
        yield this.thumbLayer;
    }
}

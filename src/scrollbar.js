import { View, Layer, Transaction, Gesture } from './ui';
import config from './config';

export class Scrollbar extends View {
    edgeX = 0;
    height = 0;
    scrollMax = 0;
    scroll = 0;
    onScroll = () => {};

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
        super.layout();

        this.position = [
            this.edgeX - config.scrollbar.margin - config.scrollbar.size,
            config.scrollbar.margin,
        ];
        this.size = [
            config.scrollbar.size,
            this.height - 2 * config.scrollbar.margin,
        ];

        if (this.scrollMax) {
            const thumbSize = Math.max(
                this.height * this.height / (this.height + this.scrollMax),
                config.scrollbar.minThumbSize
            );
            const thumbY = (this.size[1] - thumbSize) * (this.scroll / this.scrollMax);

            this.thumbLayer.position = [0, thumbY];
            this.thumbLayer.size = [config.scrollbar.size, thumbSize];
        } else {
            this.thumbLayer.position = [0, 0];
            this.thumbLayer.size = [config.scrollbar.size, 0];
        }
    }

    onDragMove = ({ dy }) => {
        const scale = this.scrollMax / (this.size[1] - this.thumbLayer.size[1]);
        this.onScroll(dy * scale);
    };

    onTap = ({ y }) => {
        // scroll burst when the user clicks above or below the thumb
        if (y < this.thumbLayer.position[1]) this.scrollBurst(-1);
        else if (y > this.thumbLayer.position[1] + this.thumbLayer.size[1]) this.scrollBurst(1);
    };

    scrollBurst (dir) {
        const t = new Transaction(1, 0.5);
        this.onScroll(dir * Math.max(Math.min(this.size[1], 100), this.size[1] / 3));
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

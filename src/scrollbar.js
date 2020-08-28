import { View, Layer } from './ui';
import config from './config';

export default class Scrollbar extends View {
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

    #lastDragPos = 0;
    onPointerStart ({ absY }) {
        this.#lastDragPos = absY;
        this.thumbLayer.background = config.scrollbar.hoverThumb;
    }
    onPointerDrag({ absY }) {
        const screenDelta = absY - this.#lastDragPos;
        this.#lastDragPos = absY;

        const scale = this.scrollMax / (this.size[1] - this.thumbLayer.size[1]);
        this.onScroll(screenDelta * scale);
    }
    onPointerEnd () {
        this.thumbLayer.background = config.scrollbar.thumb;
    }

    *iterSublayers () {
        yield this.thumbLayer;
    }
}

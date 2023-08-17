import { Gesture, Layer, View } from './ui';
import config from './config';
import { Vec2 } from './spring';
import { Scrollbar } from './scrollbar';

export class ScrollView extends View {
    scrollX = false;
    scrollY = true;

    stretchX = false;

    scroll = Vec2.zero();
    maxScroll = Vec2.zero();

    scrollbarX = new Scrollbar();
    scrollbarY = new Scrollbar();

    contentView = new View();

    wantsChildLayout = true;

    constructor() {
        super();

        this.contentView.layoutProps.layout = 'flex';
        this.contentView.layoutProps.mainAlign = 'stretch';
        this.contentView.wantsChildLayout = true;

        this.layer.clipContents = true;

        this.addSubview(this.contentView);

        this.scrollbarX.orientation = 'horizontal';
        this.scrollbarX.onScroll = this.onScrollX;
        this.scrollbarY.onScroll = this.onScrollY;

        Gesture.onScroll(this, this.onScroll);
    }

    *iterSubviews() {
        if (this.scrollX) yield this.scrollbarX;
        if (this.scrollY) yield this.scrollbarY;
    }

    onScroll = ({ dx, dy } : { dx: number, dy: number }) => {
        this.onScrollX(dx);
        this.onScrollY(dy);
        this.needsLayout = true;
    };

    onScrollX = (dx: number) => {
        if (!this.scrollX) return;
        this.scroll.x = Math.max(0, Math.min(this.scroll.x + dx, this.maxScroll.x));
        this.needsLayout = true;
    };
    onScrollY = (dy: number) => {
        if (!this.scrollY) return;
        this.scroll.y = Math.max(0, Math.min(this.scroll.y + dy, this.maxScroll.y));
        this.needsLayout = true;
    };

    getIntrinsicSize(): Vec2 {
        const size = this.contentView.getIntrinsicSize();

        // intrinsic size is 0 in the direction that can scroll
        if (this.scrollX) size.x = 0;
        if (this.scrollY) size.y = 0;

        // add scrollbar size
        if (this.scrollX) size.y += config.scrollbar.margin * 2 + config.scrollbar.size;
        if (this.scrollY) size.x += config.scrollbar.margin * 2 + config.scrollbar.size;

        return size;
    }

    get offset () {
        const pos = this.layer.absolutePosition;
        return new Vec2(-pos[0] + this.scroll[0], -pos[1] + this.scroll[1]);
    }

    layout() {
        this.contentView.inheritedMaxSize.x = this.scrollX ? Infinity : this.inheritedMaxSize.x;
        this.contentView.inheritedMaxSize.y = this.scrollY ? Infinity : this.inheritedMaxSize.y;

        if (!this.scrollX || this.stretchX) {
            this.contentView.size.x = this.size.x - config.scrollbar.margin * 2 - config.scrollbar.size;
        }
        if (!this.scrollY) {
            this.contentView.size.y = this.size.y - config.scrollbar.margin * 2 - config.scrollbar.size;
        }

        const intrinsicSize = this.contentView.getIntrinsicSize();

        this.contentView.size.y = intrinsicSize.y;
        if (!this.stretchX || intrinsicSize.x > this.contentView.size.x) {
            this.contentView.size.x = intrinsicSize.x;
        }

        this.contentView.layout();

        if (this.scrollX) {
            this.scrollbarX.edge = this.size.y;
            this.scrollbarX.length = this.size.x;
            this.scrollbarX.scroll = this.scroll.x;

            let maxScroll = this.contentView.size.x - this.size.x;
            if (this.scrollY) {
                maxScroll += config.scrollbar.margin * 2 + config.scrollbar.size;
                this.scrollbarX.length -= config.scrollbar.margin * 2 + config.scrollbar.size;
            }

            this.maxScroll.x = this.scrollbarX.scrollMax = Math.max(0, maxScroll);
            this.scrollbarX.layout();
        }

        if (this.scrollY) {
            this.scrollbarY.edge = this.size.x;
            this.scrollbarY.length = this.size.y;
            this.scrollbarY.scroll = this.scroll.y;

            let maxScroll = this.contentView.size.y - this.size.y;
            if (this.scrollX) {
                maxScroll += config.scrollbar.margin * 2 + config.scrollbar.size;
                this.scrollbarY.length -= config.scrollbar.margin * 2 + config.scrollbar.size;
            }

            this.maxScroll.y = this.scrollbarY.scrollMax = Math.max(0, maxScroll);
            this.scrollbarY.layout();
        }

        this.scroll.x = Math.max(0, Math.min(this.scroll.x, this.maxScroll.x));
        this.scroll.y = Math.max(0, Math.min(this.scroll.y, this.maxScroll.y));

        this.contentView.position = [-this.scroll.x, -this.scroll.y];

        let wantedSize = this.size.clone();
        if (!this.scrollX) wantedSize.x = this.contentView.size.x;
        if (!this.scrollY) wantedSize.y = this.contentView.size.y;

        return wantedSize;
    }
}
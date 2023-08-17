import { View, PortalView, Layer, ArrowLayer, Transaction } from './ui';
import config from './config';
import { Vec2 } from './spring';

/// Renders a tooltip with an arrow.
///
/// # Instance properties
/// - visible: bool
/// - contents: View
export class Tooltip extends View {
    #visible = false;
    #contents: View | null = null;

    portal: PortalView;
    innerView: View;
    bgLayer: Layer;
    arrowLayer: ArrowLayer;

    wantsChildLayout = true;

    constructor () {
        super();

        this.portal = new PortalView();
        this.innerView = new View();
        this.innerView.decorationOnly = true;
        this.innerView.wantsChildLayout = true;
        this.portal.contents = this.innerView;

        this.bgLayer = new Layer();
        this.bgLayer.background = config.peek.background;
        this.bgLayer.cornerRadius = config.cornerRadius + 6;
        this.innerView.addSublayer(this.bgLayer);

        this.arrowLayer = new ArrowLayer();
        this.arrowLayer.arrowSize = 8;
        this.arrowLayer.stroke = config.peek.background;
        this.arrowLayer.strokeWidth = 4;
        this.innerView.addSublayer(this.arrowLayer);

        this.innerView.layer.opacity = 0;
    }

    decorationOnly = true;

    get visible () {
        return this.#visible;
    }
    set visible (value) {
        if (value === this.#visible) return;
        this.#visible = value;
        this.needsLayout = true;
        if (value) {
            this.openPortal();
        } else {
            this.closePortal();
        }
    }

    #portalIsOpen = false;
    #portalCloseTimeout = null;
    openPortal () {
        clearTimeout(this.#portalCloseTimeout);
        if (this.#portalIsOpen) return;
        this.#portalIsOpen = true;
        this.addSubview(this.portal);
    }
    closePortal () {
        if (!this.#portalIsOpen) return;
        if (this.#portalCloseTimeout) return;
        this.#portalCloseTimeout = setTimeout(() => {
            this.removeSubview(this.portal);
            this.#portalIsOpen = false;
            this.#portalCloseTimeout = null;
        }, 300);
    }

    willDetach () {
        clearTimeout(this.#portalCloseTimeout);
        this.#portalCloseTimeout = null;
        this.removeSubview(this.portal);
        this.#portalIsOpen = false;
    }

    get contents () {
        return this.#contents;
    }
    set contents (view) {
        if (view === this.#contents) return;
        if (this.#contents) this.innerView.removeSubview(this.#contents);
        this.#contents = view;
        if (this.#contents) this.innerView.addSubview(this.#contents);
        this.#contents.needsLayout = true;
        this.needsLayout = true;
    }

    time = 0;
    lastTime = 0;

    layout () {
        this.needsLayout = false;

        const time = this.time;
        const deltaTime = (Date.now() - this.lastTime) / 1000;
        this.lastTime = Date.now();
        this.time += Math.max(1 / 244, Math.min(deltaTime, 1 / 30));

        if (!this.ctx || !this.ctx.window) {
            this.innerView.layer.opacity = 0;
            return;
        }

        if (this.contents?.needsLayout) {
            this.innerView.size = this.contents.size = this.contents.getIntrinsicSize();
            this.contents.layout();
        }

        const anchor = this.absolutePosition;
        anchor.x += this.size.x / 2;

        {
            const t = new Transaction(0, 0);
            this.innerView.layer.position = anchor;
            t.commit();
        }

        if (this.contents) {
            this.bgLayer.size = [
                this.contents.size.x + 12,
                this.contents.size.y + 12,
            ];
        } else {
            this.bgLayer.size = [0, 0];
        }

        const t = new Transaction(1, 0.2);
        const wasVisible = !!this.innerView.layer.opacity;
        this.innerView.layer.opacity = this.#visible ? 1 : 0;

        const offsetY = this.#visible ? 12 + 2 * Math.sin(time * 4) : 0;
        const maxOffsetY = this.#visible ? 14 : 0;

        let contentsSize = Vec2.zero();
        if (this.contents) contentsSize = this.contents.size.clone();

        // center position
        const popoutPos = new Vec2(0, -offsetY - contentsSize[1] / 2);
        const maxPopoutPos = new Vec2(0, -maxOffsetY - contentsSize[1] / 2);

        if (anchor.x + maxPopoutPos.x - this.bgLayer.size.x / 2 < 16) {
            // too close to the left edge
            popoutPos.x = 16 + this.bgLayer.size[0] / 2 - anchor.x;
        }
        const almostRightEdge = this.ctx.window.size.x - 16;
        if (anchor.x + maxPopoutPos.x + this.bgLayer.size.x / 2 > almostRightEdge) {
            // too close to the right edge
            popoutPos.x = (almostRightEdge - this.bgLayer.size.x / 2) - anchor.x;
        }
        if (anchor.y + maxPopoutPos.y - this.bgLayer.size.y / 2 < 16) {
            anchor.y += this.size.y;
            // too close to the top edge
            popoutPos.y = offsetY + contentsSize.y / 2;
        }

        if (!wasVisible) t.commit();

        if (this.contents) {
            this.contents.position = [
                popoutPos.x - this.contents.size.x / 2,
                popoutPos.y - this.contents.size.y / 2,
            ];
        }
        this.bgLayer.position = [
            popoutPos.x - this.bgLayer.size.x / 2,
            popoutPos.y - this.bgLayer.size.y / 2,
        ];

        this.arrowLayer.start = popoutPos;
        this.arrowLayer.control1 = popoutPos;
        this.arrowLayer.control2 = [0, 0];
        this.arrowLayer.end = [0, 0];

        if (wasVisible) t.commit();

        if (this.#visible) {
            this.needsLayout = true;
        } else {
            this.time = 0;
        }

        return this.size;
    }
}

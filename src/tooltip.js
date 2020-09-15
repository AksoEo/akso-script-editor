import { View, PortalView, Layer, ArrowLayer, Transaction } from './ui';
import config from './config';

/// Renders a tooltip with an arrow.
///
/// # Instance properties
/// - visible: bool
/// - contents: View
export class Tooltip extends View {
    #visible = false;
    #contents = null;

    constructor () {
        super();

        this.portal = new PortalView();
        this.innerView = new View();
        this.innerView.decorationOnly = true;
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

    get decorationOnly () {
        return true;
    }

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
        this.needsLayout = true;
    }

    time = 0;

    layout () {
        const time = this.time;
        this.time += 1 / 60; // close enough

        if (!this.ctx.window) {
            this.innerView.layer.opacity = 0;
            return;
        }

        this.innerView.layoutIfNeeded();
        if (this.contents) this.contents.layoutIfNeeded();

        const anchor = this.absolutePosition;
        anchor[0] += this.size[0] / 2;

        {
            const t = new Transaction(0, 0);
            this.innerView.layer.position = anchor;
            t.commit();
        }

        if (this.contents) {
            this.bgLayer.size = [
                this.contents.size[0] + 12,
                this.contents.size[1] + 12,
            ];
        } else {
            this.bgLayer.size = [0, 0];
        }

        const t = new Transaction(1, 0.2);
        const wasVisible = !!this.innerView.layer.opacity;
        this.innerView.layer.opacity = this.#visible ? 1 : 0;

        const offsetY = this.#visible ? 12 + 2 * Math.sin(time * 4) : 0;
        const maxOffsetY = this.#visible ? 14 : 0;

        let contentsSize = [0, 0];
        if (this.contents) contentsSize = this.contents.size.slice();

        // center position
        const popoutPos = [0, -offsetY - contentsSize[1] / 2];
        const maxPopoutPos = [0, -maxOffsetY - contentsSize[1] / 2];

        if (anchor[0] + maxPopoutPos[0] - this.bgLayer.size[0] / 2 < 16) {
            // too close to the left edge
            popoutPos[0] = 16 + this.bgLayer.size[0] / 2 - anchor[0];
        }
        const almostRightEdge = this.ctx.window.size[0] - 16;
        if (anchor[0] + maxPopoutPos[0] + this.bgLayer.size[0] / 2 > almostRightEdge) {
            // too close to the right edge
            popoutPos[0] = (almostRightEdge - this.bgLayer.size[0] / 2) - anchor[0];
        }
        if (anchor[1] + maxPopoutPos[1] - this.bgLayer.size[1] / 2 < 16) {
            anchor[1] += this.size[1];
            // too close to the top edge
            popoutPos[1] = offsetY + contentsSize[1] / 2;
        }

        if (!wasVisible) t.commit();

        if (this.contents) {
            this.contents.position = [
                popoutPos[0] - this.contents.size[0] / 2,
                popoutPos[1] - this.contents.size[1] / 2,
            ];
        }
        this.bgLayer.position = [
            popoutPos[0] - this.bgLayer.size[0] / 2,
            popoutPos[1] - this.bgLayer.size[1] / 2,
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
    }
}

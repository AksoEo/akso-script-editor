import { svgNS } from './layer/base';

/// Like a ViewRoot, but render-only, and sizes itself to fit content.
export class RenderViewRoot {
    /// a stack of windows. the topmost is the active one.
    windows = [];

    wantsChildLayout = true;

    constructor () {
        this.node = document.createElement('div');
        this.node.setAttribute('class', 'asce-render-view-root');
        this.svgNode = document.createElementNS(svgNS, 'svg');
        this.svgNode.setAttribute('class', 'asce-inner-view-root');
        this.svgNode.style.cursor = 'default';
        this.svgNode.style.webkitUserSelect = this.svgNode.style.userSelect = 'none';

        this.node.style.position = 'relative';

        this.node.appendChild(this.svgNode);

        this.ctx = {
            render: {
                scheduleLayout: this.scheduleLayout,
                scheduleDisplay: this.scheduleDisplay,
                scheduleCommitAfterLayout: this.scheduleCommitAfterLayout,
            },
            nodesAtPoint: this.getNodesAtPoint,
            beginCapture: () => {},
            push: () => {},
        };
    }

    setOverflow (value) {
        this.svgNode.style.overflow = value;
    }

    /// Pushes a window.
    pushWindow (view) {
        this.windows.push(view);
        this.svgNode.appendChild(view.layer.node);
        view.layer.didMount(this.ctx);
        view.didAttach(this.ctx);
        view.didMount(null);

        this.layout();
    }
    popWindow () {
        const view = this.windows.pop();
        if (!view) return;
        this.svgNode.removeChild(view.layer.node);
        if (!view.parent) {
            view.didUnmount();
            view.didDetach();
        }
    }

    #getNodesAtPointInner = (x, y, ox, oy, layer, targets) => {
        if (layer.owner && layer.owner.decorationOnly) return;

        let doSublayers = false;
        const pos = layer.position;
        const size = layer.size || [0, 0];

        const px = x - ox;
        const py = y - oy;

        if (px >= pos[0] && px < pos[0] + size[0]
            && py >= pos[1] && py < pos[1] + size[1]) {
            if (layer.owner) targets.push({
                target: layer.owner,
                x: ox,
                y: oy,
            });
            doSublayers = true;
        } else if (!layer.clipContents) doSublayers = true;

        if (doSublayers) {
            for (const sublayer of layer.sublayers) {
                this.#getNodesAtPointInner(x, y, ox + pos[0], oy + pos[1], sublayer, targets);
            }
        }
    };

    getTargetsAtPoint = (x, y) => {
        const stackTop = this.windows[this.windows.length - 1];
        if (!stackTop) return [];
        const targets = [];
        this.#getNodesAtPointInner(x, y, 0, 0, stackTop.layer, targets);
        return targets;
    };
    getNodesAtPoint = (x, y) => {
        return this.getTargetsAtPoint(x, y).map(({ target }) => target);
    };

    layout () {
        let width = 0;
        let height = 0;

        for (const window of this.windows) {
            width = Math.max(width, window.size[0]);
            height = Math.max(height, window.size[1]);
        }

        this.node.style.width = width + 'px';
        this.svgNode.setAttribute('width', width);
        this.node.style.height = height + 'px';
        this.svgNode.setAttribute('height', height);
    }

    // animation loop handling
    animationLoopId = 0;
    animationLoop = false;
    emptyCycles = 0;

    scheduledLayout = new Set();
    scheduleLayout = (view) => {
        if (this._currentLayoutSet && !this._currentLayoutSet.has(view)) {
            // we got a layout schedule request while currently in layout;
            // batch this view for the current run as well, if possible
            this._currentLayoutSet.add(view);
            return;
        }
        this.scheduledLayout.add(view);
        this.startLoop(true);
    };

    scheduledDisplay = new Set();
    scheduleDisplay = (layer) => {
        this.scheduledDisplay.add(layer);
        this.startLoop();
    };

    scheduledLayoutCommits = new Set();
    scheduleCommitAfterLayout = (transaction) => {
        this.scheduledLayoutCommits.add(transaction);
        this.startLoop(true);
    };

    /// Starts the animation loop.
    startLoop (defer) {
        if (this.animationLoop) return;
        this.animationLoop = true;
        const id = ++this.animationLoopId;
        this.emptyCycles = 0;
        if (defer) requestAnimationFrame(() => this.loop(id));
        else this.loop(id);
    }

    /// Makes this view root inert.
    destroy () {
        this.animationLoopId = NaN;
    }

    /// Animation loop.
    loop = id => {
        if (id !== this.animationLoopId) return;
        if (this.animationLoop) requestAnimationFrame(() => this.loop(id));

        let didAThing = false;

        const scheduledLayout = new Set(this.scheduledLayout);
        this._currentLayoutSet = scheduledLayout;
        this.scheduledLayout.clear();
        for (const item of scheduledLayout) {
            didAThing = true;
            try {
                item.layoutIfNeeded();
            } catch (err) {
                console.error(err);
            }
        }
        delete this._currentLayoutSet;

        if (didAThing && this.wantsChildLayout) this.layout();

        for (const transaction of this.scheduledLayoutCommits) {
            transaction.commit();
        }
        this.scheduledLayoutCommits.clear();

        const scheduledDisplay = new Set(this.scheduledDisplay);
        this.scheduledDisplay.clear();
        for (const item of scheduledDisplay) {
            didAThing = true;
            try {
                item.draw();
            } catch (err) {
                console.error(err);
            }
        }

        if (!didAThing) this.emptyCycles++;
        else this.emptyCycles = 0;

        if (this.emptyCycles > 12) this.animationLoop = false;
    };
}

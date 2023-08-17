import { BaseLayer, svgNS, Transaction } from './layer/base';
import { ViewContext } from './context';
import { View } from './view';
import { History } from '../history';
import { Layer } from './layer';
import { Window } from './window';

/// Like a ViewRoot, but render-only, and sizes itself to fit content.
export class RenderViewRoot {
    /// a stack of windows. the topmost is the active one.
    windows: Window[] = [];
    wantsChildLayout = true;

    node: HTMLDivElement;
    svgNode: SVGSVGElement;
    ctx: ViewContext;

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
            beginCapture: () => {
                throw new Error('missing beginCapture');
            },
            push: () => {
                throw new Error('missing push');
            },
            beginInput: null,
            codeMirrorNode: null,
            history: new History(),
        };
    }

    setOverflow (value: string) {
        this.svgNode.style.overflow = value;
    }

    /// Pushes a window.
    pushWindow (win: Window) {
        this.windows.push(win);
        this.svgNode.appendChild(win.layer.node);
        win.layer.didMount(this.ctx);
        win.didAttach(this.ctx);
        win.didMount(null);

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

    #getNodesAtPointInner = (
        x: number,
        y: number,
        ox: number,
        oy: number,
        layer: Layer,
        targets: {
            target: View,
            x: number,
            y: number,
        }[]) => {
        if (layer.owner?.decorationOnly) return;

        let doSublayers = false;
        const pos = layer.position;
        const size = layer.size;

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
                if (sublayer instanceof Layer) {
                    this.#getNodesAtPointInner(x, y, ox + pos[0], oy + pos[1], sublayer, targets);
                }
            }
        }
    };

    getTargetsAtPoint = (x: number, y: number, allWindows = false): { target: View, x: number, y: number }[] => {
        let windows = this.windows;
        if (!allWindows) {
            const stackTop = this.windows[this.windows.length - 1];
            if (!stackTop) return [];
            windows = [stackTop];
        }
        const targets: { target: View, x: number, y: number }[] = [];
        for (const window of windows) {
            this.#getNodesAtPointInner(x, y, 0, 0, window.layer, targets);
        }
        return targets;
    };
    getNodesAtPoint = (x: number, y: number, allWindows = false): View[] => {
        return this.getTargetsAtPoint(x, y, allWindows).map(({ target }) => target);
    };

    layout () {
        let width = 0;
        let height = 0;

        for (const window of this.windows) {
            width = Math.max(width, window.size[0]);
            height = Math.max(height, window.size[1]);
        }

        this.node.style.width = width + 'px';
        this.svgNode.setAttribute('width', width.toString());
        this.node.style.height = height + 'px';
        this.svgNode.setAttribute('height', height.toString());
    }

    // animation loop handling
    animationLoopId = 0;
    animationLoop = false;
    emptyCycles = 0;

    scheduledLayout = new Set<View>();
    _currentLayoutSet: Set<View> | null = null;
    scheduledDisplay = new Set<BaseLayer>();
    scheduledLayoutCommits = new Set<Transaction>();

    scheduleLayout = (view: View) => {
        if (this._currentLayoutSet && !this._currentLayoutSet.has(view)) {
            // we got a layout schedule request while currently in layout;
            // batch this view for the current run as well, if possible
            this._currentLayoutSet.add(view);
            return;
        }
        this.scheduledLayout.add(view);
        this.startLoop(true);
    };

    scheduleDisplay = (layer: BaseLayer) => {
        this.scheduledDisplay.add(layer);
        this.startLoop();
    };

    scheduleCommitAfterLayout = (transaction: Transaction) => {
        this.scheduledLayoutCommits.add(transaction);
        this.startLoop(true);
    };

    /// Starts the animation loop.
    startLoop (defer = false) {
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


    errorsPrinted = 0;

    /// Animation loop.
    loop = (id: number) => {
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
                if (this.errorsPrinted++ === 255) {
                    console.error('too many errors; not logging errors anymore');
                } else if (this.errorsPrinted < 255) {
                    console.error(err);
                }
            }
        }
        this._currentLayoutSet = null;

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

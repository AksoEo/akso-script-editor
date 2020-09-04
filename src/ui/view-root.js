import PointerTracker from 'pointer-tracker';
import { svgNS } from './layer/base';
import { Gesture } from './gesture';

/// View root handler. Handles interfacing with the DOM and time.
export class ViewRoot {
    /// a stack of windows. the topmost is the active one.
    windows = [];

    constructor () {
        this.node = document.createElement('div');
        this.node.setAttribute('class', 'asce-view-root');
        this.svgNode = document.createElementNS(svgNS, 'svg');
        this.svgNode.setAttribute('class', 'asce-inner-view-root');
        this.svgNode.style.cursor = 'default';
        this.svgNode.style.webkitUserSelect = this.svgNode.style.userSelect = 'none';

        this.node.style.position = 'relative';

        this.node.appendChild(this.svgNode);

        this.node.addEventListener('touchstart', e => e.preventDefault());
        this.node.addEventListener('touchmove', e => e.preventDefault());
        this.node.addEventListener('touchend', e => e.preventDefault());

        // TODO: fix this
        const self = this;
        this.pointerTracker = new PointerTracker(this.svgNode, {
            start (pointer, event) {
                event.preventDefault();
                self.beginPointer(pointer);
                return true;
            },
            move (prevPointers, changedPointers, event) {
                event.preventDefault();
                for (const pointer of changedPointers) {
                    self.dragPointer(pointer);
                }
            },
            end (pointer) {
                self.endPointer(pointer);
            },
        });
        this.svgNode.addEventListener('wheel', this.#onWheel);
        this.svgNode.addEventListener('mousemove', this.#onMouseMove);

        this.ctx = {
            render: {
                scheduleLayout: this.scheduleLayout,
                scheduleDisplay: this.scheduleDisplay,
                scheduleCommitAfterLayout: this.scheduleCommitAfterLayout,
            },
            nodesAtPoint: this.getNodesAtPoint,
            beginCapture: this.beginCapture,
            push: this.ctxPushWindow,
        };
    }

    #trackedPointers = new Map();
    beginPointer = pointer => {
        const rect = this.node.getBoundingClientRect();
        const x = pointer.clientX - rect.left;
        const y = pointer.clientY - rect.top;

        let candidates;

        if (this.capturedInputTarget) {
            candidates = [this.capturedInputTarget];
        } else {
            const targets = this.getTargetsAtPoint(x, y, true);
            // targets are sorted by depth, so the last one will be deepest and should have the
            // highest priority
            candidates = targets.reverse();
        }

        const chosenTargets = [];
        let gestures = [];
        const gestureTypes = new Set();
        let highestPriority = -Infinity;
        for (const candidate of candidates) {
            const g = candidate.target.getGesturesForType(Gesture.Type.POINTER, event.pointerType);
            if (g.length) {
                chosenTargets.push(candidate);
                for (const gesture of g) {
                    // use only the first (deepest) gesture of each type
                    if (gestureTypes.has(gesture.type)) continue;
                    highestPriority = Math.max(highestPriority, gesture.priority);
                    gestures.push({ gesture, target: candidate });
                    gestureTypes.add(gesture.type);
                }
            }
        }

        gestures = gestures.filter(({ gesture }) => gesture.priority >= highestPriority);

        for (const { gesture, target } of gestures) gesture.onPointerStart({
            x: x - target.x,
            y: y - target.y,
            absX: x,
            absY: y,
        });

        this.#trackedPointers.set(pointer.id, {
            targets: chosenTargets,
            gestures,
        });
    };

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

    dragPointer = pointer => {
        const rect = this.node.getBoundingClientRect();
        const x = pointer.clientX - rect.left;
        const y = pointer.clientY - rect.top;

        const tracked = this.#trackedPointers.get(pointer.id);
        const { gestures } = tracked;

        let highestPriority = -Infinity;
        for (const { gesture, target } of gestures) {
            gesture.onPointerDrag({
                x: x - target.x,
                y: y - target.y,
                absX: x,
                absY: y,
            });
            highestPriority = Math.max(highestPriority, gesture.priority);
        }

        tracked.gestures = [];
        for (const item of gestures) {
            if (item.gesture.priority >= highestPriority) {
                tracked.gestures.push(item);
            } else {
                item.gesture.onPointerCancel();
            }
        }
    };
    endPointer = pointer => {
        const rect = this.node.getBoundingClientRect();
        const x = pointer.clientX - rect.left;
        const y = pointer.clientY - rect.top;

        const { gestures } = this.#trackedPointers.get(pointer.id);
        this.#trackedPointers.delete(pointer.id);

        for (const { gesture, target } of gestures) {
            gesture.onPointerEnd({
                x: x - target.x,
                y: y - target.y,
                absX: x,
                absY: y,
            });
        }
    };

    #lastHoverTargetView = null;
    #onMouseMove = event => {
        const rect = this.node.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        let chosenTarget;
        if (this.capturedInputTarget) {
            chosenTarget = this.capturedInputTarget;
        } else {
            const targets = this.getTargetsAtPoint(x, y);
            chosenTarget = targets[targets.length - 1]; // last target is on top due to DFS order
        }
        if (!chosenTarget) return;
        const chosenView = chosenTarget.target;

        let didEnter = false;
        if (chosenView !== this.#lastHoverTargetView) {
            if (this.#lastHoverTargetView && this.#lastHoverTargetView.onPointerExit) {
                this.#lastHoverTargetView.onPointerExit();
            }
            didEnter = true;
            this.#lastHoverTargetView = chosenView;
        }

        if (didEnter && chosenTarget.target.onPointerEnter) {
            chosenView.onPointerEnter({
                x: x - chosenTarget.x,
                y: y - chosenTarget.y,
                absX: x,
                absY: y,
            });
        } else if (chosenTarget.target.onPointerMove) {
            chosenView.onPointerMove({
                x: x - chosenTarget.x,
                y: y - chosenTarget.y,
                absX: x,
                absY: y,
            });
        }
    };

    #onWheel = event => {
        const rect = this.node.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        let targets;
        if (this.capturedInputTarget) targets = [this.capturedInputTarget];
        else targets = this.getTargetsAtPoint(x, y);

        for (let i = targets.length - 1; i >= 0; i--) {
            const { target } = targets[i];
            const gestures = target.getGesturesForType(Gesture.Type.SCROLL, null);
            if (gestures.length) {
                event.preventDefault();
                gestures.map(g => g.onScroll({ dx: event.deltaX, dy: event.deltaY }));
                break;
            }
        }
    };

    /// Starts capturing all input and directing it to the given target.
    beginCapture = target => {
        const targetPos = target.absolutePosition;
        this.capturedInputTarget = {
            target,
            x: targetPos[0],
            y: targetPos[1],
        };
        return { end: this.endCapture };
    };
    endCapture = () => {
        this.capturedInputTarget = null;
    };

    get width () {
        return +this.svgNode.getAttribute('width') | 0;
    }
    set width (value) {
        this.node.style.width = value + 'px';
        this.svgNode.setAttribute('width', value);
        this.updateRootSizes();
    }
    get height () {
        return +this.svgNode.getAttribute('height') | 0;
    }
    set height (value) {
        this.node.style.height = value + 'px';
        this.svgNode.setAttribute('height', value);
        this.updateRootSizes();
    }

    /// Pushes a window.
    pushWindow (view) {
        this.windows.push(view);
        this.svgNode.appendChild(view.layer.node);
        view.layer.didMount(this.ctx);
        view.didAttach(this.ctx);
        view.didMount(null);

        this.updateRootSizes();
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

    ctxPushWindow = view => {
        const popAtSize = this.windows.length;
        this.pushWindow(view);
        return {
            pop: () => {
                while (this.windows.length > popAtSize) this.popWindow();
            },
        };
    };

    updateRootSizes () {
        for (const item of this.windows) {
            if (!item.wantsRootSize) continue;
            if (item.size[0] === this.width && item.size[1] === this.height) continue;
            item.size = [this.width, this.height];
            item.needsLayout = true;
        }
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

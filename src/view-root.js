import PointerTracker from 'pointer-tracker';

/// View root handler. Handles interfacing with the DOM and time.
export class ViewRoot {
    constructor () {
        this.node = document.createElement('div');
        this.node.setAttribute('class', 'asce-editor');
        this.svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svgNode.style.cursor = 'default';

        this.node.style.position = 'relative';

        this.inputContainer = document.createElement('div');
        this.inputContainer.style.position = 'absolute';
        this.inputContainer.style.zIndex = 1;
        this.inputContainer.style.top = this.inputContainer.style.right =
            this.inputContainer.style.left = this.inputContainer.style.bottom = 0;
        this.inputContainer.style.display = 'none';

        this.input = document.createElement('input');
        this.inputContainer.appendChild(this.input);

        this.node.appendChild(this.svgNode);
        this.node.appendChild(this.inputContainer);

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

        this.input.addEventListener('click', e => {
            e.stopPropagation();
        });
        this.input.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.endInput(true);
            if (e.key === 'Enter') this.endInput();
        });
        Object.assign(this.input.style, {
            padding: '0 2px',
            border: 'none',
            margin: '0',
            borderRadius: '4px',
            boxSizing: 'border-box',
        });
        this.inputContainer.addEventListener('click', () => {
            this.endInput();
        });

        this.ctx = {
            scheduleLayout: this.scheduleLayout,
            scheduleDisplay: this.scheduleDisplay,
            scheduleCommitAfterLayout: this.scheduleCommitAfterLayout,
            nodesAtPoint: this.getNodesAtPoint,
            beginInput: this.beginInput,
            beginCapture: this.beginCapture,
        };
    }

    #trackedPointers = new Map();
    beginPointer = pointer => {
        const rect = this.node.getBoundingClientRect();
        const x = pointer.clientX - rect.left;
        const y = pointer.clientY - rect.top;

        let chosenTarget;

        if (this.capturedInputTarget) {
            chosenTarget = this.capturedInputTarget;
        } else {
            const targets = this.getTargetsAtPoint(x, y);
            chosenTarget = targets[targets.length - 1]; // last target is on top due to DFS order
        }

        if (chosenTarget.target.onPointerStart) {
            chosenTarget.target.onPointerStart({
                x: x - chosenTarget.x,
                y: y - chosenTarget.y,
                absX: x,
                absY: y,
            });
        }

        this.#trackedPointers.set(pointer.id, {
            targets: [chosenTarget],
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
        if (!this.root) return [];
        const targets = [];
        this.#getNodesAtPointInner(x, y, 0, 0, this.root.layer, targets);
        return targets;
    };
    getNodesAtPoint = (x, y) => {
        return this.getTargetsAtPoint(x, y).map(({ target }) => target);
    };

    dragPointer = pointer => {
        const rect = this.node.getBoundingClientRect();
        const x = pointer.clientX - rect.left;
        const y = pointer.clientY - rect.top;

        const { targets } = this.#trackedPointers.get(pointer.id);

        for (const target of targets) {
            if (target.target.onPointerDrag) {
                target.target.onPointerDrag({
                    x: x - target.x,
                    y: y - target.y,
                    absX: x,
                    absY: y,
                });
            }
        }
    };
    endPointer = pointer => {
        const rect = this.node.getBoundingClientRect();
        const x = pointer.clientX - rect.left;
        const y = pointer.clientY - rect.top;

        const { targets } = this.#trackedPointers.get(pointer.id);
        this.#trackedPointers.delete(pointer.id);

        for (const target of targets) {
            if (target.target.onPointerEnd) {
                target.target.onPointerEnd({
                    x: x - target.x,
                    y: y - target.y,
                    absX: x,
                    absY: y,
                });
            }
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
            if (target.onScroll) {
                event.preventDefault();
                target.onScroll({ dx: event.deltaX, dy: event.deltaY });
                break;
            }
        }
    };

    setRootView (view) {
        if (this.root) {
            this.svgNode.removeChild(this.root.layer.node);
        }

        this.root = view;
        this.svgNode.appendChild(view.layer.node);
        view.layer.didMount(this.ctx);

        this.updateRootSize();
    }

    get width () {
        return this.svgNode.width.baseVal.value;
    }
    set width (value) {
        this.node.style.width = value + 'px';
        this.svgNode.width.baseVal.valueAsString = value + 'px';
        this.updateRootSize();
    }
    get height () {
        return this.svgNode.height.baseVal.value;
    }
    set height (value) {
        this.node.style.height = value + 'px';
        this.svgNode.height.baseVal.valueAsString = value + 'px';
        this.updateRootSize();
    }

    updateRootSize () {
        if (!this.root) return;

        this.root.size = [this.width, this.height];
        this.root.needsLayout = true;
    }

    inputOriginal = null;
    inputPromise = null;
    beginInput = ([x, y], [width, height], text, style = {}) => new Promise((resolve) => {
        this.endInput();

        this.inputContainer.style.display = 'block';
        Object.assign(this.input.style, style);
        this.input.style.transform = `translate(${x}px, ${y}px)`;
        this.input.style.width = width + 'px';
        this.input.style.height = height + 'px';
        this.input.style.lineHeight = height + 'px';
        this.input.value = text;
        this.inputOriginal = text;
        this.input.focus();
        this.inputPromise = resolve;
    });
    endInput (cancel) {
        this.inputContainer.style.display = 'none';
        if (!this.inputPromise) return;
        const resolve = this.inputPromise;
        resolve((cancel ? this.inputOriginal : this.input.value).normalize());
        this.inputPromise = null;
    }

    beginCapture = (target) => {
        const targetPos = target.absolutePosition;

        this.capturedInputTarget = {
            target,
            x: targetPos[0],
            y: targetPos[1],
        };

        return {
            end: this.endCapture,
        };
    };
    endCapture = () => {
        this.capturedInputTarget = null;
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

    startLoop (defer) {
        if (this.animationLoop) return;
        this.animationLoop = true;
        const id = ++this.animationLoopId;
        this.emptyCycles = 0;
        if (defer) requestAnimationFrame(() => this.loop(id));
        else this.loop(id);
    }

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

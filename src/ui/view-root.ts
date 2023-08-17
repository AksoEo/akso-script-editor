import PointerTracker, { InputEvent, Pointer } from 'pointer-tracker';
import { Gesture } from './gesture';
import { RenderViewRoot } from './render-view-root';
import { View } from './view';
import { Vec2 } from '../spring';

/// View root handler. Handles interfacing with the DOM and time. Has a fixed size.
export class ViewRoot extends RenderViewRoot {
    wantsChildLayout = false;
    pointerTracker: PointerTracker;

    constructor () {
        super();

        this.node.addEventListener('touchstart', e => e.preventDefault());
        this.node.addEventListener('touchmove', e => e.preventDefault());
        this.node.addEventListener('touchend', e => e.preventDefault());

        // TODO: fix this (does not cancel events)
        const self = this;
        this.pointerTracker = new PointerTracker(this.svgNode as unknown as HTMLElement, {
            start (pointer, event) {
                event.preventDefault();
                self.beginPointer(pointer, event);
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

        this.ctx.beginCapture = this.beginCapture;
        this.ctx.push = this.ctxPushWindow;
    }

    #trackedPointers = new Map();
    capturedInputTarget: { target: View, x: number, y: number } | null = null;
    beginPointer = (pointer, event: InputEvent) => {
        const rect = this.node.getBoundingClientRect();
        const x = pointer.clientX - rect.left;
        const y = pointer.clientY - rect.top;

        let candidates;

        if (this.capturedInputTarget) {
            candidates = [this.capturedInputTarget];
        } else {
            const targets = this.getTargetsAtPoint(x, y);
            // targets are sorted by depth, so the last one will be deepest and should have the
            // highest priority
            candidates = targets.reverse();
        }

        const chosenTargets = [];
        let gestures = [];
        const gestureTypes = new Set();
        let highestPriority = -Infinity;
        for (const candidate of candidates) {
            const pointerType = event instanceof PointerEvent ? Gesture.PointerType[event.pointerType]
                : event instanceof TouchEvent ? Gesture.PointerType.TOUCH
                : Gesture.PointerType.MOUSE;

            const g = candidate.target.getGesturesForType(Gesture.Type.POINTER, pointerType);
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

    dragPointer = (pointer: Pointer) => {
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
    endPointer = (pointer: Pointer) => {
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

    #lastHoverTargetView: View | null = null;
    #onMouseMove = (event: MouseEvent) => {
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
        const chosenView: View = chosenTarget.target;

        let didEnter = false;
        if (chosenView !== this.#lastHoverTargetView) {
            if (this.#lastHoverTargetView && this.#lastHoverTargetView.onPointerExit) {
                this.#lastHoverTargetView.onPointerExit();
            }
            didEnter = true;
            this.#lastHoverTargetView = chosenView;
        }

        if (didEnter && chosenView.onPointerEnter) {
            chosenView.onPointerEnter({
                x: x - chosenTarget.x,
                y: y - chosenTarget.y,
                absX: x,
                absY: y,
            });
        } else if (chosenView.onPointerMove) {
            chosenView.onPointerMove({
                x: x - chosenTarget.x,
                y: y - chosenTarget.y,
                absX: x,
                absY: y,
            });
        }
    };

    #onWheel = (event: WheelEvent) => {
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
        this.svgNode.setAttribute('width', value.toString());
        this.layout();
    }
    get height () {
        return +this.svgNode.getAttribute('height') | 0;
    }
    set height (value) {
        this.node.style.height = value + 'px';
        this.svgNode.setAttribute('height', value.toString());
        this.layout();
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

    layout () {
        for (const item of this.windows) {
            if (!item.wantsRootSize) continue;
            if (item.size[0] === this.width && item.size[1] === this.height) continue;
            item.inheritedMaxSize = new Vec2(this.width, this.height);
            item.size = [this.width, this.height];
            item.needsLayout = true;
        }
    }
}

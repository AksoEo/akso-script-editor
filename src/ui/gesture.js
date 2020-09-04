/// An abstract gesture recognizer.
export class Gesture {
    static Type = {
        POINTER: 'pointer',
        SCROLL: 'scroll',
    };
    static PointerType = {
        MOUSE: 'mouse',
        PEN: 'pen',
        TOUCH: 'touch',
    };

    /// Event priority negotiation:
    /// Only gesture recognizers with the highest priority level will continue receiving pointer
    /// events, and all other gesture recognizers will be canceled.
    /// A gesture recognizer may change its own priority in response to certain events.
    static Priority = {
        TAP: 0,
        DRAG: 1,
        SCROLL: 2,
        DELAYED_DRAG: 3, // after long-pressing
    };

    /// Returns a handler if this gesture recognizer responds to the given type.
    ///
    /// - type: Gesture.Types
    /// - pointerType: nullable Gesture.PointerType
    getHandlerForType (type, pointerType) {
        void type, pointerType;
    }

    listeners = {};
    on (event, handler) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(handler);
    }
    emit (event, ...args) {
        let didError = false;
        if (!this.listeners[event]) return;
        for (const listener of this.listeners[event]) {
            try {
                listener(...args);
            } catch (err) {
                console.error(err);
                didError = true;
            }
        }
        if (didError) throw new Error('Errors occurred during event');
    }

    /// Adds a raw pointer capture handler.
    static rawPointerCapture (view, onPointerStart, onPointerDrag, onPointerEnd, onPointerCancel) {
        const gesture = new RawPointerCaptureGesture();
        if (onPointerStart) gesture.on('pointerstart', onPointerStart);
        if (onPointerDrag) gesture.on('pointerdrag', onPointerDrag);
        if (onPointerEnd) gesture.on('pointerend', onPointerEnd);
        if (onPointerCancel) gesture.on('pointercancel', onPointerCancel);
        view.gestures.add(gesture);
    }

    /// Adds a tap gesture handler.
    static onTap (view, onTap, onTapStart, onTapEnd) {
        const gesture = new TapGesture();
        if (onTap) gesture.on('tap', onTap);
        if (onTapStart) gesture.on('capture', onTapStart);
        if (onTapEnd) gesture.on('release', onTapEnd);
        view.gestures.add(gesture);
    }

    /// Adds a drag gesture handler.
    static onDrag (view, onMove, onDragStart, onDragEnd, onDragCancel) {
        const gesture = new DragGesture();
        if (onMove) gesture.on('move', onMove);
        if (onDragStart) gesture.on('start', onDragStart);
        if (onDragEnd) gesture.on('end', onDragEnd);
        if (onDragCancel) gesture.on('cancel', onDragCancel);
        view.gestures.add(gesture);
    }

    /// Adds a scroll gesture handler.
    static onScroll (view, onScroll) {
        const gesture = new ScrollGesture();
        if (onScroll) gesture.on('scroll', onScroll);
        view.gestures.add(gesture);
    }
}

export class RawPointerCaptureGesture extends Gesture {
    type = 'raw';
    getHandlerForType (type) {
        if (type === Gesture.Type.POINTER) {
            return new RawPointerCaptureGestureHandler(this);
        }
    }
}


export class TapGesture extends Gesture {
    type = 'tap';
    getHandlerForType (type) {
        if (type === Gesture.Type.POINTER) {
            return new TapGestureHandler(this);
        }
    }
}

export class DragGesture extends Gesture {
    type = 'drag';
    getHandlerForType (type) {
        if (type === Gesture.Type.POINTER) {
            return new DragGestureHandler(this);
        }
    }
}

export class ScrollGesture extends Gesture {
    type = 'scroll';
    getHandlerForType (type, pointerType) {
        if (pointerType === Gesture.PointerType.TOUCH || pointerType === Gesture.PointerType.PEN) {
            if (type === Gesture.Type.POINTER) return new ScrollGestureHandler(this);
        } else if (type === Gesture.Type.SCROLL) return new ScrollGestureHandler(this);
    }
}

export class GestureHandler {
    priority = -Infinity;

    constructor (gesture) {
        this.gesture = gesture;
    }

    get type () {
        return this.gesture.type;
    }

    emit (...args) {
        this.gesture.emit(...args);
    }

    onPointerStart () {}
    onPointerDrag () {}
    onPointerEnd () {}
    /// Called when the event is canceled. No arguments.
    onPointerCancel () {}
    onPointerEnter () {}
    onPointerMove () {}
    onPointerExit () {}
    onScroll () {}
}

export class RawPointerCaptureGestureHandler extends GestureHandler {
    priority = Infinity;

    onPointerStart (event) {
        this.emit('pointerstart', event);
    }
    onPointerDrag (event) {
        this.emit('pointerdrag', event);
    }
    onPointerEnd (event) {
        this.emit('pointerend', event);
    }
    onPointerCancel () {
        this.emit('pointercancel');
    }
}

export class TapGestureHandler extends GestureHandler {
    priority = Gesture.Priority.TAP;

    startPos;
    onPointerStart (event) {
        this.startPos = [event.absX, event.absY];
        this.emit('capture', event);
    }

    onPointerEnd (event) {
        const dist = Math.hypot(event.absX - this.startPos[0], event.absY - this.startPos[1]);
        if (dist > 16) return;

        this.emit('release');
        this.emit('tap', event);
    }

    onPointerCancel () {
        this.emit('release');
    }
}

const DRAG_DIST = 4;
const DRAG_DELAY_MS = 400;
export class DragGestureHandler extends GestureHandler {
    priority = Gesture.Priority.TAP;

    lastPos = null;
    distance = null;
    startTime = null;
    startPos = null;
    dragDelayTimeout = null;
    isDragging = false;

    onPointerStart ({ x, y, absX, absY }) {
        this.lastPos = { x, y, absX, absY };
        this.distance = 0;
        this.startTime = Date.now();
        this.isDragging = false;
        this.dragDelayTimeout = setTimeout(this.onDragDelay, DRAG_DELAY_MS);
    }
    onDragDelay = () => {
        this.priority = Gesture.Priority.DELAYED_DRAG;
        this.isDragging = true;
        this.emit('start');
        this.startPos = this.lastPos;
    };
    onPointerDrag ({ x, y, absX, absY }) {
        if (!this.isDragging) {
            this.distance += Math.hypot(absX - this.lastPos.absX, absY - this.lastPos.absY);

            if (this.distance >= DRAG_DIST) {
                clearTimeout(this.dragDelayTimeout);
                this.priority = Gesture.Priority.DRAG;
                this.isDragging = true;
                this.emit('start');
                this.startPos = { x, y, absX, absY };
            }
        } else {
            this.emit('move', {
                absX,
                absY,
                x,
                y,
                dx: x - this.lastPos.x,
                dy: y - this.lastPos.y,
                rx: absX - this.startPos.absX,
                ry: absY - this.startPos.absY,
            });
        }
        this.lastPos = { x, y, absX, absY };
    }
    onPointerEnd () {
        clearTimeout(this.dragDelayTimeout);
        this.emit('end');
    }
    onPointerCancel () {
        clearTimeout(this.dragDelayTimeout);
        this.emit('cancel');
    }
}

const SCROLL_FRICTION = 2;
export class ScrollGestureHandler extends GestureHandler {
    priority = Gesture.Priority.TAP;

    lastPos = null;
    distance = null;
    isDragging = false;
    velocity = null;
    lastTime = null;

    animationLoop = (id) => {
        if (id !== this.gesture.animationId) return;
        requestAnimationFrame(() => this.animationLoop(id));

        const dt = (Date.now() - this.lastTime) / 1000;
        this.lastTime = Date.now();

        this.velocity.x -= this.velocity.x * SCROLL_FRICTION * dt;
        this.velocity.y -= this.velocity.y * SCROLL_FRICTION * dt;
        const dx = -this.velocity.x * dt;
        const dy = -this.velocity.y * dt;
        this.emit('scroll', { dx, dy, captured: true });

        if (Math.abs(this.velocity.x) + Math.abs(this.velocity.y) < 1) this.gesture.animationId++;
    };

    onPointerStart ({ absX, absY }) {
        if (!this.gesture.animationId) this.gesture.animationId = 1;
        else this.gesture.animationId++;
        this.lastPos = { x: absX, y: absY };
        this.distance = 0;
        this.isDragging = false;
        this.velocity = { x: 0, y: 0 };
        this.lastTime = Date.now();
        this.emit('capture');
    }
    onPointerDrag ({ absX, absY }) {
        if (!this.isDragging) {
            this.distance += Math.hypot(absX - this.lastPos.x, absY - this.lastPos.y);

            if (this.distance >= DRAG_DIST) {
                this.priority = Gesture.Priority.SCROLL;
                this.isDragging = true;
            }
        } else {
            const dt = Math.max((Date.now() - this.lastTime) / 1000, 1 / 244);
            const dx = absX - this.lastPos.x;
            const dy = absY - this.lastPos.y;
            this.emit('scroll', { dx: -dx, dy: -dy, captured: true });
            this.velocity = { x: dx / dt, y: dy / dt };
        }
        this.lastPos = { x: absX, y: absY };
        this.lastTime = Date.now();
    }
    onPointerEnd () {
        this.emit('release');
        this.gesture.animationId++;
        this.animationLoop(this.gesture.animationId);
    }
    onPointerCancel () {
        this.emit('release');
    }
    onScroll ({ dx, dy }) {
        this.emit('scroll', { dx, dy, captured: false });
    }
}

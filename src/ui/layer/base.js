import { SpringSolver } from '../../spring';

export const svgNS = 'http://www.w3.org/2000/svg';

export const USE_WAAPI = !!document.timeline && window.Animation;

/// Converts a float[4] to a css color string (rgba).
export function vec2rgb(vec) {
    const r = Math.max(0, Math.min(Math.round(vec[0] * 255), 255));
    const g = Math.max(0, Math.min(Math.round(vec[1] * 255), 255));
    const b = Math.max(0, Math.min(Math.round(vec[2] * 255), 255));
    const a = Math.max(0, Math.min(vec[3], 1)).toFixed(3);

    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/// Stack of global transactions.
const globalTransactions = [];

/// Returns the topmost transaction, or null.
export function getTransaction () {
    return globalTransactions[globalTransactions.length - 1] || null;
}


/// Base layer class. Handles display scheduling and such.
export class BaseLayer {
    #needsDisplay = false;

    /// Rendering context
    ctx = null;

    /// Parent layer
    parent = null;

    didMount (ctx) {
        this.ctx = ctx;
        this.needsDisplay = true;
    }
    didUnmount () {}

    get needsDisplay () {
        return this.#needsDisplay;
    }
    set needsDisplay (value) {
        if (value && this.ctx) this.ctx.render.scheduleDisplay(this);
        this.#needsDisplay = value;
    }

    get clipContents () {
        return false;
    }

    get position () {
        return [0, 0];
    }

    get absolutePosition () {
        const parentPos = this.parent ? this.parent.absolutePosition : [0, 0];
        return [this.position[0] + parentPos[0], this.position[1] + parentPos[1]];
    }

    get sublayers () {
        return new Set();
    }
}

const PROP_UPDATE_THRESHOLD = 1e-4;

/// A layer property. Handles animation.
export class LayerProperty {
    // WAAPI hook (property) => void. Called when an animation is committed.
    waCommitCallback = null;
    // Either Animation or [Animation]. Will be canceled when appropriate.
    waAnimation = null;

    // target value of this property
    target = null;
    // spring animating this property
    // time at which the spring was initialized (Date.now())
    initTime = null;

    hasPending = false;
    pendingValue = null;

    constructor (initial) {
        this.spring = new SpringSolver(1, 1, initial.length || 1);
        this.target = initial;
    }

    _needsUpdateInner (value, target, velocity) {
        if (target.length) {
            for (let i = 0; i < target.length; i++) {
                if (Math.abs(target[i] - value[i]) + Math.abs(velocity[i]) > PROP_UPDATE_THRESHOLD) return true;
            }
        } else if (Math.abs(target - value) + Math.abs(velocity) > PROP_UPDATE_THRESHOLD) return true;
        return false;
    }

    get needsUpdate () {
        const value = this.getDynamic();
        const target = this.target;
        const velocity = this.getDynamicVelocity();

        return this._needsUpdateInner(value, target, velocity);
    }

    /// Returns the current static value of this property.
    getStatic () {
        return this.hasPending ? this.pendingValue : this.target;
    }

    /// Sets the static value of this property with an optional transaction.
    setStatic (target, transaction = null) {
        let isTheSame = true;
        if (target.length) {
            for (let i = 0; i < target.length; i++) {
                if (target[i] !== this.target[i]) {
                    isTheSame = false;
                    break;
                }
            }
        } else {
            isTheSame = target === this.target;
        }
        if (isTheSame) return false;

        if (transaction) {
            this.hasPending = true;
            this.pendingValue = target;
            transaction.addProperty(this, target);
        } else {
            this.initTime = null;
            this.hasPending = false;
            this.target = target;
            this.cancelWAAnimation();
        }
        return true;
    }

    cancelWAAnimation () {
        if (Array.isArray(this.waAnimation)) {
            for (const a of this.waAnimation) a.cancel();
        } else if (this.waAnimation) {
            this.waAnimation.cancel();
        }
        this.waAnimation = null;
    }

    getTime () {
        return (Date.now() - this.initTime) / 1000;
    }

    /// Returns the current actual value of this property.
    getDynamic () {
        if (this.initTime === null) return this.target;
        const t = this.getTime();
        return this.spring.getValue(t);
    }

    /// Returns getDynamic if WAAPI is disabled, or getStatic if WAAPI is enabled.
    getWADynamic () {
        return USE_WAAPI ? this.getStatic() : this.getDynamic();
    }

    /// Returns the current velocity of this property.
    getDynamicVelocity () {
        if (this.initTime === null) return 0;
        const t = this.getTime();
        return this.spring.getVelocity(t);
    }

    /// Returns an array of 60 fps keyframes for the entire animation (up to 10 seconds).
    /// Returns null if there is no animation.
    getKeyframes () {
        if (this.initTime === null) return null;
        const keyframes = [];
        const tOff = this.getTime();
        let t = 0;
        while (t < 10) {
            const value = this.spring.getValue(tOff + t);
            const velocity = this.spring.getVelocity(tOff + t);

            keyframes.push(value);
            if (!this._needsUpdateInner(value, this.target, velocity)) break;

            t += 1 / 60;
        }
        return keyframes;
    }

    /// Commits a transaction (internal method)
    commitTransaction (target, damping, period) {
        if (period === 0) {
            this.hasPending = false;
            this.initTime = null;
            this.target = target;
            return;
        }

        if (this.initTime === null) {
            this.initTime = Date.now();
            this.spring.resetValue(0, this.target);
        }
        this.hasPending = false;

        const t = this.getTime();
        this.initTime = Date.now();

        this.spring.resetDampingRatio(t, damping);
        this.spring.resetPeriod(0, period);
        this.spring.retarget(0, target);

        this.target = target;

        this.cancelWAAnimation();
        if (this.waCommitCallback) this.waCommitCallback(this);
    }
}

/// An animation transaction.
export class Transaction {
    properties = [];

    constructor (damping = 1, period = 1) {
        this.damping = damping;
        this.period = period;
        globalTransactions.push(this);
    }

    /// Commits this transaction
    commit () {
        globalTransactions.splice(globalTransactions.indexOf(this), 1);
        for (const { property, target } of this.properties) {
            property.commitTransaction(target, this.damping, this.period);
        }
    }

    commitAfterLayout (ctx) {
        ctx.render.scheduleCommitAfterLayout(this);
    }

    /// Internal function
    addProperty (property, target) {
        this.properties.push({ property, target });
    }
}

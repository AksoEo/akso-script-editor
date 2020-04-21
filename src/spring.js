// adds two vectors
function add(a, b) {
    if (a.length) {
        const out = [];
        for (let i = 0; i < a.length; i++) out[i] = a[i] + b[i];
        return out;
    }
    return a + b;
}

// inverts a vector
function inv(a) {
    if (a.length) {
        const out = [];
        for (let i = 0; i < a.length; i++) out[i] = -a[i];
        return out;
    }
    return -a;
}

// subtracts two vectors
function sub(a, b) {
    return add(a, inv(b));
}

// piecewise multiplies two vectors
function mul(a, b) {
    if (a.length) {
        const out = [];
        for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
        return out;
    }
    return a * b;
}

// multiplies a vector by a scalar
function muls(a, s) {
    if (a.length) {
        const out = [];
        for (let i = 0; i < a.length; i++) out[i] = a[i] * s;
        return out;
    }
    return a * s;
}

// divides a vector by a scalar
function divs(a, s) {
    return muls(a, 1 / s);
}

// performs piecewise sin on a vector
function sin(a) {
    if (a.length) {
        const out = [];
        for (let i = 0; i < a.length; i++) out[i] = Math.sin(a[i]);
        return out;
    }
    return Math.sin(a);
}

// performs piecewise cos on a vector
function cos(a) {
    if (a.length) {
        const out = [];
        for (let i = 0; i < a.length; i++) out[i] = Math.cos(a[i]);
        return out;
    }
    return Math.cos(a);
}

// performs piecewise atan2 on a vector
function atan2(a, b) {
    if (a.length) {
        const out = [];
        for (let i = 0; i < a.length; i++) out[i] = Math.atan2(a[i], b[i]);
        return out;
    }
    return Math.atan2(a, b);
}

// creates an n-dimensional vector by duplicating x
function dup (x, dimensions) {
    const out = [];
    for (let i = 0; i < dimensions; i++) out[i] = x;
    return out;
}

// creates an n-dimensional zero vector
function zero (dimensions) {
    return dup(0, dimensions);
}

// returns the dimension count of the given value
function dim (a) {
    return a.length || 1;
}

/// Calculates multidimensional spring position and velocity for any given condition.
///
/// equations copied from
/// http://people.physics.tamu.edu/agnolet/Teaching/Phys_221/MathematicaWebPages/4_DampedHarmonicOsc
/// illator.pdf
export class SpringSolver {
    /// Creates a new spring with the given damping ratio and period.
    constructor (dampingRatio, period, dimensions) {
        this.dampingRatio = dampingRatio;
        this.friction = dampingRatio * (4 * Math.PI / period);
        this.target = zero(dimensions);
        this.hydrateParams(zero(dimensions), zero(dimensions));
    }

    /// Sets internal parameters for the given initial velocity.
    hydrateParams (initialValue, initialVelocity) {
        const z = zero(dim(initialValue));

        if (this.target === null) {
            // uncontrolled “spring”
            this.initialValueOffset = add(initialValue, (this.friction === 0
                ? z
                : divs(initialVelocity, this.friction)));
            this.initialVelocity = initialVelocity;
            return;
        }

        initialValue = sub(initialValue, this.target);

        this.undampedAngularFrequency = this.dampingRatio === 0
            ? 0
            : this.friction / this.dampingRatio / 2;
        this.dampedAngularFrequency =
            this.undampedAngularFrequency * Math.sqrt(1 - this.dampingRatio ** 2),
        this.angularOffset = atan2(
            add(muls(initialVelocity, 2), muls(initialValue, this.friction)),
            muls(initialValue, 2 * this.dampedAngularFrequency),
        );

        if (initialValue.length) {
            this.amplitudeFactor = [];
            for (let i = 0; i < initialValue.length; i++) {
                this.amplitudeFactor[i] = Math.abs(initialValue[i]) < 1e-5
                    ? Math.sign(initialVelocity[i]) * initialVelocity[i] / this.dampedAngularFrequency
                    : initialValue[i] / Math.cos(this.angularOffset[i]);
            }
        } else {
            this.amplitudeFactor = Math.abs(initialValue) < 1e-5
                ? Math.sign(initialVelocity) * initialVelocity / this.dampedAngularFrequency
                : initialValue / Math.cos(this.angularOffset);
        }

        this.dampedFriction = Math.max(
            // approximate zero because lim is too expensive to compute
            1e-5,
            Math.sqrt((this.friction / 2) ** 2 - this.undampedAngularFrequency ** 2) * 2,
        );
        this.a1 = divs(
            add(muls(initialVelocity, -2), muls(initialValue, -this.friction + this.dampedFriction)),
            2 * this.dampedFriction,
        );
        this.a2 = divs(
            add(muls(initialVelocity, 2), muls(initialValue, this.friction + this.dampedFriction)),
            2 * this.dampedFriction,
        );
    }

    /// Retargets the spring; setting the start value to the current value and retaining velocity.
    /// Time will be reset to zero.
    ///
    /// @param {number|number[]} t - the pivot time, at which the retargeting occurs
    /// @param {number|number[]} newTarget - the new target position
    retarget (t, newTarget) {
        const value = this.getValue(t);
        const velocity = this.getVelocity(t);
        this.target = newTarget;
        this.hydrateParams(value, velocity);
    }

    /// Resets the velocity to a new value.
    /// Time will be reset to zero.
    ///
    /// @param {number|number[]} t - the pivot time, at which the resetting occurs
    /// @param {number|number[]} newVelocity - the new velocity
    resetVelocity (t, newVelocity) {
        const value = this.getValue(t);
        this.hydrateParams(value, newVelocity);
    }

    resetDampingRatio (t, newDampingRatio) {
        const value = this.getValue(t);
        const velocity = this.getVelocity(t);
        this.dampingRatio = newDampingRatio;
        this.hydrateParams(value, velocity);
    }

    resetFriction (t, newFriction) {
        const value = this.getValue(t);
        const velocity = this.getVelocity(t);
        this.friction = newFriction;
        this.hydrateParams(value, velocity);
    }

    resetPeriod (t, newPeriod) {
        this.resetFriction(t, this.dampingRatio * (4 * Math.PI / newPeriod));
    }

    resetValue (t, newValue) {
        const velocity = this.getVelocity(t);
        this.hydrateParams(newValue, velocity);
    }

    getValue (t) {
        if (this.target === null) {
            if (this.friction === 0) {
                return add(this.initialValueOffset, muls(this.initialVelocity, t));
            }

            // no target means the only active part of the equation is v' = -cv
            // => solution: v = k * e^(-cx); integral: x = -k * e^(-cx) / c + C
            return sub(this.initialValueOffset, muls(this.initialVelocity,
                Math.exp(-t * this.friction) / this.friction));
        }

        let value;
        if (this.dampingRatio < 1) {
            // underdamped
            value = mul(
                muls(this.amplitudeFactor, Math.exp(-t * this.friction / 2)),
                cos(
                    sub(
                        dup(this.dampedAngularFrequency * t, dim(this.angularOffset)),
                        this.angularOffset,
                    ),
                ),
            );
        } else {
            // critically damped or overdamped
            value = add(muls(this.a1, Math.exp(t * (-this.friction - this.dampedFriction) / 2)),
                muls(this.a2, Math.exp(t * (-this.friction + this.dampedFriction) / 2)));
        }
        return add(value, this.target);
    }

    getVelocity (t) {
        if (this.target === null) {
            return muls(this.initialVelocity, Math.exp(-t * this.friction));
        }

        if (this.dampingRatio < 1) {
            const d = dim(this.target);
            // underdamped
            return mul(
                this.amplitudeFactor,
                sub(
                    muls(
                        cos(sub(dup(this.dampedAngularFrequency * t, d), this.angularOffset)),
                        -this.friction / 2 * Math.exp(-t * this.friction / 2),
                    ),
                    muls(
                        sin(sub(dup(this.dampedAngularFrequency * t, d), this.angularOffset)),
                        this.dampedAngularFrequency * Math.exp(-t * this.friction / 2)
                    ),
                ),
            );
        } else {
            // critically damped or overdamped
            return add(
                muls(this.a1, (-this.friction - this.dampedFriction) / 2
                * Math.exp(t * (-this.friction - this.dampedFriction) / 2)),
                muls(this.a2, (-this.friction + this.dampedFriction) / 2
                * Math.exp(t * (-this.friction + this.dampedFriction) / 2)),
            );
        }
    }
}

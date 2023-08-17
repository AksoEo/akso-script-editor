export abstract class BaseVec extends Array {
    class() {
        return Object.getPrototypeOf(this).constructor;
    }

    abstract add(other: this): this;
    abstract sub(other: this): this;
    abstract mul(other: this): this;
    abstract muls(other: number): this;
    abstract divs(other: number): this;
    abstract cos(): this;
    abstract sin(): this;
    abstract atan2(other: this): this;
    abstract clone(): this;
    abstract eq(other: this): boolean;
}

export class Vec1 extends BaseVec {
    constructor(x: number) {
        super();
        super.push(x);
    }

    get x() {
        return this[0];
    }
    set x(v: number) {
        this[0] = v;
    }

    add(other) {
        return new (this.class())(this.x + other.x);
    }
    sub(other) {
        return new (this.class())(this.x - other.x);
    }
    mul(other) {
        return new (this.class())(this.x * other.x);
    }
    muls(other) {
        return new (this.class())(this.x * other);
    }
    divs(other) {
        return new (this.class())(this.x / other);
    }
    cos() {
        return new (this.class())(Math.cos(this.x));
    }
    sin() {
        return new (this.class())(Math.sin(this.x));
    }
    atan2(other) {
        return new (this.class())(Math.atan2(this.x, other.x));
    }
    clone() {
        return new (this.class())(this.x);
    }
    eq(other) {
        return this.x === other.x;
    }

    static dup(v: number): Vec1 {
        return new Vec1(v);
    }
    static zero(): Vec3 {
        return Vec3.dup(0);
    }
}
export class Vec2 extends BaseVec {
    constructor(x: number, y: number) {
        super();
        super.push(x, y);
    }

    get x() {
        return this[0];
    }
    set x(v: number) {
        this[0] = v;
    }
    get y() {
        return this[1];
    }
    set y(v: number) {
        this[1] = v;
    }

    class() {
        return Object.getPrototypeOf(this).constructor;
    }

    add(other) {
        return new (this.class())(this.x + other.x, this.y + other.y);
    }
    sub(other) {
        return new (this.class())(this.x - other.x, this.y - other.y);
    }
    mul(other) {
        return new (this.class())(this.x * other.x, this.y * other.y);
    }
    muls(other) {
        return new (this.class())(this.x * other, this.y * other);
    }
    divs(other) {
        return new (this.class())(this.x / other, this.y / other);
    }
    cos() {
        return new (this.class())(Math.cos(this.x), Math.cos(this.y));
    }
    sin() {
        return new (this.class())(Math.sin(this.x), Math.sin(this.y));
    }
    atan2(other) {
        return new (this.class())(
            Math.atan2(this.x, other.x),
            Math.atan2(this.y, other.y),
        );
    }
    clone() {
        return new (this.class())(this.x, this.y);
    }
    eq(other) {
        return this.x === other.x && this.y === other.y;
    }

    static dup(v: number): Vec2 {
        return new Vec2(v, v);
    }
    static zero(): Vec2 {
        return Vec2.dup(0);
    }
    static from(v: Vec2 | RawVec2): Vec2 {
        if (v instanceof Vec2) return v;
        return new Vec2(v[0], v[1]);
    }
}
export class Vec3 extends BaseVec {
    constructor(x: number, y: number, z: number) {
        super();
        super.push(x, y, z);
    }

    get x() {
        return this[0];
    }
    set x(v: number) {
        this[0] = v;
    }
    get y() {
        return this[1];
    }
    set y(v: number) {
        this[1] = v;
    }
    get z() {
        return this[2];
    }
    set z(v: number) {
        this[2] = v;
    }

    class() {
        return Object.getPrototypeOf(this).constructor;
    }

    add(other) {
        return new (this.class())(this.x + other.x, this.y + other.y, this.z + other.z);
    }
    sub(other) {
        return new (this.class())(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    mul(other) {
        return new (this.class())(this.x * other.x, this.y * other.y, this.z * other.z);
    }
    muls(other) {
        return new (this.class())(this.x * other, this.y * other, this.z * other);
    }
    divs(other) {
        return new (this.class())(this.x / other, this.y / other, this.z / other);
    }
    cos() {
        return new (this.class())(Math.cos(this.x), Math.cos(this.y), Math.cos(this.z));
    }
    sin() {
        return new (this.class())(Math.sin(this.x), Math.sin(this.y), Math.sin(this.z));
    }
    atan2(other) {
        return new (this.class())(
            Math.atan2(this.x, other.x),
            Math.atan2(this.y, other.y),
            Math.atan2(this.z, other.z),
        );
    }
    clone() {
        return new (this.class())(this.x, this.y, this.z);
    }
    eq(other) {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    static dup(v: number): Vec3 {
        return new Vec3(v, v, v);
    }
    static zero(): Vec3 {
        return Vec3.dup(0);
    }
    static from(v: Vec3 | RawVec3): Vec3 {
        if (v instanceof Vec3) return v;
        return new Vec3(v[0], v[1], v[2]);
    }
}
export class Vec4 extends BaseVec {
    constructor(x: number, y: number, z: number, w: number) {
        super();
        super.push(x, y, z, w);
    }

    get x() {
        return this[0];
    }
    set x(v: number) {
        this[0] = v;
    }
    get y() {
        return this[1];
    }
    set y(v: number) {
        this[1] = v;
    }
    get z() {
        return this[2];
    }
    set z(v: number) {
        this[2] = v;
    }
    get w() {
        return this[3];
    }
    set w(v: number) {
        this[3] = v;
    }

    class() {
        return Object.getPrototypeOf(this).constructor;
    }

    add(other) {
        return new (this.class())(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w);
    }
    sub(other) {
        return new (this.class())(this.x - other.x, this.y - other.y, this.z - other.z, this.w - other.w);
    }
    mul(other) {
        return new (this.class())(this.x * other.x, this.y * other.y, this.z * other.z, this.w * other.w);
    }
    muls(other) {
        return new (this.class())(this.x * other, this.y * other, this.z * other, this.w * other);
    }
    divs(other) {
        return new (this.class())(this.x / other, this.y / other, this.z / other, this.w / other);
    }
    cos() {
        return new (this.class())(Math.cos(this.x), Math.cos(this.y), Math.cos(this.z), Math.cos(this.w));
    }
    sin() {
        return new (this.class())(Math.sin(this.x), Math.sin(this.y), Math.sin(this.z), Math.sin(this.w));
    }
    atan2(other) {
        return new (this.class())(
            Math.atan2(this.x, other.x),
            Math.atan2(this.y, other.y),
            Math.atan2(this.z, other.z),
            Math.atan2(this.w, other.w),
        );
    }
    clone() {
        return new (this.class())(this.x, this.y, this.z, this.w);
    }
    eq(other) {
        return this.x === other.x && this.y === other.y && this.z === other.z && this.w === other.w;
    }

    static dup(v: number): Vec4 {
        return new Vec4(v, v, v, v);
    }
    static zero(): Vec4 {
        return Vec4.dup(0);
    }
    static from(v: Vec4 | RawVec4): Vec4 {
        if (v instanceof Vec4) return v;
        return new Vec4(v[0], v[1], v[2], v[3]);
    }
}

export type VecAny = Vec1 | Vec2 | Vec3 | Vec4;
type DimOf<T> = T extends Vec1 ? 1 : T extends Vec2 ? 2 : T extends Vec3 ? 3 : T extends Vec4 ? 4 : never;

export type RawVec2 = [number, number];
export type RawVec3 = [number, number, number];
export type RawVec4 = [number, number, number, number];

/** creates an n-dimensional vector by duplicating x */
function dup<T extends VecAny>(x: number, dimensions: DimOf<T>): T {
    if (dimensions == 1) return Vec1.dup(x) as T;
    if (dimensions == 2) return Vec2.dup(x) as T;
    if (dimensions == 3) return Vec3.dup(x) as T;
    if (dimensions == 4) return Vec4.dup(x) as T;
}

/** creates an n-dimensional zero vector */
function zero<T extends VecAny>(dimensions: DimOf<T>): T {
    return dup(0, dimensions);
}

/** returns the dimension count of the given value */
export function dim<T extends VecAny>(a: T): DimOf<T> {
    return a.length as DimOf<T>;
}

/// Calculates multidimensional spring position and velocity for any given condition.
///
/// equations copied from
/// http://people.physics.tamu.edu/agnolet/Teaching/Phys_221/MathematicaWebPages/4_DampedHarmonicOsc
/// illator.pdf
export class SpringSolver<T extends VecAny> {
    dampingRatio: number;
    friction: number;
    target: T | null;
    initialValueOffset: T;
    initialVelocity: T;
    angularOffset: T;
    amplitudeFactor: T;
    dampedFriction: number;
    a1: T;
    a2: T;

    undampedAngularFrequency = 0;
    dampedAngularFrequency = 0;

    /// Creates a new spring with the given damping ratio and period.
    constructor (dampingRatio: number, period: number, dimensions: DimOf<T>) {
        this.dampingRatio = dampingRatio;
        this.friction = dampingRatio * (4 * Math.PI / period);
        this.target = zero(dimensions);
        this.hydrateParams(zero(dimensions), zero(dimensions));
    }

    /// Sets internal parameters for the given initial velocity.
    hydrateParams (initialValue: T, initialVelocity: T) {
        const z: T = zero(dim(initialValue));

        if (this.target === null) {
            // uncontrolled “spring”
            this.initialValueOffset = initialValue.add(this.friction === 0
                ? z
                : initialVelocity.divs(this.friction));
            this.initialVelocity = initialVelocity;
            return;
        }

        initialValue = initialValue.sub(this.target as any);

        this.undampedAngularFrequency = this.dampingRatio === 0
            ? 0
            : this.friction / this.dampingRatio / 2;
        this.dampedAngularFrequency =
            this.undampedAngularFrequency * Math.sqrt(1 - this.dampingRatio ** 2);
        this.angularOffset = initialVelocity.muls(2).add(initialValue.muls(this.friction)).atan2(
            initialValue.muls(2 * this.dampedAngularFrequency)
        );

        {
            this.amplitudeFactor = z.clone();
            for (let i = 0; i < initialValue.length; i++) {
                this.amplitudeFactor[i] = Math.abs(initialValue[i]) < 1e-5
                    ? Math.sign(initialVelocity[i]) * initialVelocity[i] / this.dampedAngularFrequency
                    : initialValue[i] / Math.cos(this.angularOffset[i]);
            }
        }

        this.dampedFriction = Math.max(
            // approximate zero because lim is too expensive to compute
            1e-5,
            Math.sqrt((this.friction / 2) ** 2 - this.undampedAngularFrequency ** 2) * 2,
        );
        this.a1 = initialVelocity.muls(-2).add(initialValue.muls(-this.friction + this.dampedFriction))
            .divs(2 * this.dampedFriction);
        this.a2 = initialVelocity.muls(2).add(initialValue.muls(this.friction + this.dampedFriction))
            .divs(2 * this.dampedFriction);
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
                return this.initialValueOffset.add(this.initialVelocity.muls(t));
            }

            // no target means the only active part of the equation is v' = -cv
            // => solution: v = k * e^(-cx); integral: x = -k * e^(-cx) / c + C
            return this.initialValueOffset
                .sub(this.initialVelocity.muls(Math.exp(-t * this.friction) / this.friction));
        }

        let value;
        if (this.dampingRatio < 1) {
            // underdamped
            value = this.amplitudeFactor.muls(Math.exp(-t * this.friction / 2))
                .mul(dup(this.dampedAngularFrequency * t, dim(this.angularOffset)).sub(this.angularOffset as any).cos());
        } else {
            // critically damped or overdamped
            value = this.a1.muls(Math.exp(t * (-this.friction - this.dampedFriction) / 2))
                .add(this.a2.muls(Math.exp(t * (-this.friction + this.dampedFriction) / 2)));
        }
        return value.add(this.target);
    }

    getVelocity (t) {
        if (this.target === null) {
            return this.initialVelocity.muls(Math.exp(-t * this.friction));
        }

        if (this.dampingRatio < 1) {
            // underdamped

            const daft: T = dup(this.dampedAngularFrequency * t, dim(this.target));

            const a = daft.sub(this.angularOffset as any).cos()
                .muls(-this.friction / 2 * Math.exp(-t * this.friction / 2));
            const b = daft.sub(this.angularOffset as any).sin()
                .muls(this.dampedAngularFrequency * Math.exp(-t * this.friction / 2));
            return this.amplitudeFactor.mul(a.sub(b));
        } else {
            // critically damped or overdamped
            const a = this.a1.muls((-this.friction - this.dampedFriction) / 2
                * Math.exp(t * (-this.friction - this.dampedFriction) / 2));
            const b = this.a2.muls((-this.friction + this.dampedFriction) / 2
                * Math.exp(t * (-this.friction + this.dampedFriction) / 2));
            return a.add(b);
        }
    }
}

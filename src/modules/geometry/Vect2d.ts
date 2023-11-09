import { fuzzyEquals } from "../../utils";

export type PointType = {
    x: number;
    y: number;
};

/** `Point` is a static/const container for helper functions to deal with PointType objects,
    such as creating them or doing math operations.  Benchmarks show 40x(!) faster performance
    when creating plain objects vs. classes/function prototypes, although once any members are accessed,
    the difference drops to "only" 2-3 improvement. The performance difference of using instance methods vs. static
    functions (like provided here) is less significant. So in some cases the convenience may outweigh the creation cost.
    Generally, read-only access if faster on plain objects vs. class instances, while changing property values is
    faster on the latter.
    `Point` could be converted to a class with static methods, which in some cases seems to perform (a little) better or
    (much) worse depending on the operation and what is being operated on (plain object or Vect2d class instance), and perhaps other factors.
 */
export const Point =
{
    /** Returns a new `PointType` object with `x` and `y` set from number value(s) or another PointType object.
        When no arguments are used, the default is `0` for both `x` and `y`. */
    new(xOrPt: number | PointType = 0, y?: number): PointType {
        if (typeof xOrPt == "number")
            return { x: xOrPt, y: (y == undefined ? xOrPt : y) };
        return { x: xOrPt.x, y: xOrPt.y };
    },

    /** Sets the x and y values of a PointType instance.
        The first parameter can be any object containing 'x' and 'y' properties, or a numeric value for the 'x' value.
        In the latter case, if a 2nd parameter is passed, it is assigned to the 'y' value; otherwise the first parameter
        is used for both 'x' and 'y'. */
    set(pt: PointType, xOrPt: number | PointType, y?: number): PointType {
        if (typeof xOrPt == "number")
            return this.setFromXY(pt, xOrPt, y);
        return this.setFromPt(pt, xOrPt);
    },

    setFromXY(pt: PointType, x: number, y?: number): PointType {
        pt.x = x; pt.y = (y == undefined ? x : y);
        return pt;
    },

    setFromPt(pt: PointType, fromPt: PointType): PointType {
        pt.x = fromPt.x; pt.y = fromPt.y;
        return pt;
    },

    /** Returns true if both x and y values of `pt` are zero. */
    isNull(pt: PointType): boolean { return !pt.x && !pt.y; },
    /** Returns true if both x and y values of `pt` are within `epsilon` delta of zero. */
    fuzzyIsNull(pt: PointType, epsilon: number = 0.0001): boolean { return fuzzyEquals(pt.x, 0, epsilon) && fuzzyEquals(pt.y, 0, epsilon); },
    /** Adds value(s) to `pt` and returns it. Modifies input value. */
    plus_eq(pt: PointType, xOrPt: number | PointType, y?: number): PointType {
        if (typeof xOrPt == "number")
            return this.setFromXY(pt, pt.x + xOrPt, pt.y + (y == undefined ? xOrPt : y));
        return this.setFromXY(pt, pt.x + xOrPt.x, pt.y + xOrPt.y);
    },
    /** Adds value(s) to `pt` and returns new instance, does not modify input value. */
    plus(pt: PointType, xOrPt: number | PointType, y?: number): PointType {
        return this.plus_eq(this.new(pt), xOrPt, y);
    },
    /** Multiplies `pt` coordinates by value(s) and returns it. Modifies input value. */
    times_eq(pt: PointType, xOrPt: number | PointType, y?: number): PointType {
        if (typeof xOrPt == "number")
            return this.setFromXY(pt, pt.x * xOrPt, pt.y * (y == undefined ? xOrPt : y));
        return this.setFromXY(pt, pt.x * xOrPt.x, pt.y * xOrPt.y);
    },
    /** Multiplies `pt` coordinates by value(s) and returns new instance, does not modify input value, */
    times(pt: PointType, xOrPt: number | PointType, y?: number): PointType {
        return this.times_eq(this.new(pt), xOrPt, y);
    },
    /** Swaps the `x` and `y` values of `pt` and returns it. */
    transpose(pt: PointType) { return this.setFromXY(pt, pt.y, pt.x); },
    /** Returns a new PointType object with the `x` and `y` values of `pt` swapped with each other. */
    transposed(pt: PointType) { return this.new(pt.y, pt.x); },
    /** Returns true is this PointType equals the given PointType or x & y values. */
    equals(pt: PointType, xOrPt: number | PointType, y?: number): boolean {
        if (typeof xOrPt == "number")
            return pt.x === xOrPt && pt.y === (y == undefined ? xOrPt : y);
        return xOrPt.x === pt.x && xOrPt.y === pt.y;
    },
    /** Returns true is this PointType equals the given PointType to within `epsilon` decimal places of precision. */
    fuzzyEquals(pt: PointType, other: PointType, epsilon: number = 0.0001): boolean {
        return fuzzyEquals(other.x, pt.x, epsilon) && fuzzyEquals(other.y, pt.y, epsilon);
    },

    toString(pt: PointType, name: string = "Point"): string {
        return `${name}{x: ${pt.x}, y:${pt.y}}`;
    },

} as const;

// MP: freezing doesn't seem to have an impact performance-wise, but anyway the object is meant to be immutable (for now) anyway.
Object.freeze(Point);


/** `Vect2d` is a concrete implementation of a `PointType` class. It is generally slower to create and read than a
    "plain" `PointType` object (eg. from `Point.new()`), but OTOH is usually faster when being updated/written.
    Using `Vect2d` is generally recommended for stored objects that persist for some time and/or are likely to get modified. */
export class Vect2d implements PointType
{
    x: number = 0;
    y: number = 0;

    /** A Vect2d instance can optionally be constructed from another PointType object (with 'x' and 'y' properties),
        or from numeric `x[,y]` arguments (see `set()` for details).
        A `Vect2d` constructed with no arguments has both `x` and `y` set to `0`. */
    constructor(xOrPt?: number | PointType , y?: number) {
        if (xOrPt != undefined)
            Point.set(this, xOrPt, y);
    }

    /** Returns true if both x and y values are zero. */
    get isNull(): boolean { return !this.x && !this.y; }
    /** Returns true if both x and y values are equal to zero to within 4 decimal places of precision. */
    get fuzzyIsNull(): boolean { return Point.fuzzyIsNull(this, 0.0001); }
    /** Length is the hypotenuse of the x and y values. */
    get length(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }

    /** Sets the x and y values of this Vect2d instance.
        The first parameter can be any object containing 'x' and 'y' properties, or a numeric value for the 'x' value.
        In the latter case, if a 2nd parameter is passed, it is assigned to the 'y' value; otherwise the first parameter
        is used for both 'x' and 'y' values. */
    set(xOrPt: number | PointType = 0, y?: number): Vect2d { return Point.set(this, xOrPt, y) as Vect2d; }

    /** Returns a new Vect2d with this instance's `x` and `y` values. */
    clone(): Vect2d { return new Vect2d(this); }

    /** Adds value(s) to current coordinates. Modifies the current value of this instance and returns itself */
    plus_eq(xOrPt: number | PointType, y?: number): Vect2d { return Point.plus_eq(this, xOrPt, y) as Vect2d; }
    /** Adds value(s) to current coordinates and returns a new Vect2d object. */
    plus(xOrPt: number | PointType, y?: number): Vect2d { return Point.plus_eq(this.clone(), xOrPt, y) as Vect2d; }
    /** Adds value(s) to `v` and returns new instance, does not modify input value. */
    static add(v: Vect2d, xOrPt: number | PointType, y?: number): Vect2d { return v.clone().plus_eq(xOrPt, y); }

    /** Multiplies current coordinates by value(s). Modifies the current value of this instance and returns itself */
    times_eq(xOrPt: number | PointType, y?: number): Vect2d { return Point.times_eq(this, xOrPt, y) as Vect2d; }
    /** Multiplies current coordinates by value(s) and returns a new `Vect2d` object. */
    times(xOrPt: number | PointType, y?: number): Vect2d { return Point.times_eq(this.clone(), xOrPt, y) as Vect2d; }
    /** Multiplies `v` coordinates by value(s) and returns new instance, does not modify input value, */
    static multiply(v: Vect2d, xOrPt: number | PointType, y?: number): Vect2d { return Point.times_eq(v.clone(), xOrPt, y) as Vect2d; }

    /** Swaps the `x` and `y` values of this vector and returns it. */
    transpose(): Vect2d { return Point.setFromXY(this, this.y, this.x) as Vect2d; }
    /** Returns a new `Vect2d` object with the `x` and `y` values of this vector swapped. */
    transposed(): Vect2d { return Point.setFromXY(this.clone(), this.y, this.x) as Vect2d; }

    /** Returns true is this Vect2d equals the given Vect2d or x & y values. */
    equals(xOrPt: number | PointType, y?: number): boolean { return Point.equals(this, xOrPt, y); }
    /** Returns true is this Vect2d equals the given PointType to within `epsilon` decimal places of precision. */
    fuzzyEquals(other: PointType, epsilon: number = 0.0001): boolean { return Point.fuzzyEquals(this, other, epsilon); }

    toString(): string { return Point.toString(this, this.constructor.name); }

    // note: `instanceof` is slooow; and BTW Object.hasOwn(obj, 'prop') is even slooooower.
    static [Symbol.hasInstance](obj: any) {
        return typeof obj == "object" && 'x' in obj && 'y' in obj;
    }
}

import { fuzzyEquals } from "../../utils";
import type { PointType } from "..";

export type SizeType = {
    width: number;
    height: number;
}
/** The `Size` class represents an object with `width` and `height` properties. Convenience properties and methods are provided for various operations.
It also provides static methods for working with any `SizeType` object (anything with `width` and `height` properties).
*/
export class Size implements SizeType
{
    width: number = 0;
    height: number = 0;

    constructor(widthOrSize?: number | Size | SizeType, height?: number) {
        Size.set(this, widthOrSize, height);
    }

    /** Returns true if either of the width or height are less than or equal to zero. */
    get isEmpty() { return Size.isEmpty(this); }
    /** Returns true if both width and height values are zero. */
    get isNull(): boolean { return Size.isNull(this); }
    /** Returns true if both width and height values are equal to zero to within 4 decimal places of precision. */
    get fuzzyIsNull(): boolean { return Size.fuzzyIsNull(this, 0.0001); }

    /** Returns a new `Size` instance with values copied from this one. */
    clone() : Size { return new Size(this); }

    /** Set the width and height properties.
        The `widthOrSize` parameter can be any object containing 'width' and 'height' properties, or a numeric value for the 'width' value.
        In the latter case, if a `height` parameter is passed, it is assigned to the 'height' value; otherwise the `widthOrSize` parameter
        is used for both 'width' and 'height'.  */
    set(widthOrSize: number | SizeType = 0, height?: number): this { return Size.set(this, widthOrSize, height) as this; }

    /** Returns true if this size equals the `widthOrSize` SizeType or width & height values. */
    equals(widthOrSize: number | SizeType, height?: number): boolean { return Size.equals(this, widthOrSize, height); }
    /** Returns true is this size equals the given SizeType to within `epsilon` decimal places of precision. */
    fuzzyEquals(other: SizeType, epsilon: number = 0.0001): boolean { return Size.fuzzyEquals(this, other, epsilon); }

    /** Adds value(s) to current coordinates. Modifies the current value of this instance and returns itself */
    plus_eq(widthOrSize: number | SizeType | PointType, height?: number): this { return Size.plus_eq(this, widthOrSize, height) as this; }
    /** Adds value(s) to current coordinates and returns a new Vect2d object. */
    plus(widthOrSize: number | SizeType | PointType, height?: number): Size { return Size.plus_eq(this.clone(), widthOrSize, height) as Size; }
    /** Adds value(s) to `size` and returns new instance, does not modify input value. */
    static add(size: Size, widthOrSize: number | SizeType | PointType, height?: number): Size { return size.clone().plus_eq(widthOrSize, height); }

    /** Multiplies current coordinates by value(s). Modifies the current value of this instance and returns itself */
    times_eq(widthOrSize: number | SizeType | PointType, height?: number): this { return Size.times_eq(this, widthOrSize, height) as this; }
    /** Multiplies current coordinates by value(s) and returns a new `Vect2d` object. */
    times(widthOrSize: number | SizeType | PointType, height?: number): Size { return Size.times_eq(this.clone(), widthOrSize, height) as Size; }
    /** Multiplies `size` coordinates by value(s) and returns new instance, does not modify input value, */
    static multiply(size: Size, widthOrSize: number | SizeType | PointType, height?: number): Size { return Size.times_eq(size.clone(), widthOrSize, height) as Size; }

    toString() { Size.toString(this); }

    // Static methods operate only on generic `SizeType` types, not `Size`.
    // This is generally faster for creation and read-only access than an full new instance of `Size`, but slower for writes/updates.
    // Note also that in a few cases it is actually faster to update (eg. `set()`) an instance of `Size` using these static functions
    // than to call the corresponding instance's methods. Go figure...

    /** Returns a new SizeType object with width and height set from number value(s) or another SizeType object. */
    static new(widthOrSize: number | SizeType = 0, height?: number): SizeType {
        if (typeof widthOrSize == "number")
            return { width: widthOrSize, height: (height == undefined ? widthOrSize : height) };
        return { width: widthOrSize.width, height: widthOrSize.height };
    }

    /** Sets the width and height values of a SizeType object.
        The `widthOrSize` parameter can be any object containing 'width' and 'height' properties, or a numeric value for the 'width' value.
        In the latter case, if a `height` parameter is passed, it is assigned to the 'height' value; otherwise the `widthOrSize` parameter
        is used for both 'width' and 'height'.  */
    static set(sz: SizeType, widthOrSize: number | SizeType = 0, height?: number): SizeType {
        if (typeof widthOrSize == "number") {
            sz.width = widthOrSize;
            sz.height = (height === undefined ? widthOrSize : height);
        }
        else {
            sz.width = widthOrSize.width;
            sz.height = widthOrSize.height;
        }
        return sz;
    }

    /** Returns true if either of the width or height are less than or equal to zero. */
    static isEmpty(sz: SizeType) { return sz.width <= 0 || sz.height <= 0; }
    /** Returns true if both width and height of `sz` are zero. */
    static isNull(sz: SizeType) { return !sz.width && !sz.height; }
    /** Returns true if both width and height of `sz` are within `epsilon` delta of zero. */
    static fuzzyIsNull(sz: SizeType, epsilon: number = 0.0001): boolean { return fuzzyEquals(sz.width, 0, epsilon) && fuzzyEquals(sz.height, 0, epsilon); }

    /** Returns true if `sz` SizeType equals the `widthOrSize` SizeType or width & height values. */
    static equals(sz: SizeType, widthOrSize: number | SizeType, height?: number): boolean {
        if (typeof widthOrSize == "number")
            return sz.width === widthOrSize && sz.height === (height == undefined ? widthOrSize : height);
        return widthOrSize.width === sz.width && widthOrSize.height === sz.height;
    }
    /** Returns true is this SizeType equals the given SizeType to within `epsilon` decimal places of precision. */
    static fuzzyEquals(sz: SizeType, other: SizeType, epsilon: number = 0.0001): boolean {
        return fuzzyEquals(other.width, sz.width, epsilon) && fuzzyEquals(other.height, sz.height, epsilon);
    }


    /** Adds value(s) to `sz` and returns it. Modifies input value. */
    static plus_eq(sz: SizeType, widthOrSize: number | SizeType | PointType, height?: number): SizeType {
        if (typeof widthOrSize == "number")
            return Size.set(sz, sz.width + widthOrSize, sz.height + (height == undefined ? widthOrSize : height));
        if (typeof widthOrSize != 'object')
            return sz;
        if ('width' in widthOrSize)
            return Size.set(sz, sz.width + widthOrSize.width, sz.height + widthOrSize.height);
        return Size.set(sz, sz.width + widthOrSize.x, sz.height + widthOrSize.y);
    }

    /** Adds value(s) to `sz` and returns new instance, does not modify input value. */
    static plus(sz: SizeType, widthOrSize: number | SizeType | PointType, height?: number): SizeType {
        return Size.plus_eq(Size.new(sz), widthOrSize, height);
    }

    /** Multiplies `sz` coordinates by value(s) and returns it. Modifies input value. */
    static times_eq(sz: SizeType, widthOrSize: number | SizeType | PointType, height?: number): SizeType {
        if (typeof widthOrSize == "number")
            return Size.set(sz, sz.width * widthOrSize, sz.height * (height == undefined ? widthOrSize : height));
        if (typeof widthOrSize != 'object')
            return sz;
        if ('width' in widthOrSize)
            return Size.set(sz, sz.width * widthOrSize.width, sz.height * widthOrSize.height);
        return Size.set(sz, sz.width * widthOrSize.x, sz.height * widthOrSize.y);
    }

    /** Multiplies `sz` coordinates by value(s) and returns new instance, does not modify input value, */
    static times(sz: SizeType, widthOrSize: number | SizeType | PointType, height?: number): SizeType {
        return Size.times_eq(Size.new(sz), widthOrSize, height);
    }


    static toString(sz: SizeType, name: string = "Size"): string {
        return `${name}{w: ${sz.width}, h:${sz.height}}`;
    }

}

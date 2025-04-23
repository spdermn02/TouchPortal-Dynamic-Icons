import { PointType, Point, Size, SizeType, Vect2d } from './';
import { round5p } from '../../utils';

/** A rectangle type storing x, y, with, & height values. Convenience methods are provided for various operations.

The values are stored as `origin` (`Vect2d` type) and `size` (`Size` type) properties
which can be read or manipulated directly using their respective methods.
*/
export default class Rectangle
{
    readonly origin: Vect2d = new Vect2d();
    readonly size: Size =  new Size();

    constructor();
    constructor(rect: Rectangle);
    constructor(origin: PointType, size: SizeType);
    constructor(origin: PointType, width: number, height: number);
    constructor(top: number, left?: number, size?: SizeType);
    constructor(top: number, left: number, width?: number, height?: number);
    // implementation
    constructor(...args: any[]) {
        // @ts-ignore
        this.set(...args);
    }

    set(rect: Rectangle): this;
    set(origin: PointType, size?: SizeType): this;
    set(origin: PointType, width?: number, height?: number): this;
    set(top: number, left: number, size?: SizeType): this;
    set(top?: number, left?: number, width?: number, height?: number): this;
    // implementation
    set(...args: any[]): this {
        // (0?: number | PointType | Rectangle, 1?: number | SizeType, 2?: number | SizeType, 3?: number)
        if (args[0] == undefined)
            return this;
        let arg0isObj = (typeof args[0] == 'object'),
            arg1notObj = false;
        if (arg0isObj) {
            if (args[0] instanceof Rectangle)
                return this.set(args[0].origin, args[0].size);
            Point.set(this.origin, args[0]);
        }
        else if (typeof args[0] == 'number') {
            this.origin.set(args[0], args[1]);
            arg1notObj = true;
        }

        if (!arg1notObj && typeof args[1] == 'object')
            return this.setSize(args[1]);
         if (arg1notObj && typeof args[2] == 'object')
            return this.setSize(args[2]);
        if (typeof args[1] == 'number' && arg0isObj)
            return this.setSize(args[1], args[2]);
        if (args[2] != undefined)
            return this.setSize(args[2], args[3]);
        return this;
    }

    clone(): Rectangle {
        return new Rectangle(this.origin, this.size);
    }

    toString(): string {
        return `${this.constructor.name}(${this.x},${this.y} ${this.width}x${this.height}; L:${this.left} R:${this.right} T:${this.top} B:${this.bottom})`;
    }

    /** Creates a new instance of Rectangle with origin(0,0) and the given size for width and height. */
    static fromSize(size: SizeType): Rectangle {
        return new Rectangle(Point.new(), size);
    }
    /** Creates a new instance of Rectangle from a "bounds" type object where origin coordinate properties are left/top instead of x/y. */
    static fromBounds(bounds?: {left: number, top: number, width: number, height: number}): Rectangle {
        if (!bounds)
            return new Rectangle();
        return new Rectangle(bounds.left, bounds.top, bounds.width, bounds.height);
    }

    get x(): number  { return this.origin.x; }
    set x(x: number) { this.origin.x = x; }
    get y(): number  { return this.origin.y; }
    set y(y: number) { this.origin.y = y; }
    get width(): number   { return this.size.width; }
    set width(w: number)  { this.size.width = w; }
    get height(): number  { return this.size.height; }
    set height(h: number) { this.size.height = h; }

    get top():    number { return this.height < 0 ? this.y + this.height : this.y; }
    get right():  number { return this.width  < 0 ? this.x : this.x + this.width; }
    get bottom(): number { return this.height < 0 ? this.y : this.y + this.height; }
    get left():   number { return this.width  < 0 ? this.x + this.width : this.x; }
    get center(): PointType { return Point.plus(this.origin, round5p(this.width * .5), round5p(this.height * .5)) }

    /** Returns true if either of the width or height are less than or equal to zero. */
    get isEmpty() { return this.size.isEmpty; }
    /** Returns true if both the width or height are zero. */
    get isNull() { return this.size.isNull; }
    /** Returns true if both width and height values are equal to zero to within 4 decimal places of precision. */
    get fuzzyIsNull() { return this.size.fuzzyIsNull; }

    /** Sets the top left coordinates of this rectangle to `origin` and returns itself. */
    setOrigin(origin: PointType): this;
    /** Sets the top left coordinates of this rectangle to `x` and `y` and returns itself.
        If `y` is undefined then value of `x` is used for both dimensions. */
    setOrigin(x: number, y?: number): this;
    // implementation
    setOrigin(xOrOrigin: number | PointType, y?: number): this {
        this.origin.set(xOrOrigin, y);
        return this;
    }

    /** Sets the size of this rectangle to `size` and returns itself. */
    setSize(size: SizeType): this;
    /** Sets the size of this rectangle to `width` and `height` and returns itself.
        If `height` is undefined then value of `width` is used for both dimensions. */
    setSize(width: number, height?: number): this;
    // implementation
    setSize(widthOrSize: number | SizeType, height?: number): this {
        this.size.set(widthOrSize, height);
        return this;
    }

    /** Resets origin and size of this Rectangle instance to `0`s and returns itself. */
    clear(): this {
        return this.setOrigin(0,0).setSize(0,0);
    }

    /** Returns true if this rectangle's origin and size are equal to `other` rectangle's origin and size. */
    equals(other: Rectangle): boolean {
        return this.origin.equals(other.origin) && this.size.equals(other.size);
    }
    /** Returns true if this rectangle's origin and size are equal to `other` rectangle's origin and size to within `epsilon` decimal places of precision. */
    fuzzyEquals(other: Rectangle, epsilon: number = 0.0001): boolean {
        return this.origin.fuzzyEquals(other.origin, epsilon) && this.size.fuzzyEquals(other.size, epsilon);
    }

    /** Clones this Rectangle, adds `origin` to both origin coordinates and `size` to both size coordinates, and returns the new instance.  */
    adjusted(origin: number | PointType, size: number | SizeType): Rectangle;
    /** Clones this Rectangle, adds `origin` to both origin coordinates and `right` and `bottom` to size coordinates, and returns the new instance. */
    adjusted(origin: number | PointType, right: number, bottom: number): Rectangle;
    /** Adds given offsets to a copy of this rectangle and returns the copy. */
    adjusted(left: number, top: number, right: number, bottom: number): Rectangle;
    // implementation
    adjusted(...args: any[]): Rectangle {
        // @ts-ignore
        return Rectangle.adjust(this.clone(), ...args);
    }

    /** Adds `origin` to both origin coordinates and `size` to both size coordinates of this instance and returns itself. */
    adjust(origin: number | PointType, size: number | SizeType): this;
    /** Adds `origin` to both origin coordinates and `right` and `bottom` to size coordinates of this instance and returns itself. */
    adjust(origin: number | PointType, right: number, bottom: number): this;
    /** Adds given values to this rectangle's coordinates and returns this instance. */
    adjust(left: number, top: number, right: number, bottom: number): this;
    // implementation
    adjust(...args: any[]): this {
        // @ts-ignore
        return Rectangle.adjust(this, ...args) as this;
    }

    /** Combines the bounding area of this rectangle with that of the given rectangle(s) and returns itself. */
    unite(...args: Array<Rectangle>) { return Rectangle.unite(this, ...args); }
    /** Returns the bounding area of this rectangle and the given rectangle(s) as a new `Rectangle` instance. Doesn't modify the original. */
    united(...args: Array<Rectangle>) { return Rectangle.united(this, ...args); }

    /** Moves the x,y origin of the rectangle by the given offset. Returns itself. */
    translate(offset: PointType): this
    /** Moves the x,y origin of the rectangle by the given amounts. If `y` is undefined then `x` value is added to both dimensions. Returns itself. */
    translate(x: number, y?: number): this;
    // implementation
    translate(xOrOffs: number | PointType, y?: number): this {
        // @ts-ignore
        return Rectangle.translate(this, xOrOffs, y);
    }

    /** Scales this rectangle's `origin.x` and `size.width` by `factor.x` and `origin.y` and `size.height` by `factor.y` values. Returns itself. */
    scale(factor: PointType): this;
    /** Scales this rectangle's `origin` and `size` by `factor`. Returns itself. */
    scale(factor: number): this;
    /** Scales this rectangle's `origin.x` and `size.width` by `factorX` and `origin.y` and `size.height` by `factorY` values. */
    scale(factorX:number, factorY:number): this;
    // implementation
    scale(factor: PointType|number, factorY?:number): this {
        // @ts-ignore
        return Rectangle.scale(this, factor, factorY);
    }

    // Static operation methods

    /** Adds given offsets to a copy of the `rect` Rectangle and returns the copied & adjusted Rectangle. */
    static adjusted(rect: Rectangle, origin: number | PointType, size: number | SizeType): Rectangle;
    /** Clones the `rect` Rectangle, adds `origin` to both origin coordinates and `right` and `bottom` to size coordinates, and returns the new instance. */
    static adjusted(rect: Rectangle, origin: number | PointType, right: number, bottom: number): Rectangle;
    /** Adds given offsets to a copy of `rect` Rectangle and returns the copy. */
    static adjusted(rect: Rectangle, left: number, top: number, right: number, bottom: number): Rectangle;
    // implementation
    static adjusted(...args: any[]): Rectangle {
        // @ts-ignore
        return Rectangle.adjust(rect.clone(), ...args);
    }

    /** Adds `origin` to both `rect.origin` coordinates and `size` to both `rect.size` coordinates. The input rectangle is modified. Returns the adjusted Rectangle.  */
    static adjust(rect: Rectangle, origin: number | PointType, size: number | SizeType): Rectangle;
    /** Adds `origin` to both `rect.origin` coordinates and `right` and `bottom` to `rect.size` coordinates. The input rectangle is modified. Returns the adjusted Rectangle. */
    static adjust(rect: Rectangle, origin: number | PointType, right: number, bottom: number): Rectangle;
    /** Adds given offsets to the given rectangle's coordinates. The input rectangle is modified. Returns the adjusted Rectangle. */
    static adjust(rect: Rectangle, left: number, top: number, right: number, bottom: number): Rectangle;
    // implementation
    static adjust(
        rect: Rectangle,
        leftOrOffs: number | PointType,
        topOrSz: number | SizeType,
        rtOrBot?: number,
        bottom?: number
    ): Rectangle
    {
        if (bottom === undefined)
            rect.origin.plus_eq(leftOrOffs);
        else
            rect.origin.plus_eq(leftOrOffs, topOrSz as number);
        const szIsObj = typeof topOrSz != "number";
        rect.width += rtOrBot ?? (szIsObj ? topOrSz.width : topOrSz);
        rect.height += bottom ?? rtOrBot ?? (szIsObj ? topOrSz.height : topOrSz);
        return rect;
    }

    /** Returns the bounding area of the given rectangle(s) as a new `Rectangle` instance. Doesn't modify inputs. */
    static united(...args: Array<Rectangle>) {
        let left = Infinity, right = -Infinity,
            top = Infinity, bot = -Infinity;
        for (const rect of args) {
            if (!rect || rect.isNull)
                continue;
            if (!!rect.width) {
                left = Math.min(left, rect.left);
                right = Math.max(right, rect.right);
            }
            if (!!rect.height) {
                top = Math.min(top, rect.top);
                bot = Math.max(bot, rect.bottom);
            }
        }
        right -= left;
        bot -= top;
        return new Rectangle(left || 0, top || 0, right || 0, bot || 0);
    }
    /** Combines the bounding area of `rect` rectangle and the given rectangle(s). The input rectangle is modified and returned. */
    static unite(rect: Rectangle, ...args: Array<Rectangle>) {
        return rect.set(Rectangle.united(rect, ...args));
    }

    /** Moves the x,y origin of the rectangle `rect` by the given offset. The input rectangle is modified and returned. */
    static translate(rect: Rectangle, offset: PointType): Rectangle
    /** Moves the x,y origin of the rectangle `rect` by the given amounts. If `y` is undefined then `x` value is added to both dimensions. The input rectangle is modified and returned. */
    static translate(rect: Rectangle, x: number, y?: number): Rectangle;
    // implementation
    static translate(rect: Rectangle, xOrOffs: number | PointType, y?: number): Rectangle {
        rect.origin.plus_eq(xOrOffs, y);
        return rect;
    }

    /** Scales `rect` rectangle's `origin.x` and `size.width` by `factor.x` and `origin.y` and `size.height` by `factor.y` values. The input rectangle is modified and returned. */
    static scale(rect: Rectangle, factor: PointType): Rectangle;
    /** Scales `rect` rectangle's `origin` and `size` by `factor`. The input rectangle is modified and returned. */
    static scale(rect: Rectangle, factor: number): Rectangle;
    /** Scales `rect` rectangle's `origin.x` and `size.width` by `factorX` and `origin.y` and `size.height` by `factorY` values. The input rectangle is modified and returned. */
    static scale(rect: Rectangle, factorX:number, factorY:number): Rectangle;
    // implementation
    static scale(rect: Rectangle, factor: PointType|number, factorY?:number): Rectangle {
        rect.origin.times_eq(factor, factorY);
        rect.size.times_eq(factor, factorY)
        return rect;
    }

    static [Symbol.hasInstance](obj: any) {
        return typeof obj == "object" && 'origin' in obj && 'size' in obj;
    }

}

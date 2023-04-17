
export type TpActionDataArrayType = { id:string, value:string }[];

export type SizeType = {
    width: number;
    height: number;
}

export class Vect2d
{
    x: number = 0;
    y: number = 0;

    constructor(xOrVect: number | Vect2d = 0, y?: number) { this.set(xOrVect, y); }

    /** Returns true if both x and y values are zero. */
    get isEmpty():boolean { return !this.x && !this.y; }

    /** Sets the x and y values of this Vect2d instance.
     * The first parameter can be any object containing 'x' and 'y' properties, or a numeric value for the 'x' value.
     * In the latter case, if a 2nd parameter is passed, it is assigned to the 'y' value; otherwise the first parameter
     * is used for both 'x' and 'y' values.
    */
    set(xOrVect: number | Vect2d | any = 0, y?: number):Vect2d {
        if (typeof(xOrVect) === "number") {
            this.x = xOrVect;
            this.y = (typeof y === 'undefined' ? this.x : y);
        }
        else if ('x' in xOrVect && 'y' in xOrVect) {
            this.x = xOrVect.x;
            this.y = xOrVect.y;
        }
        return this;
    }

    /** modifies the current value of this instance and returns itself */
    add(xOrVect: number | Vect2d, y?: number):Vect2d { this.set(Vect2d.add(this, xOrVect, y)); return this; }
    /** modifies the current value of this instance and returns itself */
    mult(xOrVect: number | Vect2d, y?: number):Vect2d { this.set(Vect2d.mult(this, xOrVect, y)); return this; }

    /** returns new instance, does not modify input values */
    static add(v:Vect2d, xOrVect: number | Vect2d, y?: number):Vect2d {
        if (typeof(xOrVect) === "number")
            return new Vect2d(v.x + xOrVect, v.y + (typeof(y) === 'undefined' ? xOrVect : y));
        if ('x' in xOrVect && 'y' in xOrVect)
            return new Vect2d(v.x + xOrVect.x, v.y + xOrVect.y);
        return v;
    }
    /** returns new instance, does not modify input values */
    static mult(v:Vect2d, xOrVect: number | Vect2d, y?: number):Vect2d {
        if (typeof(xOrVect) === "number")
            return new Vect2d(v.x * xOrVect, v.y * (typeof(y) === 'undefined' ? xOrVect : y));
        if ('x' in xOrVect && 'y' in xOrVect)
            return new Vect2d(v.x * xOrVect.x, v.y * xOrVect.y);
        return v;
    }

    /** Returns true is this Vect2d equals the given Vect2d or x & y values. */
    equals(xOrVect: number | Vect2d | any, y?: number): boolean {
        if (typeof(xOrVect) === "number")
            return this.x === xOrVect && typeof y === 'number' && this.y == y;
        return typeof(xOrVect) === "object" && xOrVect.x === this.x && xOrVect.y === this.y;
    }
}

Object.defineProperty(Vect2d, Symbol.hasInstance, {
    configurable: true,
    value(instance: any) {
        return typeof(instance) === "object" && 'x' in instance && 'y' in instance;
    },
});

export class Rectangle
{
    origin: Vect2d = new Vect2d();
    size: SizeType = { width: 0, height: 0 };

    constructor(x: number = 0, y: number = 0, w: number = 0, h: number = 0) {
        this.origin = new Vect2d(x, y);
        this.size = { width: w, height: h};
    }

    /** Creates a new instance of Rectangle with origin(0,0) and the given size for width and height. */
    static createFromSize(size: SizeType) : Rectangle {
        return new Rectangle(0, 0, size.width, size.height);
    }

    get x() { return this.origin.x; }
    set x(x:number) { this.origin.x = x; }
    get y() { return this.origin.y; }
    set y(y:number) { this.origin.y = y; }
    get width() { return this.size.width; }
    set width(w:number) { this.size.width = w; }
    get height() { return this.size.height; }
    set height(h:number) { this.size.height = h; }

    /** Returns true if either of the width or height are less than or equal to zero. */
    get isEmpty() { return this.size.width <= 0 || this.size.height <= 0; }
}

Object.defineProperty(Rectangle, Symbol.hasInstance, {
    configurable: true,
    value(instance: any) {
        return typeof(instance) === "object" && 'origin' in instance && 'size' in instance;
    },
});

// just a convenience string alias class for now, maybe extended later for gradients.  TODO: Gradients!
export class BrushStyle extends String
{
    // returns true if color string is empty or represents a transparent color
    get isEmpty(): boolean {
        const len = this.length;
        return !len || (len == 9 && this.endsWith("00")) || (len == 4 && this.endsWith("0"));
    }
}

// struct to pass meta data as reference to chained action data parsing methods (eg. the various elements' loadFromActionData() methods)
export class ParseState
{
    data: TpActionDataArrayType = [];  // [in] data array to parse
    pos: number = 1;    // [in/out] index into data array of current parsing position; incremented for every data field "consumed" by a parser
    // consumed: number = 0;                      // [out] number of consecutive fields parsed from the data array

    constructor(init?: Partial<ParseState>) { Object.assign(this, init); }
    setPos(pos: number): ParseState { this.pos = pos; return this; }
}

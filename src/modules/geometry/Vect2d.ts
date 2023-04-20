
export default class Vect2d
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

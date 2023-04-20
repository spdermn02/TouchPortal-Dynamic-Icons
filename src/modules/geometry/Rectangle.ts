import { SizeType, Vect2d } from './';

export default class Rectangle
{
    origin: Vect2d = new Vect2d();
    size: SizeType = { width: 0, height: 0 };

    constructor(x: number = 0, y: number = 0, w: number = 0, h: number = 0) {
        this.origin = new Vect2d(x, y);
        this.size = { width: w, height: h};
    }

    /** Creates a new instance of Rectangle with origin(0,0) and the given size for width and height. */
    static fromSize(size: SizeType) : Rectangle {
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

import { Vect2d } from './';

export type SizeType = {
    width: number;
    height: number;
}

export default class Size extends Vect2d implements SizeType
{
    constructor(widthOrSize: number | Vect2d | Size = 0, height?: number) {
        super(widthOrSize, height);
    }

    get width() { return this.x; }
    set width(val: number) { this.x = val; }

    get height() { return this.y; }
    set height(val: number) { this.y = val; }

    set(widthOrSize: number | Vect2d | Size = 0, height?: number): Size {
        return super.set(widthOrSize, height) as Size;
    }
}

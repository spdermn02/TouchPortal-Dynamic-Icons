
export type SizeType = {
    width: number;
    height: number;
}

export class Size implements SizeType
{
    width: number = 0;
    height: number = 0;

    constructor(widthOrSize?: number | Size | SizeType, height?: number) {
        Size.set(this, widthOrSize, height);
    }

    // get width() { return this.x; }
    // set width(val: number) { this.x = val; }

    // get height() { return this.y; }
    // set height(val: number) { this.y = val; }

    /** Returns true if either of the width or height are less than or equal to zero. */
    get isEmpty() { return Size.isEmpty(this); }
    /** Returns true if both width and height values are zero. */
    get isNull(): boolean { return Size.isNull(this); }

    set(widthOrSize: number | Size = 0, height?: number): Size { return Size.set(this, widthOrSize, height) as Size; }


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

    /** Returns true is `sz` SizeType equals the `widthOrSize` SizeType or width & height values. */
    static equals(sz: SizeType, widthOrSize: number | SizeType, height?: number): boolean {
        if (typeof widthOrSize == "number")
            return height != undefined && sz.width === widthOrSize && sz.height === height;
        return widthOrSize.width === sz.width && widthOrSize.height === sz.height;
    }

}

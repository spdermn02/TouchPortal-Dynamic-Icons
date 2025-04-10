import { assignExistingProperties, } from '../../utils';
import type { RenderContext2D } from '../';

// just a convenience string container class for now, maybe extended later for gradients.
// TODO: Gradients!

/** Class for applying a fill or stroke style to a Canvas. Currently only supports solid color style. */
export default class BrushStyle {
    private _color: string = "";
    private _empty: boolean = true;

    constructor(init?: Partial<BrushStyle> | string) {
        if (typeof init == 'string')
            this.color = init;
        else
            assignExistingProperties(this, init, 0);
    }

    /** true if color string is empty OR represents a transparent color. */
    get isEmpty(): boolean { return this._empty; }
    /** true if color string is empty. */
    get isNull(): boolean { return !this._color.length; }

    /** Set brush style as a solid color.

    Input value must be a hex-encoded color in RGB[A] format (3, 4, 6 or 8 hex digits) starting with '#'. `#R[R]G[G]B[B][A[A]]` */
    set color(v: string) {
        if (!v) {
            this._color = "";
            this._empty = true;
            return;
        }

        if (!v.startsWith('#'))
            return;

        this._color = v;
        this._empty = (v.length == 9 && v.endsWith("00")) || (v.length == 4 && v.endsWith("0"));
    }
    /** Returns any color previously set on the `color` property, if any (default is an empty string). */
    get color(): string { return this._color; }

    /** Returns the current style to apply to canvas context properties `fillStyle` or `strokeStyle`. */
    get style(): string | CanvasGradient | CanvasPattern {
        return this._color;
    }

    /** Applies the current `style` property to the given `ctx` as a `fillStyle` if the current `isNull` property returns `false`. */
    render(ctx: RenderContext2D): void {
        if (!this.isNull)
            ctx.fillStyle = this.style;
    }
}

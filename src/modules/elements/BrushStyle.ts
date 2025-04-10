import { assignExistingProperties, } from '../../utils';
import type { CanvasGradient, CanvasPattern, CanvasTexture, ContextFillStrokeType, RenderContext2D } from '../';

/** Class for storing a fill or stroke style to use on a Canvas context. */
export default class BrushStyle
{
    #color: string = "";
    #transparent: boolean = true;
    #gradient: CanvasGradient | null = null;
    #pattern: CanvasPattern | null = null;
    #texture: CanvasTexture | null = null;

    constructor(init?: Partial<BrushStyle> | string) {
        if (typeof init == 'string')
            this.color = init;
        else
            assignExistingProperties(this, init, 0);
    }

    /** Returns `true` if color string is empty and gradient/pattern/texture are all `null`. */
    get isNull(): boolean { return !this.#color && !this.#gradient && !this.#pattern && !this.#texture; }
    /** Returns `true` if `isNull` is `true` OR a solid color represents a transparent color. */
    get isEmpty(): boolean { return this.isNull || (!!this.color && this.#transparent); }

    /** Returns any color previously set on the `color` property, if any (default is an empty string). */
    get color(): string { return this.#color; }
    /** Set brush style as a solid color.

        Input value must be a format accepted by `CanvasRenderingContext2D` `fillStyle` and `strokeStyle` properties:
        a CSS named color, `#RGB[A]` hex values, `rgb[a](r g b [/ a])`, `hsl[a](h s l [/ a])`, or `hwb(h w b [/ a])`

         Setting a color will override all other styles (even if it is empty or transparent).
    */
    set color(v: string) {
        if (this.#color === v)
            return;
        this.#color = v;
        this.#gradient = null;
        this.#pattern = null;
        this.#texture = null;

        // pretty weak test for transparency, would be better to actually parse the color but that would also be expensive
        if (v[0] === '#')
            this.#transparent = (v.length == 9 && v.endsWith("00")) || (v.length == 4 && v.endsWith("0"));
        else
            this.#transparent = !v || v == "transparent" || v.split(/[\s,\/]+/, 4).some((v, i) => i == 3 && parseFloat(v) === 0);
    }

    /** Specifies a gradient to use for the drawing style. Setting a gradient will override all other styles (even if it is `null`). */
    get gradient(): CanvasGradient | null { return this.#gradient; }
    set gradient(v: CanvasGradient | null) {
        this.#gradient = v;
        this.#color = "";
        this.#pattern = null;
        this.#texture = null;
    }

    /** Specifies a pattern to use for the drawing style. Setting a pattern will override all other styles (even if it is `null`). */
    get pattern(): CanvasPattern | null { return this.#pattern; }
    set pattern(v: CanvasPattern | null) {
        this.#pattern = v;
        this.#color = "";
        this.#gradient = null;
        this.#texture = null;
    }

    /** Specifies a texture to use for the drawing style. Setting a texture will override all other styles (even if it is `null`). */
    get texture(): CanvasTexture | null { return this.#texture; }
    set texture(v: CanvasTexture | null) {
        this.#texture = v;
        this.#color = "";
        this.#gradient = null;
        this.#pattern = null;
    }

    /** Returns the current style to apply to canvas context properties `fillStyle` or `strokeStyle`. */
    get style(): ContextFillStrokeType {
        return this.#color || this.#gradient || this.#pattern || this.#texture || "";
    }

    /** Applies the current `style` property to the given `ctx` as a `fillStyle`, or `strokeStyle` if `asFill` is set to `false`.
        If the current `isNull` property returns `true` then no styles are applied. */
    render(ctx: RenderContext2D, asFill: boolean = true): void {
        if (!this.isNull) {
            if (asFill)
                ctx.fillStyle = this.style;
            else
                ctx.strokeStyle = this.style;
        }
    }
}

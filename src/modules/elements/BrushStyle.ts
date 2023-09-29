import { RenderContext2D } from '../';

// just a convenience string container class for now, maybe extended later for gradients.
// TODO: Gradients!

export default class BrushStyle {
    private _color: string = "";
    private _empty: boolean = true;

    constructor(color?: string) {
        if (color)
            this.color = color;
    }

    readonly type: string = "BrushStyle";

    /** true if color string is empty OR represents a transparent color. */
    get isEmpty(): boolean { return this._empty; }
    /** true if color string is empty. */
    get isNull(): boolean { return !this._color.length; }

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
    get color(): string { return this._color; }

    get style(): string | CanvasGradient | CanvasPattern {
        return this._color;
    }

    render(ctx: RenderContext2D): void {
        if (!this.isNull)
            ctx.fillStyle = this.style;
    }
}

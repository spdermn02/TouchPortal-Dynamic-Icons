import { IRenderable, RenderContext2D } from '../interfaces';
import { Vect2d } from '../geometry';
import { BrushStyle } from './';

export default class ShadowStyle implements IRenderable {
    blur: number = 0;
    offset: Vect2d = new Vect2d();
    color: BrushStyle = new BrushStyle("#0000");

    // IRenderable
    get type(): string { return "ShadowStyle"; }
    // returns true if blur and offset are are <= 0 or if color is transparent/invalid.
    get isEmpty(): boolean { return (this.blur <= 0 && this.offset.isEmpty); }

    render(ctx: RenderContext2D): void {
        if (this.isEmpty)
            return;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.blur;
        ctx.shadowOffsetX = this.offset.x;
        ctx.shadowOffsetY = this.offset.y;
    }

		/** Resets all shadow attributes on given context.  */
		resetContext(ctx: RenderContext2D): void {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
		}
}

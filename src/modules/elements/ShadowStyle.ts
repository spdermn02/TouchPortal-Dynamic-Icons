import { RenderContext2D, Vect2d } from '../';
import { assignExistingProperties } from '../../utils';

export default class ShadowStyle {
    blur: number = 0;
    offset: Vect2d = new Vect2d();
    color: string = "#0000";

    savedContext:any = {
        blur: 0,
        offsetX: 0,
        offsetY: 0
    }

    constructor(init?: Partial<ShadowStyle> | any) {
        if (typeof init?.offset == 'number' || typeof init?.offset == 'object')
            this.offset.set(init.offset);
        assignExistingProperties(this, init, 0);
    }

    // IRenderable
    readonly type: string = "ShadowStyle";
    // returns true if blur and offset are are <= 0 or if color is transparent/invalid.
    get isEmpty(): boolean { return (this.blur <= 0 && this.offset.isNull); }

    /** Resets shadow coordinates to zero. Does not affect color. */
    clear() {
        this.blur = 0;
        this.offset.set(0, 0);
    }

    render(ctx: RenderContext2D): void {
        if (this.isEmpty)
            return;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.blur;
        ctx.shadowOffsetX = this.offset.x;
        ctx.shadowOffsetY = this.offset.y;
    }

    /** Saves the given context's shadow coordinate properties to `ShadowStyle.savedContext` member.
     * See also `restoreContext()`;
     */
    saveContext(ctx: RenderContext2D): void {
        this.savedContext.blur = ctx.shadowBlur;
        this.savedContext.offsetX = ctx.shadowOffsetX;
        this.savedContext.offsetY = ctx.shadowOffsetY;
    }

    /** Resets all shadow attributes on given context to the values saved in `savedContext`.
     * See also `saveContext()`.
      */
    restoreContext(ctx: RenderContext2D): void {
        ctx.shadowBlur = this.savedContext.blur;
        ctx.shadowOffsetX = this.savedContext.offsetX;
        ctx.shadowOffsetY = this.savedContext.offsetY;
    }
}

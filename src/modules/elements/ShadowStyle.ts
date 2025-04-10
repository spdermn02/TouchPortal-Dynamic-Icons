import { RenderContext2D, Vect2d } from '../';
import { assignExistingProperties } from '../../utils';

/** Stores properties for applying a shadow to a canvas context.
Can also be used to save & restore context shadow properties. */
export default class ShadowStyle {
    /** Shadow color. */
    color: string = "#0000";
    /** Shadow blur radius. */
    blur: number = 0;
    /** Shadow offset coordinates. */
    readonly offset: Vect2d = new Vect2d();

    private savedContext:any = {
        color: "black",
        blur: 0,
        offsetX: 0,
        offsetY: 0
    }

    constructor(init?: Partial<ShadowStyle>) {
        assignExistingProperties(this, init, 1);
    }

    /** Returns `true` if blur and offset are are <= 0. */
    get isEmpty(): boolean { return (this.blur <= 0 && this.offset.isNull); }

    /** Resets shadow coordinates to zero. Does not affect color. */
    resetCoordinates() {
        this.blur = 0;
        this.offset.set(0, 0);
    }

    /** Applies current shadow styling properties to the given canvas `ctx`. */
    render(ctx: RenderContext2D): void {
        if (this.isEmpty)
            return;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.blur;
        ctx.shadowOffsetX = this.offset.x;
        ctx.shadowOffsetY = this.offset.y;
    }

    /** Saves the given context's shadow properties. See also `restoreContext()`. */
    saveContext(ctx: RenderContext2D): void {
        this.savedContext.color = ctx.shadowColor;
        this.savedContext.blur = ctx.shadowBlur;
        this.savedContext.offsetX = ctx.shadowOffsetX;
        this.savedContext.offsetY = ctx.shadowOffsetY;
    }

    /** Resets all shadow attributes on given context to the values saved with `saveContext()`. */
    restoreContext(ctx: RenderContext2D): void {
        ctx.shadowColor = this.savedContext.color;
        ctx.shadowBlur = this.savedContext.blur;
        ctx.shadowOffsetX = this.savedContext.offsetX;
        ctx.shadowOffsetY = this.savedContext.offsetY;
    }
}

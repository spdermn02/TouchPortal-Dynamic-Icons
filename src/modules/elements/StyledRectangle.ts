
import { ILayerElement, IRenderable } from '../interfaces';
import { LayerRole, ParseState, Rectangle, RenderContext2D } from '../';
import { DrawingStyle } from './';
import { arraysMatchExactly, round3p } from '../../utils';
import { Act, Str } from '../../utils/consts';
import RectanglePath from './RectanglePath';  // must be direct import for subclass

// Draws a rectangle shape on a canvas context with optional radii applied to any/all of the 4 corners (like CSS). The shape can be fully styled with the embedded DrawingStyle property.
export default class StyledRectangle extends RectanglePath implements ILayerElement, IRenderable
{
    style: DrawingStyle = new DrawingStyle();
    /** Whether to adjust (reduce) the overall drawing area size to account for shadow offset/blur. */
    adjustSizeForShadow: boolean = true;

    // constructor(init?: Partial<StyledRectangle> | any) { assignExistingProperties(this, init, 0); }

    // ILayerElement
    readonly type: string = "StyledRectangle";
    readonly layerRole: LayerRole = LayerRole.Drawable;

    /** Returns true if there is nothing to draw: there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return this.style.fill.isEmpty && this.style.line.isEmpty;
    }

    loadFromActionData(state: ParseState): StyledRectangle {
        super.loadFromActionData(state, Act.IconRect);
        const stylePos = state.data.findIndex(v => v.id.includes(Act.IconStyle + Str.IdSep, (Str.IdPrefix + Act.IconRect).length));
        if (stylePos < 0)
            return this;  // ulikely
        // Check for shadow and line style changes which may affect cached path.
        const sarry = this.adjustSizeForShadow ? [this.style.shadow.blur, this.style.shadow.offset.x, this.style.shadow.offset.y] : null;
        const lw = this.style.line.width;
        this.style.loadFromActionData(state.setPos(stylePos));
        if (lw.value != this.style.line.width.value ||
                lw.isRelative != this.style.line.width.isRelative ||
                (sarry && !arraysMatchExactly(sarry, [this.style.shadow.blur, this.style.shadow.offset.x, this.style.shadow.offset.y])))
            this.cache.clear();
        // console.dir(this, {depth: 5});
        return this;
    }

    // ILayerElement
    render(ctx: RenderContext2D, rect: Rectangle): void { this.renderImpl(ctx, rect); }

    /** The actual drawing implementation. May be used by subclasses.
        Returns the area left over "inside" the rectangle after adjusting for stroke and/or shadow. */
    protected renderImpl(ctx: RenderContext2D, rect: Rectangle): Rectangle
    {
        let window: Rectangle = rect.clone();  // the area to draw into, may need to be adjusted
        if (this.isEmpty)
            return window;

        // set stroke scaling and adjust drawing size if needed
        let penW = 0, penW2 = 0;
        if (!this.style.line.isEmpty) {
            // relative stroke width is percentage of half the overall size where 100% would be half the smaller of width/height (and strokes would overlay the whole shape)
            if (this.style.line.width.isRelative)
                this.style.line.widthScale = Math.min(window.width, window.height) * .005;
            // adjust size to prevent clipping of stroke which is drawn middle-aligned on the shape border
            penW = this.style.line.scaledWidth;
            penW2 = round3p(penW * .5);
            window.adjust(penW2, -penW);
        }

        if (this.adjustSizeForShadow && !this.style.shadow.isEmpty) {
            // adjust for shadow
            const s = this.style.shadow,
                penSz = this.style.strokeOver && !this.style.fill.isEmpty ? penW2 : 0,
                xOffs = Math.max(s.blur - s.offset.x - penSz, 0),
                yOffs = Math.max(s.blur - s.offset.y - penSz, 0);
            window.adjust(xOffs, yOffs, -Math.max(xOffs + s.blur + s.offset.x - penSz, xOffs), -Math.max(yOffs + s.blur + s.offset.y - penSz, yOffs));
        }

        const path = super.getPath(window);
        // draw the rectangle using our style
        this.style.renderPath(ctx, path);

        return Rectangle.fromBounds(path.bounds).adjust(penW2, -penW);
    }
}

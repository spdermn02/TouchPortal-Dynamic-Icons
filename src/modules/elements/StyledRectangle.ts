
import { IColorElement, ILayerElement, IRenderable } from '../interfaces';
import { ColorUpdateType, LayerRole, ParseState, Rectangle, RenderContext2D } from '../';
import { DrawingStyle } from './';
import { assignExistingProperties, round3p } from '../../utils';
import { Act, Str } from '../../utils/consts';
import RectanglePath from './RectanglePath';  // must be direct import for subclass

/** Draws a rectangle shape on a canvas context with optional radii applied to any/all of the 4 corners (like CSS). The shape can be fully styled with the embedded `DrawingStyle` property. */
export default class StyledRectangle extends RectanglePath implements ILayerElement, IRenderable, IColorElement
{
    /** Fill and stroke style to apply when drawing this element. */
    style: DrawingStyle;
    /** Whether to adjust (reduce) the overall drawing area size to account for shadow offset/blur. */
    adjustSizeForShadow: boolean = true;

    constructor(init?: PartialDeep<StyledRectangle>) {
        super();
        this.style = new DrawingStyle(init?.style);
        assignExistingProperties(this, init, 1);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    /** Returns true if there is nothing to draw: there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return this.style.fill.isEmpty && this.style.stroke.isEmpty;
    }

    // IColorElement
    /** @internal */
    setColor(value: string, type: ColorUpdateType): void { this.style.setColor(value, type); }

    /** @internal */
    loadFromActionData(state: ParseState): StyledRectangle {
        // const dr = state.dr;
        super.loadFromDataRecord(state.asRecord(state.pos, Act.IconRect + Str.IdSep));
        // Check for shadow and line style changes which may affect cached path.
        if (this.style.loadFromDataRecord(state.asRecord(state.pos, Act.IconRect + Str.IdSep + Act.IconStyle + Str.IdSep)))
            this.clearCache();
        // console.dir(this, {depth: 5});
        return this;
    }

    // IRenderable
    /** Draws the rectangle with all styling and positioning options applied onto `ctx` using `rect` dimensions for scaling and alignment. */
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
        if (!this.style.stroke.isEmpty) {
            // relative stroke width is percentage of half the overall size where 100% would be half the smaller of width/height (and strokes would overlay the whole shape)
            if (this.style.stroke.width.isRelative)
                this.style.stroke.widthScale = Math.min(window.width, window.height) * .005;
            // adjust size to prevent clipping of stroke which is drawn middle-aligned on the shape border
            penW = this.style.stroke.scaledWidth;
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

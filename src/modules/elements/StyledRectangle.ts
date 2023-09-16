
import { ILayerElement, RenderContext2D } from '../interfaces';
import { Alignment } from '../enums';
import { ParseState } from '../';
import { Rectangle, UnitValue } from '../geometry';
import DrawingStyle from './DrawingStyle';
import { evaluateValue, parseNumericArrayString } from '../../utils/helpers';
import { Path2D } from 'skia-canvas'

// Draws a rectangle shape on a canvas context with optional radii applied to any/all of the 4 corners (like CSS). The shape can be fully styled with the embedded DrawingStyle property.
export default class StyledRectangle implements ILayerElement
{
    /** A zero width/height (default) indicates to draw into the full available image area (eg. passed to `render()` in `rect` argument). */
    width: UnitValue = new UnitValue(0, "%");
    height: UnitValue = new UnitValue(0, "%");
    style: DrawingStyle = new DrawingStyle();
    /** `radii` value is like css border-radius, 1-4 numbers starting at top left corner, etc; empty array for no radius;
        individual values can be in either percent of overall size (like CSS border-radius %) or in absolute pixels.
        See `radii` param at https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect#syntax  */
    radii: number[] = [];
    radiusIsRelative: boolean = true;
    /** How to align within drawing area if/when `width`/`height` doesn't fill it completely */
    alignment: Alignment = Alignment.CENTER;
    /** Whether to adjust (reduce) the overall drawing area size to account for shadow offset/blur. */
    adjustSizeForShadow: boolean = true;

    protected haveRadius: boolean = false;

    constructor(init?: Partial<StyledRectangle>) { Object.assign(this, init); }
    // ILayerElement
    get type() { return "StyledRectangle"; }

    /** Returns true if there is nothing to draw: there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return this.style.fill.isEmpty && this.style.line.isEmpty;
    }

    protected parseRadius(value: string) {
        this.haveRadius = parseNumericArrayString(value, this.radii = [], 4, 0);
    }

    loadFromActionData(state: ParseState): StyledRectangle {
        let styleParsed = false,
            atEnd = false;
        for (const e = state.data.length; state.pos < e && !atEnd; ) {
            const data = state.data[state.pos];
            const dataType = data.id.split('rect_').at(-1);  // last part of the data ID determines its meaning
            if (!dataType)
                break;
            switch (dataType) {
                case 'size_w': {
                    const sz = evaluateValue(data.value);
                    if (sz > 0)
                        this.width.value = sz;
                    break;
                }
                case 'size_w_unit':
                    this.width.setUnit(data.value);
                    break;

                case 'size_h': {
                    const sz = evaluateValue(data.value);
                    if (sz > 0)
                        this.height.value = sz;
                    break;
                }
                case 'size_h_unit':
                    this.height.setUnit(data.value);
                    break;

                case 'radius':
                    this.parseRadius(data.value);
                    break;
                case 'radius_unit':
                    this.radiusIsRelative = UnitValue.isRelativeUnit(data.value);
                    break;

                default: {
                    // any other fields should be styling data
                    if (!styleParsed && dataType.startsWith('style_')) {
                        this.style.loadFromActionData(state);
                        styleParsed = true;
                    }
                    else {
                        atEnd = true;
                    }
                    continue;
                }
            }
            ++state.pos;
        }
        // console.dir(this);
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

        // If this instance specifies a size in either dimension, these override the drawing area size.
        // We can also adjust the alignment within the drawing area if one of the final dimensions is smaller.
        if (this.width.value && !(this.width.isRelative && this.width.value == 100)) {
            window.width = this.width.isRelative ? this.width.value * .01 * rect.size.width : this.width.value;
            if (window.width < rect.width) {
                switch (this.alignment & Alignment.H_MASK) {
                    case Alignment.HCENTER:
                        window.x += (rect.width - window.width) * .5;
                        break;
                    case Alignment.RIGHT:
                        window.x += rect.width - window.width;
                        break;
                }
            }
        }
        if (this.height.value && !(this.height.isRelative && this.height.value == 100)) {
            window.height = this.height.isRelative ? this.height.value * .01 * rect.size.height : this.height.value;
            if (window.height < rect.height) {
                switch (this.alignment & Alignment.V_MASK) {
                    case Alignment.VCENTER:
                        window.y += (rect.height - window.height) * .5;
                        break;
                    case Alignment.BOTTOM:
                        window.y += rect.height - window.height;
                        break;
                }
            }
        }

        // set stroke scaling and adjust drawing size if needed
        let penW = 0;
        if (!this.style.line.isEmpty) {
            // relative stroke width is percentage of half the overall size where 100% would be half the smaller of width/height (and strokes would overlay the whole shape)
            if (this.style.line.width.isRelative)
                this.style.line.widthScale = Math.min(window.width, window.height) * .005;
            // adjust size to prevent clipping of stroke which is drawn middle-aligned on the shape border
            penW = this.style.line.scaledWidth;
            window.adjust(penW * .5, -penW);
        }
        //console.debug("Size", this.size.toString(), "Rect", rect.toString(), "Window", window.toString(), "Pen", penW);

        if (this.adjustSizeForShadow && !this.style.shadow.isEmpty) {
            // adjust for shadow
            const s = this.style.shadow,
                penSz = this.style.strokeOver && !this.style.fill.isEmpty ? penW * .5: 0,
                xOffs = Math.max(s.blur - s.offset.x - penSz, 0),
                yOffs = Math.max(s.blur - s.offset.y - penSz, 0);
                //adj = new Rectangle(xOffs, yOffs, -Math.max(xOffs + s.blur + s.offset.x - penSz, xOffs), -Math.max(yOffs + s.blur + s.offset.y - penSz, yOffs));
            //console.debug("Shadow adjust", adj.toString(), "Window", window.toString());
            //window.adjust(adj.origin, adj.size);
            window.adjust(xOffs, yOffs, -Math.max(xOffs + s.blur + s.offset.x - penSz, xOffs), -Math.max(yOffs + s.blur + s.offset.y - penSz, yOffs));
        }

        // Note that for some reasons transforms only work when using a Path2D object, vs. adding rect/roundRect shapes to the context directly and using fill()/stroke().
        // And, specifically need the skia-canvas version since the built-in one doesn't have rect()/roundRect() (at least in the current ES version as of this writing).
        const path = new Path2D();
        if (this.haveRadius) {
            if (this.radiusIsRelative) {
                const ratio = Math.max((window.width + window.height) * .005, 0);  // this is a bit simplistic really
                const radii = this.radii.map(r => r * ratio);
                path.roundRect(window.x, window.y, window.width, window.height, radii);
            }
            else {
                path.roundRect(window.x, window.y, window.width, window.height, this.radii);
            }
        }
        else {
            path.rect(window.x, window.y, window.width, window.height);
        }

        // draw the rectangle using our style
        this.style.renderPath(ctx, path);

        if (penW)
            window.adjust(penW * .5, -penW);

        return window;
    }
}

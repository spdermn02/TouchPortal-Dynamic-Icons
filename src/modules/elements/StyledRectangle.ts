
import { ILayerElement, RenderContext2D } from "../interfaces";
import { ParseState, Rectangle, SizeType, Vect2d } from "../types";
import DrawingStyle from "./DrawingStyle";
import { Path2D } from 'skia-canvas'

// Draws a rectangle shape on a canvas context with optional radii applied to any/all of the 4 corners (like CSS). The shape can be fully styled with the embedded DrawingStyle property.
export default class StyledRectangle implements ILayerElement
{
    size: SizeType = { width: 0, height: 0 };
    style: DrawingStyle = new DrawingStyle();
     // `radii` value is like css border-radius, 1-4 numbers starting at top left corner, etc; empty array for no radius;
    // individual values are in percent of overall size, like the CSS <percentage> style border-radius value;
    // see `radii` param at https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect#syntax
    radii: number[] = [];

    constructor(init?: Partial<StyledRectangle>) { Object.assign(this, init); }
    // ILayerElement
    get type() { return "StyledRectangle"; }

    /** Returns true if there is nothing to draw: size is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return this.style.fill.isEmpty && this.style.line.isEmpty;
    }

    loadFromActionData(state: ParseState): StyledRectangle {
        let styleParsed = false;
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const dataType = state.data[i].id.split('rect_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'radius': {
                    const value = state.data[i].value.trim();
                    if (value)
                        this.radii = value.split(/\s*(?:,|\s)\s*/).map((r:string) => parseFloat(r.trim()) || 0);
                    break;
                }
                default: {
                    if (styleParsed || !dataType || !dataType.startsWith('style_')) {
                        i = e;  // end loop
                        continue;
                    }
                    // any other fields should be styling data
                    this.style.loadFromActionData(state);
                    styleParsed = true;
                    i = state.pos;
                    continue;
                }
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // ILayerElement
    render(ctx: RenderContext2D, rect: Rectangle): void {
        // console.dir(this);
        if (!ctx || this.isEmpty)
            return;
        let size = this.size.width ? this.size : rect.size;
        let offset = new Vect2d(rect.x, rect.y);  // drawing position, may need to be adjusted to allow for stroke width
        ctx.save();

        // set stroke scaling if needed
        const havePen = !this.style.line.isEmpty;
        if (havePen) {
            // stroke line width is percentage of half the overall size where 100% would be half the smaller of width/height (and strokes would overlay the whole shape)
            this.style.line.widthScale = Math.min(size.width, size.height) * .005;
            // adjust size to prevent clipping of stroke which is drawn middle-aligned on the shape border
            const penW = this.style.line.scaledWidth;
            size = {width: size.width - penW, height: size.height - penW};
            // also need to offset the draw origin by half of the size delta
            offset.add(penW * .5);
        }

        // Note that for some reasons transforms only work when using a Path2D object, vs. adding rect/roundRect shapes to the context directly and using fill()/stroke().
        // And, specifically need the skia-canvas version since the built-in one doesn't have rect()/roundRect() (at least in the current ES version as of this writing).
        const path = new Path2D();
        if (this.radii.length) {
            const ratio = (size.width + size.height) * .5;  // this is a bit simplistic really
            const radii = this.radii.map(r => r * .01 * ratio);
            path.roundRect(offset.x, offset.y, size.width, size.height, radii);
        }
        else {
            path.rect(offset.x, offset.y, size.width, size.height);
        }

        // set canvas drawing style properties
        this.style.render(ctx);

        if (!this.style.fill.isEmpty)
            ctx.fill(path);
        if (havePen)
            ctx.stroke(path);

        ctx.restore();
    }
}

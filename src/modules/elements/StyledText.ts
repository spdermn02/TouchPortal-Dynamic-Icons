
import { ILayerElement, IValuedElement, RenderContext2D } from "../interfaces";
import { ParseState, Rectangle, Vect2d } from "../types";
import { evaluateValue, evaluateStringValue } from "../../utils/helpers"
import DrawingStyle from "./DrawingStyle";
import { TextMetrics as SkiaTextMetrics } from 'skia-canvas';
type SkiaTextMetrics = typeof SkiaTextMetrics;

// Draws text on a canvas context with various options. The text can be fully styled with the embedded DrawingStyle property.
export default class StyledText implements ILayerElement, IValuedElement
{
    text: string = "";
    font: string = "";
    fontVariant: string = 'common-ligatures discretionary-ligatures contextual';  // ensure ligature support for named symbol fonts
    alignH: 'left' | 'center' | 'right' = 'center';
    alignV: 'top' | 'middle' | 'bottom'  = 'middle';
    direction: 'ltr' | 'rtl' | 'inherit' = 'inherit';
    tracking: number = 0;
    wrap: boolean = true;
    offset: Vect2d = new Vect2d();
    style: DrawingStyle = new DrawingStyle();

    constructor(init?: Partial<StyledText>) { Object.assign(this, init); }
    // ILayerElement
    get type() { return "StyledText"; }

    /** Returns true if there is nothing to draw: size is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return !this.text || (this.style.fill.isEmpty && this.style.line.isEmpty);
    }

    // IValuedElement
    setValue(text: string): void {
        this.text = evaluateStringValue(text);
    }

    loadFromActionData(state: ParseState): StyledText {
        let styleParsed = false;
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const data = state.data[i];
            const dataType = data.id.split('text_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'str':
                    this.setValue(data.value);
                    break;
                case 'font':
                    this.font = data.value.trim();
                    break;
                case 'alignH':
                    this.alignH = (data.value as typeof this.alignH);
                    break;
                case 'alignV':
                    this.alignV = (data.value as typeof this.alignV);
                    break;
                case 'ofsH':
                    this.offset.x = evaluateValue(data.value);
                    break;
                case 'ofsY':
                case 'ofsV':
                    this.offset.y = evaluateValue(data.value);
                    break;
                case 'tracking':
                    this.tracking = parseFloat(data.value) || 0;
                    break;
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
    async render(ctx: RenderContext2D, rect: Rectangle): Promise<void> {
        // console.dir(this);
        if (!ctx || this.isEmpty)
            return;

        ctx.save();

        ctx.font = this.font;
        ctx.fontVariant = this.fontVariant;
        ctx.textAlign = this.alignH;
        ctx.direction = this.direction;
        ctx.textTracking = this.tracking;
        ctx.textWrap = this.wrap;
        ctx.textRendering = 'optimizeLegibility';

        // Calculate the stroke width first, if any.
        let penAdjust = 0;
        if (!this.style.line.isEmpty) {
            if (this.style.line.widthScale == 1) {
                // stroke line width is percentage of half the font size; only calculate if we haven't already.
                const charMetric:any = ctx.measureText("W");
                this.style.line.widthScale = Math.max(charMetric.width, charMetric.fontBoundingBoxAscent + charMetric.fontBoundingBoxDescent) * .005;
            }
            // need to offset the draw origin by half of the line width, otherwise it may clip off an edge
            penAdjust = this.style.line.scaledWidth * .5;
        }

        // Use 'middle' baseline to get metrics and as default (may change after metrics are calculated).
        // This is important for vertical alignment code below to work.
        ctx.textBaseline = 'middle';
        const metrics:SkiaTextMetrics = ctx.measureText(this.text);  // skia-canvas extended TextMetrics type
        const multiline = metrics.lines.length > 1;
        // console.dir(metrics);
        // console.dir(this);

        // Calculate the draw offset based on alignment settings.
        let offset = new Vect2d();
        // horizontal
        switch (this.alignH) {
            case 'center':
                offset.x = (rect.width * 0.5 + metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight);  break;
            case 'left':
                offset.x = rect.width * .025 + penAdjust;  break;  // add some left padding
            case 'right':
                offset.x = rect.width - rect.width * .025 - penAdjust;  break; // add some right padding
        }
        // vertical alignment is tricksier!  this may not work perfectly for all fonts since it relies heavily on their declared metrics, and those are not always as expected.
        switch (this.alignV) {
            case 'middle':
                offset.y = (rect.height - metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) * 0.5 +
                           (multiline ? metrics.actualBoundingBoxAscent : metrics.fontBoundingBoxAscent);
                break;
            case 'top':
                if (multiline) {
                    ctx.textBaseline = 'top';
                    offset.y = metrics.actualBoundingBoxAscent + penAdjust;
                    break;
                }
                offset.y = metrics.fontBoundingBoxAscent + penAdjust;
                break;
            case 'bottom':
                ctx.textBaseline = 'top';
                offset.y = rect.height - metrics.actualBoundingBoxDescent - metrics.fontBoundingBoxAscent - penAdjust;
                break;
        }
        // console.log(rect.size, offset, penAdjust, getTextHeight());

        // add any user-specified offset as percent of canvas size
        if (!this.offset.isEmpty)
            offset.add(Vect2d.mult(this.offset, rect.width * .01, rect.height * .01));
        // move to position before drawing
        ctx.translate(offset.x, offset.y);

        // set canvas drawing style properties
        this.style.render(ctx);

        if (!this.style.fill.isEmpty)
            ctx.fillText(this.text, rect.x, rect.y);
        if (penAdjust) // will be non-zero if we have a stroke to draw
            ctx.strokeText(this.text, rect.x, rect.y);

        ctx.restore();
    }
}


import { ILayerElement, IValuedElement, RenderContext2D } from '../interfaces';
import { Alignment } from '../enums';
import { ParseState } from '../types'
import { Point, PointType, Rectangle } from '../geometry';
import { evaluateValue, evaluateStringValue, parseAlignmentFromValue } from '../../utils/helpers'
import { DrawingStyle } from './';

// Draws text on a canvas context with various options. The text can be fully styled with the embedded DrawingStyle property.
export default class StyledText implements ILayerElement, IValuedElement
{
    // These are all private because changing them will affect the cached text metrics.
    // Value string can be accessed with value/setValue(). Other accessors can be added as needed.
    private text: string = "";
    private font: string = "";
    private fontVariant: string = 'common-ligatures discretionary-ligatures contextual';  // ensure ligature support for named symbol fonts
    private alignment: Alignment = Alignment.CENTER;
    private direction: 'ltr' | 'rtl' | 'inherit' = 'inherit';
    private tracking: number = 0;
    private wrap: boolean = true;
    private offset: PointType = Point.new();
    private style: DrawingStyle = new DrawingStyle();

    private metrics: {
        textMetrics: TextMetrics | any | null,  // skia-canvas extended TextMetrics type
        multiline: boolean
    } = { textMetrics: null, multiline: false };

    // constructor(init?: Partial<StyledText>) { Object.assign(this, init); }
    // ILayerElement
    get type() { return "StyledText"; }

    /** Returns true if there is nothing to draw: text is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return !this.text || (this.style.fill.isEmpty && this.style.line.isEmpty);
    }

    get value(): string { return this.text; }
    // IValuedElement
    setValue(text: string): void {
        this.text = evaluateStringValue(text);
        this.metrics.textMetrics = null;  // reset
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
                    this.style.line.widthScale = 1;  // depends on font, reset it
                    break;
                case 'alignH':
                    this.alignment &= ~Alignment.H_MASK;
                    this.alignment |= parseAlignmentFromValue(data.value, Alignment.H_MASK);
                    break;
                case 'alignV':
                    this.alignment &= ~Alignment.V_MASK;
                    this.alignment |= parseAlignmentFromValue(data.value, Alignment.V_MASK);
                    break;
                case 'ofsH':
                    this.offset.x = evaluateValue(data.value);
                    break;
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
        ctx.direction = this.direction;
        ctx.textTracking = this.tracking;
        ctx.textWrap = this.wrap;
        ctx.textRendering = 'optimizeLegibility';

        // Calculate the stroke width first, if any.
        let penAdjust = 0;
        if (!this.style.line.isEmpty) {
            if (this.style.line.width.isRelative && this.style.line.widthScale == 1) {
                // stroke line width is percentage of half the font size; only calculate if we haven't already.
                const charMetric:any = ctx.measureText("W");
                this.style.line.widthScale = Math.max(charMetric.width, charMetric.fontBoundingBoxAscent + charMetric.fontBoundingBoxDescent) * .005;
            }
            // need to offset the draw origin by half of the line width, otherwise it may clip off an edge
            penAdjust = this.style.line.scaledWidth * .5;
            // save the current context shadow settings -- we may need to restore these before drawing the stroke (if we also have a fill).
            this.style.shadow.saveContext(ctx);
        }

        // Use 'center' alignment and 'middle' baseline to get metrics and as default (may change after metrics are calculated).
        // This is important for the offset calculation code below to work.
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (!this.metrics.textMetrics) {
            this.metrics.textMetrics = ctx.measureText(this.text);
            this.metrics.multiline = this.metrics.textMetrics.lines.length > 1;
            // console.dir(this, {depth: 8});
        }
        const tm = this.metrics.textMetrics;

        // Calculate the draw offset based on alignment settings.
        let offset = Point.new();
        // horizontal
        switch (this.alignment & Alignment.H_MASK) {
            case Alignment.HCENTER:
            case Alignment.JUSTIFY:
                offset.x = (rect.width * 0.5 + tm.actualBoundingBoxLeft + tm.actualBoundingBoxRight);
                break;
            case Alignment.LEFT:
                ctx.textAlign = 'left';
                offset.x = rect.width * .025 + penAdjust;
                break;  // add some left padding
            case Alignment.RIGHT:
                ctx.textAlign = 'right';
                offset.x = rect.width - rect.width * .025 - penAdjust;
                break; // add some right padding
        }
        // vertical alignment is tricksier!  this may not work perfectly for all fonts since it relies heavily on their declared metrics, and those are not always as expected.
        switch (this.alignment & Alignment.V_MASK) {
            case Alignment.VCENTER:
                offset.y = (rect.height - tm.actualBoundingBoxAscent - tm.actualBoundingBoxDescent) * 0.5 +
                           (this.metrics.multiline ? tm.actualBoundingBoxAscent : tm.fontBoundingBoxAscent);
                break;
            case Alignment.TOP:
                if (this.metrics.multiline) {
                    ctx.textBaseline = 'top';
                    offset.y = tm.actualBoundingBoxAscent + penAdjust;
                    break;
                }
                offset.y = tm.fontBoundingBoxAscent + penAdjust;
                break;
            case Alignment.BOTTOM:
                ctx.textBaseline = 'top';
                offset.y = rect.height - tm.actualBoundingBoxDescent - tm.fontBoundingBoxAscent - penAdjust;
                break;
        }
        // console.log(rect.size, offset, penAdjust, tm);

        // add any user-specified offset as percent of canvas size
        if (!Point.isNull(this.offset))
            Point.plus_eq(offset, Point.times(this.offset, rect.width * .01, rect.height * .01));
        // move to position before drawing
        ctx.translate(offset.x, offset.y);

        // set canvas drawing style properties
        this.style.render(ctx);

        if (!this.style.fill.isEmpty) {
            ctx.fillText(this.text, rect.x, rect.y);
            // prevent shadow from being drawn on the stroke as well
            if (penAdjust)
                this.style.shadow.restoreContext(ctx);
        }
        if (penAdjust) // will be non-zero if we have a stroke to draw
            ctx.strokeText(this.text, rect.x, rect.y);

        ctx.restore();
    }
}

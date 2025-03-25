
import { Alignment, Point, UnitValue } from '../';
import { evaluateValue, evaluateStringValue, parseAlignmentFromValue } from '../../utils'
import { DrawingStyle } from './';

import type { IColorElement, ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type { ColorUpdateType, ParseState, PointType, Rectangle, RenderContext2D, TextMetrics, } from '../';

// Draws text on a canvas context with various options. The text can be fully styled with the embedded DrawingStyle property.
export default class StyledText implements ILayerElement, IRenderable, IValuedElement, IColorElement
{
    // These are all private because changing them will affect the cached text metrics.
    // Value string can be accessed with value/setValue(). Other accessors can be added as needed.
    private text: string = "";
    private font: string = "";
    private fontVariant: string = 'common-ligatures discretionary-ligatures contextual';  // ensure ligature support for named symbol fonts
    private alignment: Alignment = Alignment.CENTER;
    private direction: 'ltr' | 'rtl' | 'inherit' = 'inherit';
    private letterSpacing: UnitValue = new UnitValue(0, "em");
    private wrap: boolean = true;
    private offset: PointType = Point.new();
    private style: DrawingStyle = new DrawingStyle();
    private tm: TextMetrics | null = null;

    // constructor(init?: Partial<StyledText>) { Object.assign(this, init); }
    // ILayerElement
    readonly type: string = "StyledText";

    /** Returns true if there is nothing to draw: text is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return !this.text || (this.style.fill.isEmpty && this.style.line.isEmpty);
    }

    get value(): string { return this.text; }
    // IValuedElement
    setValue(text: string): void {
        this.text = evaluateStringValue(text);
        this.tm = null;  // reset
    }

    // IColorElement
    setColor(value: string, type: ColorUpdateType): void { this.style.setColor(value, type); }

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
                    this.tm = null;  // reset
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
                    // the deprecated skia-canvas textTracking value was a signed int representing 1/1000 of an 'em'
                    this.letterSpacing.value = (parseFloat(data.value) || 0) / 1000;
                    this.tm = null;  // reset
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
    render(ctx: RenderContext2D, rect: Rectangle): void {
        // console.dir(this);
        if (!ctx || this.isEmpty)
            return;

        ctx.save();

        ctx.font = this.font;
        ctx.fontVariant = this.fontVariant as any;  // FontVariantSetting
        ctx.direction = this.direction;
        ctx.textWrap = this.wrap;
        ctx.fontHinting = true;  // looks & aligns better with most fonts
        if (this.letterSpacing.value)
            ctx.letterSpacing = this.letterSpacing.toString();

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

        // Set vertical default text alignment before getting text metrics (below, if we need them). "middle" gets the right metrics for all our cases.
        ctx.textBaseline = 'middle';

        // Calculate the draw offset based on alignment settings.
        const offset = Point.new();
        // horizontal
        switch (this.alignment & Alignment.H_MASK) {
            case Alignment.HCENTER:
            case Alignment.JUSTIFY:
                ctx.textAlign = 'center';
                if (!this.tm)
                    this.tm = ctx.measureText(this.text);
                offset.x = (rect.width * 0.5 - this.tm.actualBoundingBoxLeft + this.tm.actualBoundingBoxRight);
                break;
            case Alignment.LEFT:
                ctx.textAlign = 'left';
                // add some left padding
                offset.x = rect.width * .015 + penAdjust;
                break;
            case Alignment.RIGHT:
                ctx.textAlign = 'right';
                // add some right padding
                offset.x = rect.width - rect.width * .015 - penAdjust;
                break;
        }
        // vertical
        switch (this.alignment & Alignment.V_MASK) {
            case Alignment.VCENTER:
                if (!this.tm)
                    this.tm = ctx.measureText(this.text);
                offset.y = (rect.height - this.tm.actualBoundingBoxAscent - this.tm.actualBoundingBoxDescent) * 0.5 + this.tm.actualBoundingBoxAscent;
                break;
            case Alignment.TOP:
                // no extra padding needed here since using "top" as baseline adds some already
                ctx.textBaseline = 'top';
                offset.y = penAdjust;
                break;
            case Alignment.BOTTOM:
                if (!this.tm)
                    this.tm = ctx.measureText(this.text);
                // needs a little bottom padding to match spacing of top aligned text
                offset.y = rect.height - this.tm.actualBoundingBoxDescent - penAdjust - rect.height * .015;
                break;
        }
        // console.log(this.text, this.font, rect.size, offset, penAdjust, this.tm);

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

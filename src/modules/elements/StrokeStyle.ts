
import { ParseState, Rectangle, RenderContext2D, UnitValue } from '..';
import { BrushStyle } from '.';
import { assignExistingProperties, evaluateValue, parseNumericArrayString, round4p } from '../../utils';

// Applies a stroke (line) style to a canvas context, which includes stroke style, line width, pen, cap, join, miter, and dash array.
export default class StrokeStyle
{
    width: UnitValue = new UnitValue(0, "%");
    widthScale: number = 1;
    pen: BrushStyle;
    cap: CanvasLineCap = 'butt';
    join: CanvasLineJoin = 'miter';
    miterLimit: number = 10;
    lineDash: number[] = [];
    dashOffset: number = 0;

    // IRenderable
    readonly type: string = "StrokeStyle";

    // returns true if color is invalid or line width is zero
    get isEmpty(): boolean { return this.scaledWidth <= 0 || this.pen.isNull; }
    get scaledWidth(): number { return this.width.isRelative ? round4p(this.width.value * this.widthScale) : this.width.value; }
    get scaledLineDash(): number[] { return this.width.isRelative ? this.lineDash.map(v => round4p(v * this.widthScale)) : this.lineDash; }
    get scaledDashOffset(): number { return this.width.isRelative && this.dashOffset ? round4p(this.dashOffset * this.widthScale) : this.dashOffset; }

    constructor(init?: Partial<StrokeStyle> | any ) {
        if (init?.width != undefined)
            this.width.value = Math.abs(init.width);
        if (init?.widthUnit)
            this.setWidthUnit(init.widthUnit);
        this.pen = new BrushStyle(init?.color);
        assignExistingProperties(this, init, 0);
    }

    private setWidthUnit(unit: string) {
        this.width.setUnit(unit);
        if (!this.width.isRelative)
            this.widthScale = 1;
    }

    loadFromActionData(state: ParseState, dataIdPrefix:string = ""): StrokeStyle {
        let atEnd = false;
        // the incoming data IDs should be structured with a naming convention
        for (let e = state.data.length; state.pos < e && !atEnd; ) {
            const data = state.data[state.pos];
            const dataType = data?.id.split(dataIdPrefix + 'line_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'width':
                    this.width.value = Math.abs(evaluateValue(data.value));
                    break;
                case 'width_unit':
                    this.setWidthUnit(data.value);
                    break;
                case 'color':
                    this.pen.color = data.value;
                    break;
                case 'cap':
                    this.cap = data.value as CanvasLineCap;
                    break;
                case 'join':
                    this.join = data.value as CanvasLineJoin;
                    break;
                case 'miterLimit':
                    this.miterLimit = parseFloat(data.value) || this.miterLimit;
                    break;
                case 'dash':
                    parseNumericArrayString(data.value, this.lineDash = [], 0, 0);
                    break;
                case 'dashOffset':
                    this.dashOffset = evaluateValue(data.value);
                    break;
                default:
                    atEnd = true;  // end the loop on unknown data id
                    continue;      // do not increment position counter
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // IRenderable
    render(ctx: RenderContext2D, rect?: Rectangle): void {
        if (this.isEmpty)
            return;
        if (rect && this.width.isRelative && !rect.isEmpty)
            this.widthScale = Math.min(rect.width, rect.height) * .005
        ctx.lineWidth = this.scaledWidth;
        ctx.strokeStyle = this.pen.style;
        ctx.lineCap = this.cap;
        ctx.lineJoin = this.join;
        ctx.miterLimit = this.miterLimit;
        if (this.lineDash.length) {
            ctx.lineDashOffset = this.scaledDashOffset;
            ctx.setLineDash(this.scaledLineDash);
        }
    }
}

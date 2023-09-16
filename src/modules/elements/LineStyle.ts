import { IRenderable, RenderContext2D } from '../interfaces';
import { ParseState } from '../';
import { BrushStyle } from './';
import { UnitValue } from '../geometry';
import { evaluateValue } from '../../utils/helpers';

// Applies a stroke (line) style to a canvas context, which includes stroke style, line width, pen, cap, join, miter, and dash array.
export default class LineStyle implements IRenderable
{
    width: UnitValue = new UnitValue(0, "%");
    widthScale: number = 1;
    pen: BrushStyle = new BrushStyle();
    cap: CanvasLineCap = 'butt';
    join: CanvasLineJoin = 'miter';
    miterLimit: number = 10;
    lineDash: number[] = [];

    // IRenderable
    get type(): string { return "LineStyle"; }
    // returns true if color is invalid or line width is zero
    get isEmpty(): boolean { return this.scaledWidth <= 0 || this.pen.isNull; }
    get scaledWidth(): number { return this.width.isRelative ? this.width.value * this.widthScale : this.width.value; }

    loadFromActionData(state: ParseState, dataIdPrefix:string = ""): LineStyle {
        let atEnd = false;
        // the incoming data IDs should be structured with a naming convention
        for (let e = state.data.length; state.pos < e && !atEnd; ) {
            const data = state.data[state.pos];
            const dataType = data.id.split(dataIdPrefix + 'line_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'width':
                    const sz = evaluateValue(data.value);
                    if (sz > 0)
                        this.width.value = sz;
                    break;
                case 'width_unit':
                    this.width.setUnit(data.value);
                    if (!this.width.isRelative)
                        this.widthScale = 1;
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
                case 'lineDash':
                    this.lineDash = data.value.split(',').map((m:string) => parseFloat(m) || 0);
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
    render(ctx: RenderContext2D): void {
        if (!ctx || this.isEmpty)
            return;
        ctx.lineWidth = this.scaledWidth;
        ctx.strokeStyle = this.pen.style;
        ctx.lineCap = this.cap;
        ctx.lineJoin = this.join;
        ctx.miterLimit = this.miterLimit;
        if (this.lineDash.length)
            ctx.setLineDash(this.lineDash);
    }
}

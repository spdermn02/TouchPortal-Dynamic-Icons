import { IRenderable, RenderContext2D } from '../interfaces';
import { ParseState } from '../types';
import { BrushStyle } from './';

// Applies a stroke (line) style to a canvas context, which includes stroke style, line width, pen, cap, join, miter, and dash array.
export default class LineStyle implements IRenderable
{
    width: number = 0;
    widthScale: number = 1;
    pen: BrushStyle = new BrushStyle();
    cap: 'butt' | 'round' | 'square' = 'butt';
    join: 'round' | 'bevel' | 'miter' = 'miter';
    miterLimit: number = 10;
    lineDash: number[] = [];

    // IRenderable
    get type(): string { return "LineStyle"; }
    // returns true if color is empty or line width is zero
    get isEmpty(): boolean { return this.scaledWidth <= 0 || this.pen.isEmpty; }
    get scaledWidth(): number { return this.width * this.widthScale; }

    loadFromActionData(state: ParseState): LineStyle {
        // the incoming data IDs should be structured with a naming convention
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const data = state.data[i];
            const dataType = data.id.split('line_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'width':
                    this.width = parseFloat(data.value) || 1;
                    break;
                case 'color':
                    if (data.value.startsWith('#'))
                        this.pen = new BrushStyle(data.value);
                    break;
                case 'cap':
                    this.cap = data.value as typeof this.cap;
                    break;
                case 'join':
                    this.join = data.value as typeof this.join;
                    break;
                case 'miterLimit':
                    this.miterLimit = parseFloat(data.value) || this.miterLimit;
                    break;
                case 'lineDash':
                    this.lineDash = data.value.split(',').map((m:string) => parseFloat(m) || 0);
                    break;
                default:
                    i = e;  // end the loop on unknown data id
                    continue;
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
        ctx.strokeStyle = this.pen;
        ctx.lineCap = this.cap;
        ctx.lineJoin = this.join;
        ctx.miterLimit = this.miterLimit;
        if (this.lineDash.length)
            ctx.setLineDash(this.lineDash);
    }
}

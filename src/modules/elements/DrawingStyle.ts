import { IRenderable, RenderContext2D } from '../interfaces';
import { ParseState } from '../types';
import { BrushStyle, LineStyle, ShadowStyle } from './';

// Applies a drawing style to a canvas context, which includes all fill, stroke, and shadow attributes.
export default class DrawingStyle implements IRenderable
{
    fill: BrushStyle = new BrushStyle();
    line: LineStyle = new LineStyle();
    shadow: ShadowStyle = new ShadowStyle();

    // IRenderable
    get type(): string { return "DrawingStyle"; }

    loadFromActionData(state: ParseState): DrawingStyle {
        let lineParsed = false;
        // the incoming data IDs should be structured with a naming convention
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const data = state.data[i];
            const dataType = data.id.split('style_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'fillColor':
                    if (data.value.startsWith('#'))
                        this.fill = new BrushStyle(data.value);
                    break;
                case 'shadowColor':
                    if (data.value.startsWith('#'))
                        this.shadow.color = new BrushStyle(data.value);
                    break;
                case 'shadow': {
                    // shadow is specified as (blur [,offsetX[,offsetY]])
                    const s = data.value.split(',').map((m:string) => parseFloat(m) || 0);
                    const len = s.length;
                    if (len) {
                        this.shadow.blur = s[0];
                        if (len > 1) {
                            this.shadow.offset.x = s[1];
                            this.shadow.offset.y = len > 2 ? s[2] : s[1];
                        }
                    }
                    break;
                }
                default:
                    if (lineParsed || !dataType || !dataType.startsWith('line_')) {
                        i = e;  // end the loop on unknown data id
                        continue;
                    }
                    this.line.loadFromActionData(state);
                    lineParsed = true;
                    i = state.pos;
                    continue;
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // IRenderable
    render(ctx: RenderContext2D): void {
        if (!this.shadow.isEmpty) {
            ctx.shadowColor = this.shadow.color;
            ctx.shadowBlur = this.shadow.blur;
            ctx.shadowOffsetX = this.shadow.offset.x;
            ctx.shadowOffsetY = this.shadow.offset.y;
        }
        if (!this.fill.isEmpty)
            ctx.fillStyle = this.fill;
        this.line.render(ctx);
    }
}

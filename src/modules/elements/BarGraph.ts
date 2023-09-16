import { evaluateValue } from '../../utils/helpers';
import { ILayerElement, IValuedElement, RenderContext2D } from '../interfaces';
import { ParseState } from '../';
import { Rectangle } from '../geometry';
import { BrushStyle } from './';

// Draws a values series as a basic horizontal bar graph onto a canvas context.
export default class BarGraph implements ILayerElement, IValuedElement
{
    values: number[] = []
    barColor: BrushStyle = new BrushStyle("#FFA500FF")
    barWidth: number = 10
    backgroundColorOn: boolean = true
    backgroundColor: BrushStyle = new BrushStyle("#FFFFFFFF")
    maxExtent: number = 256   // maximum width into which the bars need to fit (or height if an orientation option is added)

    constructor(init?: Partial<BarGraph>) { Object.assign(this, init); }
    // ILayerElement
    get type() { return "BarGraph"; }

    // IValuedElement
    // Adds value to current array and shifts values if necessary based on available size and bar width.
    setValue(value: string) {
        this.values.push(evaluateValue(value))
        if (this.values.length > ( this.maxExtent / this.barWidth ) + 1)
            this.values.shift()
    }

    loadFromActionData(state: ParseState): BarGraph {
        // the incoming data IDs should be structured with a naming convention
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const data = state.data[i];
            const dataType = data.id.split('bar_graph_').at(-1)  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'backround':   // note spelling; keep for BC
                    this.backgroundColorOn = (data.value === "On")
                    break
                case 'backround_color':   // note spelling; keep for BC
                    this.backgroundColor.color = data.value
                    break
                case 'color':
                    this.barColor.color = data.value
                    break
                case 'value':
                    this.setValue(data.value)
                    break
                case 'width':
                    this.barWidth = parseInt(data.value) || this.barWidth
                    break
                default:
                    i = e  // end the loop on unknown field
                    continue
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // ILayerElement
    render(ctx: RenderContext2D, rect: Rectangle): void {
        if (!ctx)
            return
        ctx.save()
        if( this.backgroundColorOn && !this.backgroundColor.isEmpty) {
            ctx.fillStyle = this.backgroundColor.style
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
        }
        if (!this.barColor.isEmpty) {
            ctx.fillStyle = this.barColor.style
            let x1 = rect.width - (this.values.length * this.barWidth)
            this.values.forEach((value) => {
                const percentage = value / 100
                const length = Math.floor(rect.height * percentage)
                const y1 = rect.height - length
                ctx.fillRect(x1, y1, this.barWidth, length)
                x1 += this.barWidth
            })
        }
        ctx.restore()
    }
}


import { ILayerElement, IValuedElement, RenderContext2D } from '../interfaces'
import { PI, PI2 } from '../../utils/consts'
import { ParseState } from '../types'
import { Rectangle } from '../geometry'
import { BrushStyle } from './'
import { evaluateValue } from '../../utils/helpers'

// Draws an arc/circle extending from 0 to 360 degrees based on a given value onto a canvas context.
export default class RoundProgressGauge implements ILayerElement, IValuedElement
{
    value: number = 0
    capStyle: CanvasLineCap = 'round'
    indicatorColor: BrushStyle = new BrushStyle('#FFA500FF')
    highlightOn = true
    shadowColor = new BrushStyle('#282828FF')
    shadowOn = true
    startingDegree = 180
    counterClockwise = false
    backgroundColor = new BrushStyle('#000000FF')

    // ILayerElement
    get type() { return "RoundProgressGauge"; }
    // IValuedElement
    setValue(value: string) { this.value = evaluateValue(value); }

    loadFromActionData(state: ParseState): RoundProgressGauge {
        // the incoming data IDs should be structured with a naming convention
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const data = state.data[i];
            const dataType = data.id.split('gauge_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'shadow':
                    this.shadowOn = (data.value === "On")
                    break
                case 'shadow_color':
                    this.shadowColor = new BrushStyle(data.value)
                    break
                case 'color':
                    this.indicatorColor = new BrushStyle(data.value)
                    break
                case 'highlight':
                    this.highlightOn = (data.value === "On")
                    break
                case 'start_degree':
                    this.startingDegree = parseFloat(data.value) || this.startingDegree
                    break
                case 'value':
                    this.setValue(data.value)
                    break
                case 'cap':
                    this.capStyle = data.value as CanvasLineCap
                    break
                case 'background_color':
                    this.backgroundColor = new BrushStyle(data.value)
                    break
                case 'counterclockwise':
                    this.counterClockwise = data.value.toLowerCase() === 'counter clockwise'
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
        if (!ctx || rect.isEmpty)
            return
        const cx = rect.width * .5
        const cy = cx
        const radius = rect.width * .39  // approximates the original ratio of 100 for 256px icon size
        const startAngle = this.startingDegree * PI / 180
        const endAngle = startAngle + (PI2 + startAngle - startAngle) * (this.counterClockwise ? -this.value : this.value) * .01

        ctx.save()

        ctx.lineCap = this.capStyle

        if (this.shadowOn && !this.shadowColor.isEmpty) {
            //Shadow
            ctx.beginPath()
            ctx.arc(cx, cy, radius+5, 0, PI2)
            ctx.fillStyle = this.shadowColor
            ctx.filter = 'blur(5px)'
            ctx.fill()
        }

        if (this.highlightOn && !this.indicatorColor.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, endAngle, this.counterClockwise)
            ctx.strokeStyle = this.indicatorColor
            ctx.lineWidth = rect.width * .012
            ctx.filter = 'blur(5px)'
            ctx.stroke()
        }

        // Reset blur to 0
        ctx.filter = 'blur(0px)';

        if (!this.backgroundColor.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, PI2)
            ctx.fillStyle=this.backgroundColor
            ctx.fill()
        }

        if (!this.indicatorColor.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx,cy,radius * .9, startAngle, endAngle, this.counterClockwise)
            ctx.strokeStyle = this.indicatorColor
            ctx.lineWidth = rect.width * .0585
            ctx.stroke();
        }

        ctx.restore()
    }
}


import { ILayerElement, IValuedElement, RenderContext2D } from '../interfaces';
import { M } from '../../utils/consts';
import { ParseState } from '../';
import { Rectangle } from '../geometry';
import { BrushStyle } from './';
import { evaluateValue } from '../../utils/helpers';

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
                    this.shadowColor.color = data.value
                    break
                case 'color':
                    this.indicatorColor.color = data.value
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
                    this.backgroundColor.color = data.value
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

        const cx = rect.width * .5,
            cy = rect.height * .5,
            minSize = Math.min(rect.width, rect.height),
            radius = minSize * .39,  // approximates the original ratio of 100 for 256px icon size
            startAngle = this.startingDegree * M.D2R,
            endAngle = startAngle + M.PI2 * (this.counterClockwise ? -this.value : this.value) * .01,
            currentFilter = ctx.filter,
            addFilter = currentFilter && currentFilter != "none" ? currentFilter + " " : ""

        ctx.save()

        ctx.lineCap = this.capStyle

        if (this.shadowOn && !this.shadowColor.isEmpty) {
            //Shadow
            ctx.beginPath()
            ctx.arc(cx, cy, radius+5, 0, M.PI2)
            ctx.fillStyle = this.shadowColor.style
            ctx.filter = addFilter + 'blur(5px)'
            ctx.fill()
            ctx.filter = currentFilter;
        }

        if (this.highlightOn && !this.indicatorColor.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, endAngle, this.counterClockwise)
            ctx.strokeStyle = this.indicatorColor.style
            ctx.lineWidth = Math.max(minSize * .012, 1)
            ctx.filter = addFilter + 'blur(5px)'
            ctx.stroke()
            ctx.filter = currentFilter;
        }

        if (!this.backgroundColor.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, M.PI2)
            ctx.fillStyle = this.backgroundColor.style
            ctx.fill()
        }

        if (!this.indicatorColor.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx,cy,radius * .9, startAngle, endAngle, this.counterClockwise)
            ctx.strokeStyle = this.indicatorColor.style
            ctx.lineWidth = minSize * .0585
            ctx.stroke();
        }

        ctx.restore()
    }
}

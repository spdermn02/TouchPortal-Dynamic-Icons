
import { IColorElement, ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import { ColorUpdateType, ParseState, Rectangle, RenderContext2D } from '../';
import { StrokeStyle, BrushStyle } from './';
import { evaluateValue, clamp } from '../../utils';
import { M } from '../../utils/consts';

const enum DrawDirection { CW, CCW, Auto }

// Draws an arc/circle extending from 0 to 360 degrees based on a given value onto a canvas context.
export default class RoundProgressGauge implements ILayerElement, IRenderable, IValuedElement, IColorElement
{
    value: number = 0    // decimal percent, -1 through 1
    highlightOn = true
    shadowColor = new BrushStyle('#282828FF')
    startAngle = 180 * M.D2R  // radians
    direction: DrawDirection = DrawDirection.CW
    backgroundColor = new BrushStyle('#000000FF')
    radius = 0.39  // approximates the original ratio of 100 for 256px icon size
    lineStyle: StrokeStyle = new StrokeStyle({
        width: 11.7,   // this line width preserves legacy default size before it was settable
        cap: "round"
    })

    // ILayerElement
    readonly type = "RoundProgressGauge"
    // IValuedElement
    setValue(value: string) { this.value = evaluateValue(value) * .01; }

    // IColorElement
    setColor(value: string, type: ColorUpdateType): void {
        switch (type) {
            case ColorUpdateType.Foreground:
                this.lineStyle.pen.color = value;
                break;
            case ColorUpdateType.Background:
                this.backgroundColor.color = value;
                break;
            case ColorUpdateType.Shadow:
                this.shadowColor.color = value;
                break;
        }
    }

    loadFromActionData(state: ParseState): RoundProgressGauge {
        // the incoming data IDs should be structured with a naming convention
        let lineParsed = false,
            atEnd = false,
            shadowOff = false
        for (let e = state.data.length; state.pos < e && !atEnd;) {
            const data = state.data[state.pos]
            const dataType = data.id.split('gauge_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'color':
                    this.lineStyle.pen.color = data.value
                    break
                case 'highlight':
                    this.highlightOn = (data.value === "On")
                    break
                case 'start_degree':
                    this.startAngle = evaluateValue(data.value) * M.D2R
                    break
                case 'value':
                    this.setValue(data.value)
                    break
                case 'radius':
                    this.radius = clamp(evaluateValue(data.value), 2, 200) * .005
                    break
                case 'counterclockwise': {
                    const value = data.value.toLocaleLowerCase();
                    this.direction = value.startsWith("clock") ? DrawDirection.CW :
                        value.startsWith("auto") ? DrawDirection.Auto :
                        DrawDirection.CCW
                    break
                }
                case 'background_color':
                    this.backgroundColor.color = data.value
                    break
                case 'shadow_color':
                    this.shadowColor.color = data.value
                    break

                // legacy options, keep for BC with <v1.2
                case 'shadow':
                    shadowOff = (data.value == "Off")
                    break
                case 'cap':
                    if (!lineParsed)
                        this.lineStyle.cap = data.value as CanvasLineCap
                    break

                default:
                    if (!lineParsed && dataType?.startsWith('line_')) {
                        this.lineStyle.loadFromActionData(state)
                        lineParsed = true
                    }
                    else {
                        atEnd = true
                    }
                    continue  // do not increment position counter
            }
            ++state.pos;
        }
        // force transparent shadow color if using old action with a shadow toggle option
        if (shadowOff)
            this.shadowColor.color = "#00000000"
        // console.dir(this);
        return this;
    }

    // ILayerElement
    render(ctx: RenderContext2D, rect: Rectangle): void {

        let ccw = this.direction == DrawDirection.CCW  // check to invert the value for endAngle
        const cx = rect.width * .5,
            cy = rect.height * .5,
            minSize = Math.min(rect.width, rect.height),
            radius = minSize * this.radius,
            endAngle = this.startAngle + M.PI2 * (ccw ?  -this.value : this.value),
            currentFilter = ctx.filter,
            addFilter = currentFilter && currentFilter != "none" ? currentFilter + " " : ""

        // set CCW arc draw direction if in Auto mode with negative value
        if (!ccw && this.direction == DrawDirection.Auto && this.value < 0)
            ccw = true

        // relative stroke width is percentage of half the overall size where 100% would be half the smaller of width/height (and strokes would overlay the whole shape)
        if (this.lineStyle.width.isRelative)
            this.lineStyle.widthScale = minSize * .005
        // radius of the indicator, adjusted for stroke width
        const indRadius = (radius - this.lineStyle.scaledWidth * .25)

        ctx.save()

        ctx.lineCap = this.lineStyle.cap

        if (!this.shadowColor.isEmpty) {
            //Shadow
            ctx.beginPath()
            ctx.arc(cx, cy, radius+5, 0, M.PI2)
            ctx.fillStyle = this.shadowColor.style
            ctx.filter = addFilter + 'blur(5px)'
            ctx.fill()
            ctx.filter = currentFilter
        }

        if (this.highlightOn && !this.lineStyle.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx, cy, indRadius, this.startAngle, endAngle, ccw)
            ctx.strokeStyle = this.lineStyle.pen.color
            ctx.lineWidth = Math.max(this.lineStyle.scaledWidth * .2, 1)
            ctx.filter = addFilter + 'blur(5px)'
            ctx.stroke()
            ctx.filter = currentFilter
        }

        if (!this.backgroundColor.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, M.PI2)
            ctx.fillStyle = this.backgroundColor.style
            ctx.fill()
        }

        if (!this.lineStyle.isEmpty) {
            ctx.beginPath();
            ctx.arc(cx,cy, indRadius * .925, this.startAngle, endAngle, ccw)
            ctx.strokeStyle = this.lineStyle.pen.color
            ctx.lineWidth = this.lineStyle.scaledWidth
            ctx.stroke();
        }

        ctx.restore()
    }
}

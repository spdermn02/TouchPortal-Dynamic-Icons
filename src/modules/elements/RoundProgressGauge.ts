
import { ColorUpdateType, ArcDrawDirection, LayerRole, ParseState } from '../';
import { StrokeStyle, BrushStyle } from './';
import { assignExistingProperties, evaluateValue, clamp, parseArcDirection } from '../../utils';
import { M } from '../../utils/consts';
import type { IColorElement, ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type { Rectangle, RenderContext2D } from '../';

/** Draws an arc/circle extending from 0 to 360 degrees based on a given value onto a canvas context. */
export default class RoundProgressGauge implements ILayerElement, IRenderable, IValuedElement, IColorElement
{
    /** Gauge value as decimal percent, -1 through 1 */
    value: number = 0
    /** A highlight is a copy of the value track with a blur filter applied, drawn behind the value track itself and with the same color. */
    highlightOn = true
    /** Shadow color to draw behind the gauge area. Use any transparent color to disable. */
    readonly shadowColor = new BrushStyle('#282828FF')
    /** Starting angle in radians. 0 points east, default is west. */
    startAngle = 180 * M.D2R
    /** Drawing direction, clockwise (0), counter-clockwise (1), or automatic (2) based on value being positive (CW) or negative (CCW). */
    direction: ArcDrawDirection = ArcDrawDirection.CW
    /** The background follows the radius of the gauge, not the full icon drawing area. */
    readonly backgroundColor = new BrushStyle('#000000FF')
    /** Radius of gauge arc, expressed as decimal percentage of half of the overall drawing size (eg. radius of 0.5 would be one quarter of the overall image size). */
    radius = 0.39  // approximates the original ratio of 100 for 256px icon size
    /** Style to use for drawing the value track. (The track cannot be filled, only stroked.) */
    readonly lineStyle: StrokeStyle = new StrokeStyle({
        width: 11.7,   // this line width preserves legacy default size before it was settable
        cap: "round"
    })

    constructor(init?: Partial<RoundProgressGauge>) {
        assignExistingProperties(this, init, 1);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    // IValuedElement
    /** Sets {@link RoundProgressGauge#value} property using an evaluated string. */
    setValue(value: string) { this.value = evaluateValue(value) * .01; }

    // IColorElement
    /** @internal */
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

    // ILayerElement
    /** @internal */
    loadFromActionData(state: ParseState): RoundProgressGauge {
        const dr = state.asRecord(state.pos, "gauge_");
        let shadowOff = false;
        // console.dir(dr);
        for (const [key, value] of Object.entries(dr)) {
            switch (key) {
                case 'color':
                    this.lineStyle.pen.color = value
                    break
                case 'highlight':
                    this.highlightOn = (value === "On")
                    break
                case 'start_degree':
                    this.startAngle = evaluateValue(value) * M.D2R
                    break
                case 'value':
                    this.setValue(value)
                    break
                case 'radius':
                    this.radius = clamp(evaluateValue(value), 2, 200) * .005
                    break
                case 'counterclockwise':
                    this.direction = parseArcDirection(value)
                    break
                case 'background_color':
                    this.backgroundColor.color = value
                    break
                case 'shadow_color':
                    this.shadowColor.color = value
                    break
                // legacy options, keep for BC with <v1.2
                case 'shadow':
                    // force transparent shadow color if using old action with a shadow toggle option
                    shadowOff = (value == "Off")
                    break
                case 'cap':
                    this.lineStyle.cap = <CanvasLineCap>value
                    break
                default:
                    continue;
            }
            delete dr[key];
        }
        this.lineStyle.loadFromDataRecord(ParseState.splitRecordKeys(dr, "line_"));
        if (shadowOff)
            this.shadowColor.color = "#00000000"
        // console.dir(this);
        return this;
    }

    // IRenderable
    /** Draws this gauge at its current `value` property onto `ctx` using `rect` dimensions for scaling. */
    render(ctx: RenderContext2D, rect: Rectangle): void {

        let ccw = this.direction == ArcDrawDirection.CCW  // check to invert the value for endAngle
        const cx = rect.width * .5,
            cy = rect.height * .5,
            minSize = Math.min(rect.width, rect.height),
            radius = minSize * this.radius,
            endAngle = this.startAngle + M.PI2 * (ccw ?  -this.value : this.value),
            currentFilter = ctx.filter,
            addFilter = currentFilter && currentFilter != "none" ? currentFilter + " " : ""

        // set CCW arc draw direction if in Auto mode with negative value
        if (!ccw && this.direction == ArcDrawDirection.Auto && endAngle < this.startAngle)
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


import { UnitValue } from '..';
import { BrushStyle } from '.';
import { assignExistingProperties, evaluateValue, parseNumericArrayString, round4p } from '../../utils';
import type { Rectangle } from '..';

/** Stores stroke (line) canvas context property definitions, which includes stroke ("pen") style, line width, cap, join, miter, and dash array properties.
Line width can be defined as a relative % and scaled automatically in the {@link render} method.
 */
export default class StrokeStyle
{
    /** Size of the stroke in pixels or % of final drawing size. */
    width: UnitValue = new UnitValue(0, "%");
    /** Scaling factor for the stroke size when a relative (%) unit is used.
        This affects return values from `scaledWidth`, `scaledLineDash` and `scaledDashOffset` properties.
        The value is always re-computed inside the {@link render} method if a `rect` argument is passed to it. */
    widthScale: number = 1;
    /** Style (color/gradient/pattern/texture) for the stroke. */
    pen: BrushStyle;
    /** Context `lineCap` property to apply. Default is 'butt'. */
    cap: CanvasLineCap = 'butt';
    /** Context `lineJoin` property to apply. Default is 'miter'. */
    join: CanvasLineJoin = 'miter';
    /** Context `miterLimit` property to apply. Default is `10`. */
    miterLimit: number = 10;
    /** Optional array to pass to context's `setLineDash()` method. Default is an empty array (solid line). */
    lineDash: number[] = [];
    /** Context `lineDashOffset` property to apply when specifying a dash pattern. Default is 0. */
    dashOffset: number = 0;

    /** Returns `true` if stroke style is invalid (eg. no color) or {@link scaledWidth} is <= zero. */
    get isEmpty(): boolean { return this.scaledWidth <= 0 || this.pen.isNull; }
    /** If the {@link width} unit type is relative (%) then returns the defined width multiplied by {@link widthScale}. Otherwise just returns the actual defined width. */
    get scaledWidth(): number { return this.width.isRelative ? round4p(this.width.value * this.widthScale) : this.width.value; }
    /** If the {@link width} unit type is relative (%) then returns a copy of the {@link lineDash} array with each member multiplied by {@link widthScale}. Otherwise just returns {@link lineDash} unmodified. */
    get scaledLineDash(): number[] { return this.width.isRelative ? this.lineDash.map(v => round4p(v * this.widthScale)) : this.lineDash; }
    /** If the {@link width} unit type is relative (%) then returns the {@link dashOffset} value multiplied by {@link widthScale}. Otherwise just returns {@link dashOffset} unmodified. */
    get scaledDashOffset(): number { return this.width.isRelative && this.dashOffset ? round4p(this.dashOffset * this.widthScale) : this.dashOffset; }

    constructor(init?: PartialDeep<StrokeStyle | { width?: number|string, color?: string }> ) {
        if (typeof init?.width == 'number') {
            this.width.value = Math.abs(init.width);
        }
        else if (typeof init?.width == 'string') {
            this.width.setFromString(init.width);
        }
        // @ts-ignore
        this.pen = new BrushStyle(init?.pen || init?.color);
        assignExistingProperties(this, init, 0);
    }

    private setWidthUnit(unit: string) {
        this.width.setUnit(unit);
        if (!this.width.isRelative)
            this.widthScale = 1;
    }

    /** @internal Returns `true` if line width or the width unit have changed. */
    loadFromDataRecord(dr: TpActionDataRecord): boolean {
        let dirty = false;
        for (const [key, value] of Object.entries(dr)) {
            switch (key) {
                case 'width': {
                    const val = Math.abs(evaluateValue(value));
                    if (val != this.width.value) {
                        this.width.value = val;
                        dirty = true;
                    }
                    break;
                }
                case 'width_unit':
                    if (value != this.width.unit) {
                        this.setWidthUnit(value);
                        dirty = true;
                    }
                    break;
                case 'color':
                    this.pen.color = value;
                    break;
                case 'cap':
                    this.cap = <CanvasLineCap>value;
                    break;
                case 'join':
                    this.join = <CanvasLineJoin>value;
                    break;
                case 'miterLimit':
                    this.miterLimit = parseFloat(value) || this.miterLimit;
                    break;
                case 'dash':
                    parseNumericArrayString(value, this.lineDash = [], 0, 0);
                    break;
                case 'dashOffset':
                    this.dashOffset = evaluateValue(value);
                    break;
                default:
                    continue;
            }
            delete dr[key];
        }
        // console.dir(this);
        return dirty;
    }

    /** Applies current stroke styling properties to the given canvas `ctx`. `rect` size is used to scale relative-sized stroke width. */
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

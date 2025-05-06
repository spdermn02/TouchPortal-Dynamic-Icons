import { Alignment, ColorUpdateType, LayerRole, ParseState, Path2D, Placement, Rectangle, UnitValue } from '../';
import { arraysMatchExactly, evaluateStringValue, evaluateValue, parseAlignmentFromValue, parseBoolFromValue, parsePlacement } from '../../utils';
import { ALIGNMENT_ENUM_NAMES, Str } from '../../utils/consts';
import { BrushStyle, StrokeStyle, StyledText } from './';
import SizedElement, {type  SizedElementInit} from './SizedElement';  // must be direct import for subclass

export type GaugeTicksInit = SizedElementInit & PartialDeep<GaugeTicks>;

export type TickProperties = {
    type: 0|1
    count: number
    len: UnitValue
    place: Placement
    path: Path2D | null
    stroke: StrokeStyle
}

export type PathMetrics = ReturnType<GaugeTicks['metrics']>
export type TickMetrics = PathMetrics & { ticksCount:number, tickLen: number|number[] };
export type LabelMetrics = PathMetrics & {offset: number, position: 1|-1};

class Cache {
    rect = new Rectangle();    // dimensions that the current paths were last scaled/aligned into
    bounds = new Rectangle();  // last calculated path bounds after scaling and alignment
    scale = 1;                 // last calculated scaling factor for `rect` to `bounds` difference, to be applied to canvas context
    lastLabelsValue = "";      // the last parsed "values" action data string, to know if it needs re-parsing into new labels array
    get isNull() { return this.rect.isNull; }
    clear() { this.rect.clear(); }
    isDirty(rect: Rectangle) { return this.isNull || !this.rect.fuzzyEquals(rect); }
}

/**
    Abstract base class for drawing "tick" marks and/or value labels, for use in a gauge indicator.
    Ticks can be split into "major" and "minor" divisions with separate spacing, size and styling options.
    Label text, font, color, and other presentation properties are configured independently from the tick marks.
*/
export default abstract class GaugeTicks extends SizedElement
{
    readonly #cache = new Cache();
    readonly #ticks: [TickProperties, TickProperties];
    readonly #labels = {
        place: Placement.Inside,
        align: Alignment.NONE,  // horizontal, NONE for auto alignment, only used by linear
        rotate: <number> 0,     // different meanings for linear and circular
        padding: <number> 0,    // user-specified offset from automatic placement
        font: <string> "",      // full CSS font spec
        spacing: <UnitValue> new UnitValue(0, "px"),
        fill: <BrushStyle> null!,
        labels: <Array<string>> [],  // label values, if any; length is used to determine spacings
        path: <Path2D | null> null,  // generated Path2D for the labels, if any
    };

    /** The constructor doesn't call `super.init(init)`, subclasses should do that. */
    protected constructor(init?: GaugeTicksInit) {
        super();
        this.#ticks = [
            this.#initTickRecord(0, init?.majTicksStroke),
            this.#initTickRecord(1, init?.minTicksStroke),
        ];
        this.#labels.fill = new BrushStyle(init?.labelsStyle);
        // super.init(init);
    }

    #initTickRecord(type: 0|1, strokeInit?: PartialDeep<StrokeStyle>): TickProperties {
        return {
            type,
            count: 0,
            len: new UnitValue(0, "%"),
            place: Placement.Inside,
            path: null,
            stroke: new StrokeStyle(strokeInit),
        }
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    /** Returns true if there is nothing to draw: Zero ticks and labels, zero width or height, or all styling would be invisible. */
    get isEmpty(): boolean {
        return (!this.majTicksCount && !this.hasLabels)
            || this.width.value == 0
            || this.height.value == 0
            || (this.majTicksStroke.isEmpty && this.minTicksStroke.isEmpty && this.#labels.fill.isEmpty);
    }
    /** Returns `true` if there are any labels to be drawn. */
    get hasLabels(): boolean {
        return this.labels.length > 0;
    }

    protected get ticks() { return this.#ticks; }
    protected get majTicks() { return this.#ticks[0]; }
    protected get minTicks() { return this.#ticks[1]; }

    /** Total number of major tick marks to draw along the curve. This will also determine the spacing (number of degrees) between ticks. */
    get majTicksCount() { return this.majTicks.count; }
    set majTicksCount(v: number) { this.setTickCount(this.majTicks, v); }
    /** Length of each major tick mark, in either % or px units. Relative size is calculated based on overall image size. */
    get majTicksLen(): number { return this.majTicks.len.value; }
    set majTicksLen(v: number | string) { this.setTickLen(this.majTicks, v); }
    /** Length unit for each major tick mark, either `%` or `px`. */
    get majTicksLenUnit() { return this.majTicks.len.unit; }
    set majTicksLenUnit(v: string) { this.setTickLenUnit(this.majTicks, v); }
    /** Configures in which direction to draw major tick marks relative to the curve radius. `Inside` will draw from curve radius to the inside of the circle,
        `Outside` will draw from radius towards the outside, and `Center` will split the difference with each mark being centered along the radius. */
    get majTicksPlace(): Placement { return this.majTicks.place; }
    set majTicksPlace(v: Placement | string) { this.setTickPlace(this.majTicks, v); }
    /** Major tick marks `StrokeStyle` object. Read-only. */
    get majTicksStroke(): StrokeStyle { return this.majTicks.stroke; };
    /** Major tick marks stroke color. */
    get majTicksColor() { return this.majTicksStroke.pen.color; }
    set majTicksColor(v: string) { this.majTicksStroke.pen.color = v; }
    /** Gets or sets the `Path2D` object representing the major ticks marks to be drawn. */
    get majTicksPath() { return this.majTicks.path; }
    set majTicksPath(v: Path2D | null) { this.majTicks.path = v; }


    /** The number of minor tick marks to draw between each major tick (not a total number). This will also determine the spacing (number of degrees) between minor ticks. */
    get minTicksCount() { return this.minTicks.count; }
    set minTicksCount(v: number) { this.setTickCount(this.minTicks, v); }
    /** Length of each minor tick mark, in either % or px units. Relative size is calculated based on overall image size. */
    get minTicksLen(): number { return this.minTicks.len.value; }
    set minTicksLen(v: number | string) { this.setTickLen(this.minTicks, v); }
    /** Length unit for each minor tick mark, either `%` or `px`. */
    get minTicksLenUnit() { return this.minTicks.len.unit; }
    set minTicksLenUnit(v: string) { this.setTickLenUnit(this.minTicks, v); }
    /** Configures in which direction to draw minor tick marks relative to the curve radius. `Inside` will draw from curve radius to the inside of the circle,
        `Outside` will draw from radius towards the outside, and `Center` will split the difference with each mark being centered along the radius. */
    get minTicksPlace(): Placement { return this.minTicks.place; }
    set minTicksPlace(v: Placement | string) { this.setTickPlace(this.minTicks, v); }
    /** Minor tick marks `StrokeStyle` object. Read-only. */
    get minTicksStroke(): StrokeStyle { return this.minTicks.stroke; };
    /** Minor tick marks stroke color. */
    get minTicksColor() { return this.minTicks.stroke.pen.color; }
    set minTicksColor(v: string) {
        this.minTicks.stroke.pen.color = v;
    }
    /** Gets or sets the `Path2D` object representing the minor ticks marks to be drawn. */
    get minTicksPath() { return this.minTicks.path; }
    set minTicksPath(v: Path2D | null) { this.minTicks.path = v; }


    /** Array of strings to be used as label text. Empty for no labels.
        The individual label values will be distributed evenly along the curve from `startAngle` to `endAngle` (inclusive). */
    get labels() { return this.#labels.labels; }
    set labels(v: string[]) {
        if (!v) v = [];
        if (!arraysMatchExactly(v, this.#labels.labels)) {
            this.#labels.labels = v;
            this.clearCache();
            // console.log(v);
        }
    }
    /** Controls label placement, `Placement.Inside` to put labels inside the curve, or `Placement.Outside` to place them outside the curve. */
    get labelsPlace(): Placement { return this.#labels.place; }
    set labelsPlace(v: Placement | string) {
        if (v == undefined) return;
        if (typeof v == 'string')
            v = parsePlacement(v, Placement.Inside);
        if (v != this.#labels.place) {
            this.#labels.place = v;
            this.clearCache();
        }
    }

    get labelsAlign(): Alignment { return this.#labels.align; }
    set labelsAlign(v: Alignment | string) {
        if (v == undefined) return;
        if (typeof v == 'string')
            v = parseAlignmentFromValue(v, Alignment.H_MASK);
        if (v != this.#labels.align) {
            this.#labels.align = v;
            this.clearCache();
        }
    }

    /** Controls label rotation.
        For linear marks this sets rotation from horizontal, in degrees.
        For circular, 0 = no rotation, 1 = rotate to inside, -1 = rotate to outside. */
    get labelsRotate():number { return this.#labels.rotate; }
    set labelsRotate(v: number | string) {
        if (v == undefined) return;
        if (typeof v == 'string')
            v = parseFloat(v) || 0;
        if (v != this.#labels.rotate) {
            this.#labels.rotate = v;
            this.clearCache();
        }
    }

    /** Expands or contracts the space between label text and the tick marks. Expressed as percent of overall image size. Default is `0`. */
    get labelsPadding():number { return this.#labels.padding; }
    set labelsPadding(v: number | string) {
        if (v == undefined) return;
        if (typeof v == 'string')
            v = parseFloat(v) || 0;
        if (v != this.#labels.padding) {
            this.#labels.padding = v;
            this.clearCache();
        }
    }
    /** CSS font specification for labels text. */
    get labelsFont() { return this.#labels.font; }
    set labelsFont(v: string) {
        if (v != this.#labels.font) {
            this.#labels.font = v;
            this.clearCache();
        }
    }
    /** Letter spacing property expressed as a CSS `length` value, eg: "2px" or "1em". Default is `0px`. */
    get labelsSpacing() { return this.#labels.spacing.toString(); }
    set labelsSpacing(v: string) {
        if (!v) return;
        if (this.labelsSpacing != v) {
            this.#labels.spacing.setFromString(v);
            this.clearCache();
        }
    }
    /** Labels fill `BrushStyle`. Read-only. */
    get labelsStyle() { return this.#labels.fill; }
    /** Labels fill color. */
    get labelsColor() { return this.#labels.fill.color; }
    set labelsColor(v: string) {
        this.#labels.fill.color = v;
    }
    /** Gets or sets the `Path2D` object representing the labels to be drawn. */
    get labelsPath() { return this.#labels.path; }
    set labelsPath(v: Path2D | null) { this.#labels.path = v; }

    // IColorElement
    /** @internal `ColorUpdateType.Fill` set label color and `ColorUpdateType.Stroke` sets stroke color for both major and minor ticks. */
    setColor(value: string, type: ColorUpdateType): void {
        if (type & ColorUpdateType.Fill)
            this.labelsColor = value;
        if (type & ColorUpdateType.Stroke) {
            this.majTicksColor = value;
            this.minTicksColor = value;
        }
    }

    protected clearCache() {
        this.#cache.clear();
        // console.trace("Cache cleared");
    }

    protected setTickCount(t:TickProperties, v:number) {
        if (v == undefined) return;
        if (v != t.count) {
            t.count = v;
            this.clearCache();
        }
    }
    protected setTickLen(t:TickProperties, v:number | string) {
        if (v == undefined) return;
        if (typeof v == 'string') {
            const u = UnitValue.fromString(v);
            this.setTickLen(t, u.value);
            this.setTickLenUnit(t, u.unit);
        }
        else if (v != t.len.value) {
            t.len.value = v;
            this.clearCache();
        }
    }
    protected setTickLenUnit(t:TickProperties, v:string) {
        if (!v) return;
        if (v != t.len.unit) {
            t.len.unit = v;
            this.clearCache();
        }
    }
    protected setTickPlace(t:TickProperties, v:Placement | string) {
        if (v == undefined) return;
        if (typeof v == 'string')
            v = parsePlacement(v, t.type == 0 ? Placement.Inside : this.majTicksPlace);
        if (v != t.place) {
            t.place = v;
            this.clearCache();
        }
    }

    protected loadTickData(idx: 0|1, record: TpActionDataRecord) {
        const dr = ParseState.splitRecordKeys(record, (idx == 0 ? 'maj' : 'min') + Str.IdSep, true),
            t = this.#ticks[idx];
        this.setTickCount(t, evaluateValue(dr.count));
        if (t.count) {
            this.setTickLen(t, evaluateValue(dr.len));
            this.setTickLenUnit(t, dr.len_unit);
            this.setTickPlace(t, dr.place);
            t.stroke.loadFromDataRecord(ParseState.splitRecordKeys(dr, "line_"));
        }
    }

    /** @internal */
    protected loadFromDataRecord(dr: TpActionDataRecord) {
        if (super.loadFromDataRecord(dr))
            this.clearCache();

        this.loadTickData(0, dr);
        this.loadTickData(1, dr);

        const labelValue = dr.label_value.trim();
        if (this.#cache.lastLabelsValue != labelValue) {
            this.#cache.lastLabelsValue = labelValue;
            this.parseLabelValues(labelValue);
        }
        if (this.hasLabels) {
            this.labelsPlace = dr.label_place;
            this.labelsAlign = dr.label_align;
            this.labelsRotate = dr.label_rotate;
            this.labelsPadding = dr.label_padding;
            this.labelsFont = dr.label_font?.trim();
            this.labelsSpacing = dr.label_spacing?.trim();
            this.labelsColor = dr.label_color;
        }
        return this.#cache.isNull;
    }

    /** Label values can be specified as a numeric range and count (eg. "0-360 / 4")
        or as a CSV series of strings (eg. "N, E, S, W"). The string is evaluated before parsing,
        so embedded JS (in ${...} blocks) can be executed, for example to generate a dynamic array of formatted values. */
    protected parseLabelValues(value: string) {
        if (!value) {
            this.labels = [];
            return;
        }
        value = evaluateStringValue(value);
        if (value.includes(',')) {
            this.labels = value.split(/\s*,\s*/);
            return;
        }

        const rngCnt = value.split(/\s*\/\s*/, 2),
            cnt = parseFloat(rngCnt[1]) || 2;
        let [from, to]: any = rngCnt[0].split(/\s*-\s*/, 2);
        from = parseFloat(from) || 0;
        to = parseFloat(to) || 0;
        if (from == to || cnt < 2)  {
            this.labels = [];
            return;
        }
        const n = (to - from) / (cnt - 1),
            a: string[] = [];
        for (let i=0; i < cnt; from += n, ++i)
            a.push(from.toString())
        this.labels = a;
        // console.log(value, from, to, cnt)
    }

    // Subclasses must implement these methods.
    protected abstract generateTicksPath(tick: TickProperties, metrics: TickMetrics): void;
    protected abstract generateLabelsPath(ctx: RenderContext2D, metrics: LabelMetrics): void;

    protected generateTicksType(tick:TickProperties, m: PathMetrics) {
        let len: any = tick.len.value
        if (tick.len.isRelative)
            len *= m.lenScl;
        if (tick.place == Placement.Inside)
            len *= -1;
        // minor ticks count is also based on major tick count
        let ticksCount = this.majTicksCount;
        if (tick.type == 1) {
            // minor ticks, adjust count and length type
            ticksCount += (ticksCount - 1) * tick.count;
            // create array of tick lengths so that each major tick place is skipped (zero length)
            len = [0, ...Array.from({length: tick.count}, () => len)];
        }

        // call subclass implementation to generate actual path
        this.generateTicksPath(tick, { ...m, ticksCount, tickLen: len })
    }

    protected generateTicks(m: PathMetrics) {
        if (this.majTicksCount)
            this.generateTicksType(this.majTicks, m);
        else
            this.majTicksPath = null;
        if (this.minTicksCount)
            this.generateTicksType(this.minTicks, m);
        else
            this.minTicksPath = null;
    }

    protected generateLabels(ctx: RenderContext2D, m: PathMetrics) {
        if (!this.hasLabels) {
            this.labelsPath = null;
            return;
        }

        // calculate label offset based on longest tick length pointing in same direction
        const position = this.#labels.place == Placement.Inside ? -1 : 1;
        let offset = 0;
        for (const tick of this.#ticks) {
            let len = 0;
            if (tick.place == Placement.Center)
                len = tick.len.value * (tick.len.isRelative ? m.lenScl : 1) * .5;
            else if (tick.place == this.#labels.place)
                len = tick.len.value * (tick.len.isRelative ? m.lenScl : 1);
            else
                continue;
            if (len > offset)
                offset = len;
        }
        // add a fixed default offset, but scale it down if needed
        offset += Math.min(8, 8 * m.lenScl);
        // extra user-specified padding around label;
        offset += this.#labels.padding * m.lenScl;
        // reverse offset if placing labels inside the curve or at top/left
        offset *= position;

        // set up canvas typography options to be used when generating text paths
        ctx.textWrap = true;
        ctx.fontHinting = true;
        ctx.fontVariant = StyledText.defaultFontVariant as any;
        ctx.font = this.#labels.font;
        if (this.#labels.spacing.value)
            ctx.letterSpacing = this.#labels.spacing.toString();
        if (this.labelsAlign != Alignment.NONE)
            ctx.textAlign = ALIGNMENT_ENUM_NAMES[this.labelsAlign & Alignment.H_MASK];

        // call subclass implementation to generate actual path
        this.generateLabelsPath(ctx, {...m, offset, position });
    }

    protected metrics(rect: Rectangle) {
        const w = this.width.isRelative ? this.width.value * .01 * rect.width : this.width.value,
            h = this.height.isRelative ? this.height.value * .01 * rect.height : this.height.value,
            rX = w * .5,
            rY = h * .5,
            cX = this.width.isRelative ? rX : rect.center.x,
            cY = this.height.isRelative ? rY : rect.center.y,
            lenScl = Math.min(w, h) * .01;
        return { w, h, rX, rY, cX, cY, lenScl }
    }

    protected generatePaths(ctx: RenderContext2D, rect: Rectangle) {
        const m = this.metrics(rect);
        // Re-geneate or clear paths as needed
        this.generateTicks(m);
        this.generateLabels(ctx, m);

        // Calculate scaling factor if needed to keep combination of all paths within specified dimensions.
        const majB = Rectangle.fromBounds(this.majTicksPath?.bounds),
            minB = Rectangle.fromBounds(this.minTicksPath?.bounds),
            lblB = Rectangle.fromBounds(this.labelsPath?.bounds),
            b = Rectangle.united(majB, minB, lblB),
            w = this.width.isRelative ? this.width.value * .01 * rect.width : b.width,
            h = this.height.isRelative ? this.height.value * .01 * rect.height : b.height,
            scale = Math.min(1, w / b.width, h / b.height);
        // console.log(rect, b, w, h, scale)
        b.scale(scale);

        // Calculate offset to match alignment settings.
        // When we have both ticks and labels with a center/middle alignment we actually want to calculate
        // the offset w/out the labels. This will propertly align the tick marks w/out offsetting for extra
        // "overhang" caused by labels. Otherwise the tick scale may unexpectedly appear off-center/middle.
        if (!!this.majTicksPath && !!this.labelsPath && (this.alignment & Alignment.CENTER)) {
            const oB = Rectangle.united(majB, minB).scale(scale);
            // Add back respective overall bounds, with labels, for off-center alignments
            if (!(this.alignment & Alignment.HCENTER))
                oB.unite(new Rectangle(b.left, 0, b.width, 0));
            if (!(this.alignment & Alignment.VCENTER))
                oB.unite(new Rectangle(0, b.top, 0, b.height));
            // console.log(`${b}\n${oB}\n`, lB);
            b.setOrigin(super.computeOffset(oB, rect, true));
        }
        else {
            // If there's only ticks _or_ labels, or both alignment values are at the edges,
            // then just offset based on overall bounds, which will make sure no parts are drawn off-canvas.
            b.setOrigin(super.computeOffset(b, rect, true));
        }
        return { bounds: b, scale };
    }

    // IRenderable
    /** Draws the gauge marks with all styling and positioning options applied onto `ctx` using `rect` dimensions for scaling and alignment. */
    render(ctx: RenderContext2D, rect: Rectangle): void {
        if (this.isEmpty)
            return;

        if (this.#cache.isDirty(rect)) {
            const {bounds, scale} = this.generatePaths(ctx, rect);
            // cache the calculated bounds and offset
            this.#cache.bounds.set(bounds);
            this.#cache.scale = scale;
            this.#cache.rect.set(rect);
        }

        ctx.save();
        ctx.translate(this.#cache.bounds.x, this.#cache.bounds.y);
        ctx.scale(this.#cache.scale, this.#cache.scale);

        if (this.majTicksPath) {
            this.majTicksStroke.render(ctx, rect);
            ctx.stroke(this.majTicksPath);
        }
        if (this.minTicksPath) {
            this.minTicksStroke.render(ctx, rect);
            ctx.stroke(this.minTicksPath);
        }
        if (this.labelsPath) {
            this.#labels.fill.render(ctx, true);
            ctx.fill(this.labelsPath);
        }
        ctx.restore();

     }

}

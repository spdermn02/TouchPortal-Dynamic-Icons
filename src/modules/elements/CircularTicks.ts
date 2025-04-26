import { Alignment, ParseState, Placement, } from '../';
import { assignExistingProperties, evaluateValue, circularLabelsPath, cirularGaugeTicksPath, parsePlacement, } from '../../utils';
import { Act, /* DataValue, */ Str } from '../../utils/consts';
import GaugeTicks, { type LabelMetrics, type TickMetrics, type TickProperties } from './GaugeTicks';  // must be direct import for subclass
import type { IColorElement, ILayerElement, IRenderable } from '../interfaces';
import type { RenderContext2D,  } from '../';

/** Implementation of GaugeTicks for drawing ticks/labels along a circular/curved path. */
export default class CircularTicks extends GaugeTicks implements ILayerElement, IRenderable, IColorElement
{
    #start: number = 0;
    #end: number = 0;
    #angled: Placement = Placement.NoPlace;

    constructor(init?: PartialDeep<CircularTicks>) {
        super(init);
        this.labelsAlign = Alignment.HCENTER;  // always align center by default
        assignExistingProperties(this, init, 0);
    }

    /** Returns true if there is nothing to draw: Start angle == end, zero ticks or labels, or all styling would be invisible. */
    get isEmpty(): boolean {
        return !this.angleDelta || super.isEmpty;
    }

    /** Starting angle of ticks curve, in degrees. 0° points north. */
    get startAngle() { return this.#start; }
    set startAngle(v: number) {
        if (v != this.#start) {
            this.#start = v;
            this.clearCache();
        }
    }
    /** Ending angle of ticks curve, in degrees. 0° points north. */
    get endAngle() { return this.#end; }
    set endAngle(v: number) {
        if (v != this.#end) {
            this.#end = v;
            this.clearCache();
        }
    }
    /** Normalized (0-360) angle difference between `startAngle` and `endAngle`. Read-only. */
    get angleDelta() {
        let d = this.endAngle - this.startAngle;
        while (d < 0)
            d+= 360;
        return d;
    }

    /** Flag indicating if the labels should be auto-rotated to follow the drawing angle from center of gauge.
        `Placement.Inside` will rotate to face inward, `Placement.Outside` will rotate to face outward, otherwise no auto rotateion is applied.
        In the first two cases, any further {@link labelsRotate} property adjustment is applied relative to the rotated label. */
    get labelsAngled(): Placement { return this.#angled; }
    set labelsAngled(v: Placement | string) {
        if (v == undefined) return;
        if (typeof v == 'string')
            v = parsePlacement(v);
        if (this.#angled != v) {
            this.#angled = v;
            this.clearCache();
        }
    }

    /** @internal */
    loadFromActionData(state: ParseState): CircularTicks {
        const dr = state.asRecord(state.pos, Act.IconCircularTicks + Str.IdSep);
        this.startAngle = evaluateValue(dr.start);
        this.endAngle = evaluateValue(dr.end);
        this.labelsAngled = dr.label_angled;
        super.loadFromDataRecord(dr);
        return this;
    }

    protected override generateTicksPath(tick: TickProperties, m: TickMetrics) {
        if (tick.type == 1 && this.angleDelta >= 360)
            m.ticksCount += tick.count;
        tick.path = cirularGaugeTicksPath(
            m.cX, m.cY, m.rX, m.rY, this.startAngle, this.endAngle,
            m.ticksCount, m.tickLen, tick.place == Placement.Center
        );
        // console.log("TICKS PATH:", idx, tick.count, n, this.angleDelta);
    }

    protected override generateLabelsPath(ctx: RenderContext2D, m: LabelMetrics) {
        this.labelsPath = circularLabelsPath(ctx,
            m.cX, m.cY, m.rX + m.offset, m.rY + m.offset,
            this.startAngle, this.endAngle,
            this.labels, m.position, this.labelsRotate,
            (this.#angled == Placement.Inside ? 1 : this.#angled == Placement.Outside ? -1 : 0)
        );
        // console.log("LABELS PATH:", m.offset, this.labelsPath.bounds);
    }

}

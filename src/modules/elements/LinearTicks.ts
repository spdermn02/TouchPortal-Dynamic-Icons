import { Alignment, Orientation, ParseState, Placement, } from '../';
import { assignExistingProperties, linearGaugeTicksPath, linearLabelsPath } from '../../utils';
import { Act, Str } from '../../utils/consts';
import GaugeTicks, { type LabelMetrics, type TickMetrics, type TickProperties } from './GaugeTicks';  // must be direct import for subclass
import type { IColorElement, ILayerElement, IRenderable } from '../interfaces';
import type { RenderContext2D, /* TpActionDataRecord */ } from '../';

/** Implementation of `GaugeTicks` for drawing ticks/labels along a linear path, either horizontally or vertically. */
export default class LinearTicks extends GaugeTicks implements ILayerElement, IRenderable, IColorElement
{
    #orientation: Orientation = Orientation.H;

    constructor(init?: PartialDeep<LinearTicks>) {
        super(init);
        assignExistingProperties(this, init, 0);
        // Linear marks only use the width property, as total length, and height is always 100% for path generation purposes.
        this.height.value = 100;
        this.height.unit = '%';
    }

    /** Tick path orientation. Ticks are drawn perpendicular to this path. */
    get orientation():Orientation { return this.#orientation; }
    set orientation(v: Orientation | string) {
        if (v == undefined)
            return;
        if (typeof v == 'string')
            v = v[0]?.toUpperCase() == 'V' ? Orientation.V : Orientation.H;
        if (this.#orientation != v) {
            this.#orientation = v;
            this.clearCache();
        }
    }

    /** @internal */
    loadFromActionData(state: ParseState): LinearTicks {
        const dr = state.asRecord(state.pos, Act.IconLinearTicks + Str.IdSep);
        super.loadFromDataRecord(dr);
        this.orientation = dr.orientation;
        return this;
    }

    protected override generateTicksPath(tick: TickProperties, m: TickMetrics) {
        tick.path = linearGaugeTicksPath(
            0, 0, m.w, this.orientation == Orientation.V,
            m.ticksCount, m.tickLen, tick.place == Placement.Center
        );
        // console.log("TICKS PATH:", idx, m.cX, m.cY, m.rX, m.rY, tick.count, m.n, len, tick.path.bounds);
    }

    protected override generateLabelsPath(ctx: RenderContext2D, m: LabelMetrics) {
        const x = this.orientation == Orientation.H ? 0 : m.offset,
              y = this.orientation == Orientation.V ? 0 : m.offset;
        this.labelsPath = linearLabelsPath(ctx,
            x, y, m.w, this.orientation == Orientation.V,
            this.labels, m.position, this.labelsRotate,
            this.labelsAlign == Alignment.NONE
        );
        // console.log("LABELS PATH:", this.labels, m, this.labelsPath.bounds);
    }

}


import { ArcDrawDirection, Point, Path2D } from '../';
import { assignExistingProperties, evaluateValue, parseArcDirection, round4p, round5p, round6p } from '../../utils';
import { Act, M, Str } from '../../utils/consts'
import Path from './Path';
import type { ILayerElement, IPathProducer, IValuedElement } from '../interfaces';
import type { ParseState, Rectangle } from '../';

/** Creates a full or partial ellipse/circle/arc path of given diameter, start and end angle values,
    draw direction, and optional rotation around center. Essentially a proxy for `Path2D.ellipse()` method.
    The `IValuedElement::setValue()` interface sets the arc's ending angle. */
export default class EllipsePath extends Path implements ILayerElement, IPathProducer, IValuedElement
{
    // all angles stored as radians; start and end are adjusted -90° from user-specified value (so 0° points north instead of east)
    /** Starting angle in radians (0 points east) */
    startAngle: number = 0;
    /** Ending angle in radians (0 points east) */
    endAngle: number = 0;
    /** Rotation angle in radians (0 points east) */
    rotation: number = 0;
    /** Drawing direction, clockwise (0), counter-clockwise (1), or automatic (2) based on value being positive (CW) or negative (CCW). */
    direction: ArcDrawDirection = ArcDrawDirection.CW;

    constructor(init?: PartialDeep<EllipsePath>) {
        super();
        assignExistingProperties(this, init, 1);
    }

    /** Returns true if the diameter on either axis is empty (width or height are zero) */
    get isEmpty(): boolean {
        return !this.width.value || !this.height.value;
    }

    // IValuedElement
    /** Sets the ending angle of the arc using evaluated string value. */
    setValue(value: string) {
        this.endAngle = round6p((evaluateValue(value) - 90) * M.D2R);
    }

    loadFromActionData(state: ParseState, statePrefix: string = Act.IconEllipse): EllipsePath
    {
        const dr = state.asRecord(state.pos, statePrefix + Str.IdSep);
        super.loadFromDataRecord(dr);
        if (dr.start)
            this.startAngle = round6p((evaluateValue(dr.start) - 90) * M.D2R);
        if (dr.end)
            this.setValue(dr.end);
        if (dr.rotate)
            this.rotation = round5p(evaluateValue(dr.rotate) * M.D2R);
        if (dr.dir)
            this.direction = parseArcDirection(dr.dir);
        // console.dir(this);
        return this;
    }

    // IPathProducer
    /** Returns the ellipse as a `Path2D` object, scaled to fit into `rect` bounds (if size units are relative), and combined
        with any paths in the `pathStack` according to value of the {@link operation} property. */
    getPath(rect: Rectangle, pathStack: Array<Path2D>): Path2D
    {
        if (rect.isEmpty)
            return new Path2D();

        const path = new Path2D(),
            bounds: Rectangle = super.computeBounds(rect),
            rX = round4p(bounds.width * .5),
            rY = round4p(bounds.height * .5),
            ctr = Point.plus(bounds.origin, rX, rY),
            ccw = this.direction == ArcDrawDirection.CCW || (this.direction == ArcDrawDirection.Auto && this.endAngle < this.startAngle);

        path.ellipse(ctr.x, ctr.y, rX, rY, this.rotation, this.startAngle, this.endAngle, ccw);
        return super.getCombinedPath(path, pathStack);
    }
}

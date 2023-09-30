
import { ILayerElement, IPathProducer, IValuedElement } from '../interfaces';
import { ParseState, Path2D } from '../';
import { Point, Rectangle } from '../geometry';
import { evaluateValue, round4p, round5p, round6p } from '../../utils';
import { Act, M, Str } from '../../utils/consts'
import Path from './Path';

const enum DrawDirection { CW, CCW }

/** Creates a full or partial ellipse/circle/arc path of given diameter, start and end angle values,
    draw direction, and optional rotation around center. Essentially a proxy for `Path2D.ellipse()` method.
    The `IValuedElement::setValue()` interface sets the arc's ending angle, for lack of anything more obvious.  */
export default class EllipsePath extends Path implements ILayerElement, IPathProducer, IValuedElement
{
    // all angles stored as radians; start and end are adjusted -90° from user-specified value (so 0° points north instead of east)
    startAngle: number = 0;
    endAngle: number = 0;
    rotation: number = 0;
    direction: DrawDirection = DrawDirection.CW;

    // constructor(init?: Partial<EllipsePath> | any) { super(init); assignExistingProperties(this, init, 0); }

    // ILayerElement
    readonly type: string = "EllipsePath";

    /** Returns true if the diameter on either axis is empty (width or height are zero) */
    get isEmpty(): boolean {
        return !this.width.value || !this.height.value;
    }

    /** Sets the ending angle of the arc. */
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
            this.direction = dr.dir.startsWith("Clock") ? DrawDirection.CW : DrawDirection.CCW;
        // console.dir(this);
        return this;
    }

    // IPathProducer
    getPath(rect: Rectangle, pathStack: Array<Path2D>): Path2D
    {
        if (rect.isEmpty)
            return new Path2D();

        const path = new Path2D(),
            bounds: Rectangle = super.computeBounds(rect),
            rX = round4p(bounds.width * .5),
            rY = round4p(bounds.height * .5),
            ctr = Point.plus(bounds.origin, rX, rY);

        path.ellipse(ctr.x, ctr.y, rX, rY, this.rotation, this.startAngle, this.endAngle, this.direction == DrawDirection.CCW);
        return super.getCombinedPath(path, pathStack);
    }
}

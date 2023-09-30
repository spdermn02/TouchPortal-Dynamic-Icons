
import { Alignment, Point, PointType, Rectangle, SizeType, TpActionDataRecord, UnitValue } from '../';
import { assignExistingProperties, evaluateValue, parseAlignmentFromValue, round4p } from '../../utils';

/** Base class for any element needing size, alignement, and offset properties. Not drawable on its own. */
export default class SizedElement
{
    /** A zero width/height (default) indicates to draw into the full available image area (eg. passed to `render()` in `rect` argument). Negative values are not allowed. */
    width: UnitValue = new UnitValue(0, "%");
    height: UnitValue = new UnitValue(0, "%");
    /** How to align within drawing area if/when `width`/`height` doesn't fill it completely. */
    alignment: Alignment = Alignment.CENTER;
    /** Extra position offset to apply after alignment. */
    offset: PointType = Point.new();

    constructor(init?: Partial<SizedElement> | any) {
        assignExistingProperties(this, init, 1);
    }

    /** Always returns false since a zero size will actually fill a drawing area. */
    get isEmpty(): boolean {
        return false;
    }

    /** Returns true if any properties were changed. */
    protected loadFromDataRecord(dr: TpActionDataRecord): boolean
    {
        let dirty: boolean = false;
        let tmp: number, a: Alignment;
        for (const [key, value] of Object.entries(dr)) {
            switch (key) {
                case 'size_w':
                    tmp = evaluateValue(value);
                    if (tmp > 0 && tmp != this.width.value) {
                        this.width.value = tmp;
                        dirty = true;
                    }
                    break;
                case 'size_w_unit':
                    if (value != this.width.unit) {
                        this.width.setUnit(value);
                        dirty = true;
                    }
                    break;
                case 'size_h':
                    tmp = evaluateValue(value);
                    if (tmp > 0 && tmp != this.height.value) {
                        this.height.value = tmp;
                        dirty = true;
                    }
                    break;
                case 'size_h_unit':
                    if (value != this.height.unit) {
                        this.height.setUnit(value);
                        dirty = true;
                    }
                    break;
                case 'alignH':
                    a = parseAlignmentFromValue(value, Alignment.H_MASK);
                    if (a != (this.alignment & Alignment.H_MASK)) {
                        this.alignment &= ~Alignment.H_MASK;
                        this.alignment |= a;
                        dirty = true;
                    }
                    break;
                case 'alignV':
                    a = parseAlignmentFromValue(value, Alignment.V_MASK);
                    if (a != (this.alignment & Alignment.V_MASK)) {
                        this.alignment &= ~Alignment.V_MASK;
                        this.alignment |= a;
                        dirty = true;
                    }
                    break;
                case 'ofsH':
                    tmp = evaluateValue(value);
                    if (tmp != this.offset.x) {
                        this.offset.x = tmp;
                        dirty = true;
                    }
                    break;
                case 'ofsV':
                    tmp = evaluateValue(value);
                    if (tmp != this.offset.y) {
                        this.offset.y = tmp;
                        dirty = true;
                    }
                    break;

                default:
                    continue;
            }
            delete dr[key];  // remove handled property for quicker downstream operation
        }
        // console.dir(this);
        return dirty;
    }

    protected computeAlignmentHOffset(width: number, rect: Rectangle): number
    {
        if (width < rect.width) {
            switch (this.alignment & Alignment.H_MASK) {
                case Alignment.HCENTER:
                    return round4p((rect.width - width) * .5);
                case Alignment.RIGHT:
                    return rect.width - width;
            }
        }
        return 0;
    }

    protected computeAlignmentVOffset(height: number, rect: Rectangle): number
    {
        if (height < rect.height) {
            switch (this.alignment & Alignment.V_MASK) {
                case Alignment.VCENTER:
                    return round4p((rect.height - height) * .5);
                case Alignment.BOTTOM:
                    return rect.height - height;
            }
        }
        return 0;
    }

    protected computeOffset(bounds: SizeType, rect: Rectangle): PointType
    {
        const ret = Point.new(this.computeAlignmentHOffset(bounds.width, rect), this.computeAlignmentVOffset(bounds.height, rect));
        if (this.offset.x)
            ret.x += round4p(this.offset.x * .01 * rect.width);
        if (this.offset.y)
            ret.y += round4p(this.offset.y * .01 * rect.height);
        return ret;
    }

    protected computeBounds(rect: Rectangle): Rectangle
    {
        if (rect.isEmpty)
            return rect;

        let bounds: Rectangle = rect.clone();  // the area to draw into, may need to be adjusted

        // If this instance specifies a size in either dimension, these override the drawing area size.
        // We can also adjust the alignment within the drawing area if one of the final dimensions is smaller.
        if (this.width.value && !(this.width.isRelative && this.width.value == 100))
            bounds.width = this.width.isRelative ? round4p(this.width.value * .01 * rect.size.width) : this.width.value;
        if (this.height.value && !(this.height.isRelative && this.height.value == 100))
            bounds.height = this.height.isRelative ? round4p(this.height.value * .01 * rect.size.height) : this.height.value;

        bounds.origin.plus_eq(this.computeOffset(bounds.size, rect));
        return bounds;
    }
}

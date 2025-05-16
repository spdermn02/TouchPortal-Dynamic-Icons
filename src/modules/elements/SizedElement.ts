
import { Alignment, Point, Rectangle, UnitValue, Vect2d } from '../';
import { ALIGNMENT_ENUM_NAMES } from '../../utils/consts';
import { assignExistingProperties, evaluateValue, parseAlignmentFromValue, parseAlignmentsFromString, round4p } from '../../utils';

export type SizedElementInit = PartialDeep<SizedElement> & { width?: number|string, height?: number|string };

/** Base class for any element needing size, alignment, and offset properties. Not drawable on its own and cannot be created directly. */
export default class SizedElement
{
    /** A zero width/height (default) indicates to draw into the full available image area (eg. passed to `render()` in `rect` argument). Negative values are not allowed. */
    width: UnitValue = new UnitValue(0, "%");
    height: UnitValue = new UnitValue(0, "%");
    /** How to align within drawing area if/when `width`/`height` doesn't fill it completely. */
    alignment: Alignment = Alignment.CENTER;
    /** Extra position offset to apply after alignment. Expressed as a percentage of overall drawing area size. */
    offset = new Vect2d();

    protected constructor(init?: SizedElementInit) {
        if (!!init)
            this.init(init);
    }

    protected init(init?: SizedElementInit, depth = 1) {
        if (typeof init?.width == 'number')
            this.width.value = Math.abs(init.width);
        else if (typeof init?.width == 'string')
            this.width.setFromString(init.width);
        if (typeof init?.height == 'number')
            this.height.value = Math.abs(init.height);
        else if (typeof init?.height == 'string')
            this.height.setFromString(init.height);
        assignExistingProperties(this, init, depth, true);
    }

    /** Always returns false since a zero size will actually fill a drawing area. */
    get isEmpty(): boolean {
        return false;
    }

    /** Alignment value as two string values, first for vertical and second for horizontal. Eg. "top left" or "center middle".
        Setting the property can be done with either a single direction or both (separated by space or comma) in either order. */
    get align(): string {
         return ALIGNMENT_ENUM_NAMES[this.alignment & Alignment.V_MASK] + ' ' + ALIGNMENT_ENUM_NAMES[this.alignment & Alignment.H_MASK];
    }
    set align(value: string | Alignment) {
        if (typeof value == 'string')
            value = parseAlignmentsFromString(value);
        let mask = (value & Alignment.H_MASK) ? Alignment.H_MASK : Alignment.NONE;
        if (value & Alignment.V_MASK)
            mask |= Alignment.V_MASK;
        this.setAlignment(value, mask);
    }

    /** Horizontal alignment value as string. One of: 'left', 'center', 'right' */
    get halign(): CanvasTextAlign { return ALIGNMENT_ENUM_NAMES[this.alignment & Alignment.H_MASK]; }
    set halign(value: CanvasTextAlign | Alignment) {
        if (typeof value == 'string')
            value = parseAlignmentFromValue(value, Alignment.H_MASK);
        this.setAlignment(value, Alignment.H_MASK);
    }

    /** Vertical alignment value as string. One of: 'top', 'middle', 'bottom' */
    get valign(): CanvasTextBaseline { return ALIGNMENT_ENUM_NAMES[this.alignment & Alignment.V_MASK]; }
    set valign(value: CanvasTextBaseline | Alignment) {
        if (typeof value == 'string')
            value = parseAlignmentFromValue(value, Alignment.V_MASK);
        this.setAlignment(value, Alignment.V_MASK);
    }

    /** Sets element width and height property values with optional unit type specifier to use for both dimensions.
        If `unit` is undefined then the current unit types for each dimension remain unchanged. */
    setSize(size: SizeType, unit?: string, unitY?: string) {
        this.width.value = size.width;
        this.height.value = size.height;
        if (unit) {
            this.width.setUnit(unit);
            this.height.setUnit(unitY || unit);
        }
    }

    /** Returns actual pixel width of this element, either scaled to `viewWidth` if width unit is `%`
        or actual width value if it is in pixels already. If this element's width value is zero then return `viewWidth`. */
    actualWidth(viewWidth: number) {
        if (!this.width.value || (this.width.isRelative && this.width.value == 100))
            return viewWidth;
        if (!this.width.isRelative)
            return this.width.value;
        return round4p(this.width.value * .01 * viewWidth);
    }

    /** Returns actual pixel height of this element, either scaled to `viewHeight` if height unit is `%`
        or actual height value if it is in pixels already. If this element's height value is zero then return `viewHeight`. */
    actualHeight(viewHeight: number) {
        if (!this.height.value || (this.height.isRelative && this.height.value == 100))
            return viewHeight;
        if (!this.height.isRelative)
            return this.height.value;
        return round4p(this.height.value * .01 * viewHeight);
    }

    /** Returns actual pixel width and height of this element, potentially scaled to `viewSize`.
        See {@link actualWidth} and {@link actualHeight} for details on returned values. */
    actualSize(viewSize: SizeType): SizeType {
        return { width: this.actualWidth(viewSize.width), height: this.actualHeight(viewSize.height) };
    }

    /** Returns true if alignment value was changed, false otherwise. */
    protected setAlignment(value: Alignment, mask: Alignment): boolean {
        if ((this.alignment & mask) != value) {
            this.alignment &= ~mask;
            this.alignment |= value;
            return true;
        }
        return false;
    }

    /** Returns true if any properties were changed. */
    protected loadFromDataRecord(dr: TpActionDataRecord): boolean
    {
        let dirty: boolean = false;
        let tmp: number;
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
                    dirty = this.setAlignment(parseAlignmentFromValue(value, Alignment.H_MASK), Alignment.H_MASK) || dirty;
                    break;
                case 'alignV':
                    dirty = this.setAlignment(parseAlignmentFromValue(value, Alignment.V_MASK), Alignment.V_MASK) || dirty;
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

    protected computeAlignmentHOffset(bounds: Rectangle, rect: Rectangle, adjustLeft: boolean = false): number
    {
        if (bounds.width != rect.width) {
            switch (this.alignment & Alignment.H_MASK) {
                case Alignment.HCENTER:
                    return rect.center.x - bounds.center.x;
                case Alignment.RIGHT:
                    return rect.right - bounds.right;
                case Alignment.LEFT:
                    if (adjustLeft)
                        return rect.left - bounds.left;
                    break;
            }
        }
        return 0;
    }

    protected computeAlignmentVOffset(bounds: Rectangle, rect: Rectangle, adjustTop: boolean = false): number
    {
        if (bounds.height != rect.height) {
            switch (this.alignment & Alignment.V_MASK) {
                case Alignment.VCENTER:
                    return rect.center.y - bounds.center.y;
                case Alignment.BOTTOM:
                    return rect.bottom - bounds.bottom;
                case Alignment.TOP:
                    if (adjustTop)
                        return rect.top - bounds.top;
                    break;
            }
        }
        return 0;
    }

    protected computeOffset(bounds: Rectangle, rect: Rectangle, adjustTopLeft: boolean = false): PointType
    {
        const ret = Point.new(
            this.computeAlignmentHOffset(bounds, rect, adjustTopLeft),
            this.computeAlignmentVOffset(bounds, rect, adjustTopLeft)
        );
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

        // If this instance specifies a size in either dimension, these override the drawing area size.
        // We can also adjust the alignment within the drawing area if one of the final dimensions is smaller.
        const bounds = new Rectangle(rect.origin, this.actualSize(rect.size));
        return bounds.translate(this.computeOffset(bounds, rect));
    }
}

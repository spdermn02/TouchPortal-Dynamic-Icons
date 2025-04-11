
import { LayerRole, Orientation, ParseState, Path2D, Size, UnitValue, ColorUpdateType } from '../';
import { assignExistingProperties, clamp, evaluateValue, round3p } from '../../utils'
import { Act, Str } from '../../utils/consts'
import { DrawingStyle } from './';
import StyledRectangle from './StyledRectangle';
import type { IColorElement, ILayerElement, IValuedElement } from '../interfaces';
import type { Rectangle, RenderContext2D, SizeType } from '../';

const enum DrawDirection {
    /** Left to right or bottom to top. */
    Normal,
    /** Right to left or top to bottom. */
    Reverse,
    /** Draw from center in both directions at the same time. */
    Center,
    /** Draw from center with direction depending on current value's sign,
        towards left/bottom for negative values or to right/top for positive ones. TODO */
    CenterAuto,
};

/** A progress bar is essentially two rectangles, one inside the other, with the inner one changing length to represent a percentage value.
    The outer container and inner value boxes can be fully styled with the embedded `DrawingStyle` properties.
    This class inherits from `StyledRectangle` which is used for the outer container box, and holds additional properties to control the
    inner value part.  Any corner radius set on the outer container box will also be applied to the inner value part (after some adjustments for size).
*/
export default class LinearProgressBar extends StyledRectangle implements ILayerElement, IValuedElement, IColorElement
{
    orientation: Orientation = Orientation.H;
    direction: DrawDirection = DrawDirection.Normal;
    /** Styling properties for the inner value part of the progress bar. The outer container is styled by the parent's {@link StyledRectangle#style} property. */
    valueStyle: DrawingStyle;
    /** Progress bar value in percent, 0-100. */
    value: number = 0;
    /** Padding controls how much space to leave around the outside of the progress bar relative to the total drawing area.
        It determines the final size of the progress bar based on orientation. With `width` value determines padding along
        the long edges of the bar, and `height` sets the padding around the endpoints (short edges). */
    padding: SizeType = new Size();

    constructor(init?: Partial<LinearProgressBar>) {
        super();
        this.valueStyle = new DrawingStyle(init?.valueStyle);
        assignExistingProperties(this, init, 1);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    // IValuedElement
    /** Sets current {@link LinearProgressBar#value} property using an evaluated string. */
    setValue(value: string) { this.value = clamp(evaluateValue(value), 0, 100); }

    // IColorElement
    /** @internal */
    setColor(value: string, type: ColorUpdateType): void {
        if (type & ColorUpdateType.Foreground)
            this.valueStyle.setColor(value, ColorUpdateType.Fill);
        else
            this.style.setColor(value, type);
    }

    /** Returns true if there is nothing to draw: size is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return super.isEmpty && this.valueStyle.isEmpty;
    }

    /** @internal */
    loadFromActionData(state: ParseState): LinearProgressBar {
        const dr = state.asRecord(state.pos, "pbar_");
        let dirty = false;
        for (const [key, value] of Object.entries(dr)) {
            switch (key)
            {
                case 'dir':
                    // defaults
                    this.orientation = Orientation.H;  // horizontal
                    this.direction = DrawDirection.Normal;    // LR/BT/CTR
                    switch (value.charAt(0)) {
                        case '⬅':
                            this.direction = DrawDirection.Reverse;
                            break;

                        // @ts-ignore
                        case '⬇':
                            this.direction = DrawDirection.Reverse;
                            // fallthrough
                        case '⬆':
                            this.orientation = Orientation.V;
                            break;

                        // @ts-ignore
                        case '↕':
                            this.orientation = Orientation.V;
                            // fallthrough
                        case '⟺':
                            this.direction = DrawDirection.Center;
                            break;
                    }
                    break; // 'dir

                // note that these size properties are not used the same way as the parent's size --
                // here they control padding, and the parent's actual size is set at render time.
                case 'size_w': {
                    const sz = evaluateValue(value);
                    if (sz > 0)
                        this.padding.width = sz * 2;
                    break;
                }
                case 'size_w_unit':
                    this.width.setUnit(value);
                    break;
                case 'size_h': {
                    const sz = evaluateValue(value);
                    if (sz > 0)
                        this.padding.height = sz * 2;
                    break;
                }
                case 'size_h_unit':
                    this.height.setUnit(value);
                    break;
                case 'radius':
                    dirty = super.parseRadius(value) || dirty;
                    break;
                case 'radius_unit':
                    if (UnitValue.isRelativeUnit(value) != this.radiusIsRelative) {
                        this.radiusIsRelative = !this.radiusIsRelative;
                        dirty = true;
                    }
                    break;
                case 'value':
                    this.setValue(value);
                    break;

                default:
                    continue;
            }
            delete dr[key];  // remove handled property for quicker downstream operation
        }
        this.valueStyle.loadFromDataRecord(ParseState.splitRecordKeys(dr, 'val_' + Act.IconStyle + Str.IdSep, true));
        // check shadow dimensions and line width for changes
        dirty = this.style.loadFromDataRecord(ParseState.splitRecordKeys(dr, 'ctr_' + Act.IconStyle + Str.IdSep)) || dirty;
        // console.dir(this);
        if (dirty)
            this.clearCahe();
        return this;
    }

    // ILayerElement
    render(ctx: RenderContext2D, rect: Rectangle): void
    {
        if (this.isEmpty)
            return;

        const newSize: SizeType = Size.new(this.width.value, this.height.value);
        if (this.orientation == Orientation.H) {
            // rect width needs endpoint padding, which is padding.height
            newSize.width = this.height.isRelative ? 100 - this.padding.height : rect.width - this.padding.height;
            newSize.height = this.width.isRelative ? 100 - this.padding.width : rect.height - this.padding.width;
        }
        else {
            // rect width needs side padding, which is padding.width
            newSize.width = this.width.isRelative ? 100 - this.padding.width : rect.width - this.padding.width;
            newSize.height = this.height.isRelative ? 100 - this.padding.height : rect.height - this.padding.height;
        }
        if (this.width.value != newSize.width || this.height.value != newSize.height) {
            this.width.value = newSize.width;
            this.height.value = newSize.height;
            this.clearCahe();
        }

        // Draw the container area using parent class.
        const window: Rectangle = super.renderImpl(ctx, rect);  // the area to draw into

        // nothing else to do unless we have a non-zero value
        if (!this.value || window.isEmpty)
            return;

        // Draw the value area

        // save container's size, we might use this later for alignment and to scale the radius.
        const ctrRect = window.clone();

        let penW: number = 0;
        if (!this.valueStyle.stroke.isEmpty) {
            // adjust for pen size
            if (this.valueStyle.stroke.width.isRelative)
                this.valueStyle.stroke.widthScale = Math.min(window.width, window.height) * .005 /* penScale */;
            penW = this.valueStyle.stroke.scaledWidth;
            window.adjust(round3p(penW * .5), -penW);
        }
        // set value part length (width/height) and offset position for drawing
        // which are both based on orientation and direction.
        if (this.orientation == Orientation.H) {
            // horizontal bar
            window.width = round3p(window.width * this.value * .01);
            if (window.width < 1)
                return;
            if (this.direction == DrawDirection.Reverse)  // align right
                window.x += ctrRect.width - window.width - penW;
            else if (this.direction == DrawDirection.Center)
                window.x += round3p((ctrRect.width - window.width - penW) * .5);
        }
        else {
            // vertical bar
            window.height = round3p(window.height * this.value * .01);
            if (window.height < 1)
                return;
            if (this.direction == DrawDirection.Normal)  // align bottom
                window.y += ctrRect.height - window.height - penW;
            else if (this.direction == DrawDirection.Center)
                window.y += round3p((ctrRect.height - window.height - penW) * .5);
        }
        //console.debug("Size", this.size.toString(), "Rect", rect.toString(), "CtrRect", ctrRect.toString(), "Window", window.toString(), "Pen", penW);

        const path = new Path2D();
        if (this.haveRadius) {
            // if the container has a border then expand the value drawing area by a portion of it, or at least one pixel,
            // to slightly overlap the content area... looks better this way because the radii will never quite match up perfectly.
            if (penW && !this.valueStyle.stroke.isEmpty) {
                const ctrPenW = this.style.stroke.scaledWidth,
                    d = Math.max(round3p(ctrPenW * .2), .5);
                window.adjust(-d, d * 2);
                penW += ctrPenW;  // we use this below to scale the radius
            }

            // Scale the radius to compensate for the smaller size along the value area's constant dimension, taking orientation and borders into account.
            // This way the radius is reduced proportionally and we don't get ugly "empty" corners between the outer border radius and the inner.
            // Make sure the radii don't go negative, though... that throws an exception.
            let ratio: number;
            if (this.radiusIsRelative)
                ratio = Math.max(((this.orientation == Orientation.H ? ctrRect.width + window.height : window.width + ctrRect.height) - penW * 4) * .005, 0);
            else if (this.orientation == Orientation.H)
                ratio = Math.max((window.height - penW * 4) / ctrRect.height, 0);
            else
                ratio = Math.max((window.width - penW * 4) / ctrRect.width, 0);
            path.roundRect(window.x, window.y, window.width, window.height, this.scaledRadii(ratio));
        }
        // no radius
        else {
            path.rect(window.x, window.y, window.width, window.height);
        }

        this.valueStyle.renderPath(ctx, path);

    }
}

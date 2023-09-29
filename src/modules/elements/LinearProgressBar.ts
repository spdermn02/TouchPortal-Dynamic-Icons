
import { ILayerElement, IValuedElement } from '../interfaces';
import { Orientation, ParseState, Path2D, Rectangle, RenderContext2D, SizeType, Size, UnitValue } from '../';
import { evaluateValue } from '../../utils'
import { StyledRectangle, DrawingStyle } from './';

const enum DrawDirection { Normal, Reverse, Center };

// Draws a rectangle shape on a canvas context with optional radii applied to any/all of the 4 corners (like CSS). The shape can be fully styled with the embedded DrawingStyle property.
export default class LinearProgressBar extends StyledRectangle implements ILayerElement, IValuedElement
{
    orientation: Orientation = Orientation.H;
    direction: DrawDirection = DrawDirection.Normal;
    valueStyle: DrawingStyle = new DrawingStyle();
    value: number = 0;  // % of extents, 0 - 100 range only

    private padding: SizeType = Size.new();  // width = sides, height = endpoints

    constructor(init?: Partial<LinearProgressBar>) {
        super();
        Object.assign(this, init);
    }

    // ILayerElement
    readonly type: string = "LinearProgressBar";
    // IValuedElement
    setValue(value: string) { this.value = Math.min(Math.max(evaluateValue(value), 0), 100); }

    /** Returns true if there is nothing to draw: size is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
    get isEmpty(): boolean {
        return super.isEmpty && this.valueStyle.isEmpty;
    }

    loadFromActionData(state: ParseState): LinearProgressBar
    {
        let atEnd = false,
            ctrStyleParsed = false,
            valStyleParsed = false;
        for (const e = state.data.length; state.pos < e && !atEnd; ) {
            const data = state.data[state.pos];
            const dataType = data.id.split('pbar_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType)
            {
                case 'dir':
                    // defaults
                    this.orientation = Orientation.H;  // horizontal
                    this.direction = DrawDirection.Normal;    // LR/BT/CTR
                    switch (data.value.charAt(0)) {
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

                case 'size_w': {
                    const sz = evaluateValue(data.value);
                    if (sz > 0)
                        this.padding.width = sz * 2;
                    break;
                }
                case 'size_w_unit':
                    this.width.setUnit(data.value);
                    break;

                case 'size_h': {
                    const sz = evaluateValue(data.value);
                    if (sz > 0)
                        this.padding.height = sz * 2;
                    break;
                }
                case 'size_h_unit':
                    this.height.setUnit(data.value);
                    break;

                case 'radius':
                    super.parseRadius(data.value);
                    break;

                case 'radius_unit':
                    this.radiusIsRelative = UnitValue.isRelativeUnit(data.value);
                    break;

                case 'value':
                    this.setValue(data.value);
                    break;

                default:
                    if (!ctrStyleParsed && dataType?.startsWith('ctr_')) {
                        this.style.loadFromActionData(state, 'ctr_');
                        ctrStyleParsed = true;
                    }
                    else if (!valStyleParsed && dataType?.startsWith('val_')) {
                        this.valueStyle.loadFromActionData(state, 'val_');
                        valStyleParsed = true;
                    }
                    else {
                        atEnd = true;
                    }
                    continue;
            }
            ++state.pos;
        }
        //console.dir(this);
        return this;
    }

    // ILayerElement
    render(ctx: RenderContext2D, rect: Rectangle): void
    {
        if (this.isEmpty)
            return;

        if (this.orientation == Orientation.H) {
            // rect width needs endpoint padding, which is padding.height
            this.width.value = this.height.isRelative ? 100 - this.padding.height : rect.width - this.padding.height;
            this.height.value = this.width.isRelative ? 100 - this.padding.width : rect.height - this.padding.width;
        }
        else {
            // rect width needs side padding, which is padding.width
            this.width.value = this.width.isRelative ? 100 - this.padding.width : rect.width - this.padding.width;
            this.height.value = this.height.isRelative ? 100 - this.padding.height : rect.height - this.padding.height;
        }

        // Draw the container area using parent class.
        let window: Rectangle = super.renderImpl(ctx, rect);  // the area to draw into

        // nothing else to do unless we have a non-zero value
        if (!this.value || window.isEmpty)
            return;

        // Draw the value area

        // save container's size, we might use this later for alignment and to scale the radius.
        const ctrRect = window.clone();

        let penW: number = 0;
        if (!this.valueStyle.line.isEmpty) {
            // adjust for pen size
            if (this.valueStyle.line.width.isRelative)
                this.valueStyle.line.widthScale = Math.min(window.width, window.height) * .005 /* penScale */;
            penW = this.valueStyle.line.scaledWidth;
            //console.log("Before Pen", penW, window.toString(), rect.toString());
            window.adjust(penW * .5, -penW);
        }
        // set value part length (width/height) and offset position for drawing
        // which are both based on orientation and direction.
        if (this.orientation == Orientation.H) {
            // horizontal bar
            window.width *= this.value * .01;
            if (window.width < 1)
                return;
            if (this.direction == DrawDirection.Reverse)  // align right
                window.x += ctrRect.width - window.width - penW;
            else if (this.direction == DrawDirection.Center)
                window.x += (ctrRect.width - window.width - penW) * .5;
        }
        else {
            // vertical bar
            window.height *= this.value * .01;
            if (window.height < 1)
                return;
            if (this.direction == DrawDirection.Normal)  // align bottom
                window.y += ctrRect.height - window.height - penW;
            else if (this.direction == DrawDirection.Center)
                window.y += (ctrRect.height - window.height - penW) * .5;
        }
        //console.debug("Size", this.size.toString(), "Rect", rect.toString(), "CtrRect", ctrRect.toString(), "Window", window.toString(), "Pen", penW);

        const path = new Path2D();
        if (this.haveRadius) {
            // if the container has a border then expand the value drawing area by a portion of it, or at least one pixel,
            // to slightly overlap the content area... looks better this way because the radii will never quite match up perfectly.
            if (!this.style.line.isEmpty) {
                const ctrPenW = this.style.line.scaledWidth,
                    d = Math.max(ctrPenW * .2, 1);
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
            const radii = this.radii.map(r => r * ratio);
            path.roundRect(window.x, window.y, window.width, window.height, radii);
        }
        // no radius
        else {
            path.rect(window.x, window.y, window.width, window.height);
        }

        this.valueStyle.renderPath(ctx, path);

    }
}

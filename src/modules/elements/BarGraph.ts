import { ColorUpdateType, LayerRole, } from '../';
import { PluginSettings } from '../../common';
import { BrushStyle } from './';
import { assignExistingProperties, clamp, evaluateValue } from '../../utils';
import type { IColorElement, ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type { ContextFillStrokeType, ParseState, Rectangle, RenderContext2D } from '../';

/** Draws a values series as a basic vertical bar graph onto a canvas context. */
export default class BarGraph implements ILayerElement, IRenderable, IValuedElement, IColorElement
{
    barColor: BrushStyle = new BrushStyle("#FFA500FF")
    /** Width of each bar section, in pixels. */
    barWidth: number = 10
    backgroundColorOn: boolean = true
    backgroundColor: BrushStyle = new BrushStyle("#FFFFFFFF")
    /** Maximum width, in pixels, into which the bars need to fit (or height if an orientation option is added).
        Typically this is the size of the icon/image being drawn.
        Values that would cause the graph to draw beyond this extent are removed from the stored values array. */
    maxExtent: number = PluginSettings.defaultIconSize.width;

    #values: Array<[number, ContextFillStrokeType]> = []

    constructor(init?: Partial<BarGraph>) {
        assignExistingProperties(this, init, 1);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    /** Returns the currently stored numeric values as a new array.
        Values are represented as decimal percentages in the range of 0.0 - 1.0, inclusive. */
    get values(): Array<number> { return this.#values.map(v => v[0]); }

    /** Adds `value` to current array along with the current bar drawing style and
        shifts out old values if necessary based on available size and bar width.
        @param value Fractional percentage, 0.0 - 1.0. The given value is clamped to this range. */
    addValue(value: number) {
        this.#values.push([clamp(value, 0, 1), this.barColor.style])
        if (this.#values.length > ( this.maxExtent / this.barWidth ) + 1)
            this.#values.shift()
    }

    /** Clears all stored values. */
    clearValues() {
        this.#values.length = 0;
    }

    // IValuedElement
    /** Evaluates string value to a number, divides by 100 and calls (@link addValue} with the result. */
    setValue(value: string) {
        this.addValue(evaluateValue(value) / 100);
    }

    // IColorElement
    /** @internal */
    setColor(value: string, type: ColorUpdateType): void {
        switch (type) {
            case ColorUpdateType.Foreground:
                this.barColor.color = value;
                break;
            case ColorUpdateType.Background:
                this.backgroundColor.color = value;
                break;
        }
    }

    // ILayerElement
    /** @internal */
    loadFromActionData(state: ParseState): BarGraph {
        // the incoming data IDs should be structured with a naming convention
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const data = state.data[i];
            const dataType = data.id.split('bar_graph_').at(-1)  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'backround':   // note spelling; keep for BC
                    this.backgroundColorOn = (data.value === "On")
                    break
                case 'backround_color':   // note spelling; keep for BC
                    this.backgroundColor.color = data.value
                    break
                case 'color':
                    this.barColor.color = data.value
                    break
                case 'value':
                    this.setValue(data.value)
                    break
                case 'width':
                    this.barWidth = parseInt(data.value) || this.barWidth
                    break
                default:
                    i = e  // end the loop on unknown field
                    continue
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // IRenderable
    /** Draws the bar graph onto `ctx` using `rect` dimensions positioning the graph and scaling the height of the bars. */
    render(ctx: RenderContext2D, rect: Rectangle): void {
        if (!ctx)
            return
        ctx.save()
        if( this.backgroundColorOn && !this.backgroundColor.isEmpty) {
            ctx.fillStyle = this.backgroundColor.style
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
        }
        if (!this.barColor.isEmpty) {
            let x1 = rect.width - (this.#values.length * this.barWidth)
            this.#values.forEach((value) => {
                const length = Math.floor(rect.height * value[0])
                const y1 = rect.height - length
                ctx.fillStyle = value[1];
                ctx.fillRect(x1, y1, this.barWidth, length)
                x1 += this.barWidth
            })
        }
        ctx.restore()
    }
}

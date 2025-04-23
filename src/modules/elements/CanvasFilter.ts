import { evaluateStringValue } from '../../utils';
import { LayerRole } from '../';
import type { ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type { ParseState, RenderContext2D } from '../';

// Applies a filter string to a canvas context.
export default class CanvasFilter implements ILayerElement, IRenderable, IValuedElement
{
    filter: string = "";

    constructor(init?: Partial<CanvasFilter>) { Object.assign(this, init); }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    // returns true if filter string is empty
    get isEmpty(): boolean { return !this.filter; }

    // IValuedElement
    setValue(value: string) { this.filter = evaluateStringValue(value); }

    loadFromActionData(state: ParseState): CanvasFilter {
        let atEnd = false;
        // the incoming data IDs should be structured with a naming convention
        for (const e = state.data.length; state.pos < e && !atEnd; ) {
            const data = state.data[state.pos];
            const dataType = data.id.split('canvFilter_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'filter':
                    this.setValue(data.value);
                    break;

                default:
                    atEnd = true;  // end the loop on unknown data id
                    continue;
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // IRenderable
    render(ctx: RenderContext2D): void {
        if (!this.isEmpty)
            ctx.filter = this.filter;
    }
}

import { ILayerElement, IRenderable } from '../interfaces';
import { ParseState, RenderContext2D } from '../';

// Applies a globalCompositeOperation to a canvas context.
export default class CompositionMode implements ILayerElement, IRenderable
{
    mode: GlobalCompositeOperation = "source-over";

    readonly type: string = "CompositionMode";
    // returns true mode string is empty
    get isEmpty(): boolean { return !this.mode; }

    loadFromActionData(state: ParseState): CompositionMode {
        // the incoming data IDs should be structured with a naming convention
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const dataType = state.data[i].id.split('compMode_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'mode': {
                    const value = state.data[i].value.trim()
                    if (value)
                        this.mode = value as GlobalCompositeOperation;
                    break
                }
                default:
                    i = e;  // end the loop on unknown data id
                    continue;
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // ILayerElement
    render(ctx: RenderContext2D): void {
        if (!ctx || this.isEmpty)
            return;
        ctx.globalCompositeOperation = this.mode;
    }
}

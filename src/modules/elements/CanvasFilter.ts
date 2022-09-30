import { ILayerElement, RenderContext2D } from "../interfaces";
import { ParseState } from "../types";

// Applies a filter string to a canvas context.
export default class CanvasFilter implements ILayerElement
{
    filter: string = "";

    get type(): string { return "CanvasFilter"; }
    // returns true if filter string is empty
    get isEmpty(): boolean { return !this.filter; }

    loadFromActionData(state: ParseState): CanvasFilter {
        // the incoming data IDs should be structured with a naming convention
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const dataType = state.data[i].id.split('canvFilter_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'filter': {
                    this.filter = state.data[i].value.trim();
                    break;
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
        ctx.filter = this.filter;
    }
}

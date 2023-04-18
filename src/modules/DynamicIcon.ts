
import { ILayerElement } from "./interfaces";
import { Rectangle, SizeType, Vect2d } from "./types";
import { Canvas } from 'skia-canvas';
import Transformation, { TransformScope } from "./elements/Transformation";

// Stores a collection of ILayerElement types as layers and produces a composite image from all the layers when rendered.
export default class DynamicIcon
{
    /** the icon name is also used for the corresponding TP State ID */
    name: string = "";
    /** This is the size of one "tile" (see also `actualSize()`); For now these must be square due to TP limitation. */
    size: SizeType = { width: 256, height: 256 };
    /** Specifies an optional grid to split the final image into multiple parts before sending to TP. */
    tile: Vect2d = new Vect2d(1, 1);
    /** `true` if icon was explicitly created with a "New" action, will require a corresponding "Render" action to actually draw it. */
    delayGeneration: boolean = false;
    /** Whether to use GPU for rendering (on supported hardware). Passed to skia-canvas's Canvas::gpu property. */
    gpuRendering: boolean = true;
    /** Whether to use additional output compression before sending image state data to TP. */
    compressOutput: boolean = true;
    /** Indicates if any TP State(s) have been created for this icon. */
    stateCreated: boolean = false;
    /** Used while building a icon from TP layer actions to keep track of current layer being affected. */
    nextIndex: number = 0;
    /** The array of elements which will be rendered. */
    layers: ILayerElement[] = [];

    constructor(init?: Partial<DynamicIcon>) { Object.assign(this, init); }

    /** true if the image should be split into parts before delivery, false otherwise. Checks if either of `tile.x` or `tile.y` are `> 1`. */
    get isTiled() { return this.tile.x > 1 || this.tile.y > 1; }

    /** Calculates and returns actual pixel dimensions of this image, which is going to be the `size` property
        multiplied by the number of grid cells specified in `tile` property for each dimension.  */
    actualSize() : SizeType {
        return { width: this.size.width * this.tile.x, height: this.size.height * this.tile.y };
    }

    /** Formats and returns a TP State ID for a given tile coordinate. Format is '<icon.name>_<column>_<row>'
        'x' and 'y' of `tile` are assumed to be zero-based; coordinates used in the State ID are 1-based (so, 1 is added to x and y values of `tile`). */
    getTileStateId(tile: Vect2d | any) {
        return `${this.name}_${tile.x+1}_${tile.y+1}`;
    }

    async render() : Promise<Buffer> {
        try {
            const rect = Rectangle.createFromSize(this.actualSize());
            const ctx = new Canvas(rect.width, rect.height).getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.canvas.gpu = this.gpuRendering;

            for (let i = 0, e = this.layers.length; i < e; ++i) {
                const layer = this.layers[i];
                if (!layer)
                    continue;
                // First we need to examine any following layer item(s) to check for transform(s) which are meant to apply to the layer we're drawing now ('PreviousOne' scope).
                // This is because to transform what we're drawing, we need to actually transform the canvas first, before we draw our thing.
                // But for UI purposes it makes more sense to apply transform(s) after the thing one wants to transform. If we handle this on the action parsing side (index.ts or whatever),
                // we'd have to resize the layers array to insert transforms in the correct places and also keep track of when to reset the transform.
                let tx: Transformation | null = null;
                let resetTx = null;
                while (i+1 < this.layers.length && this.layers[i+1].type === 'Transformation' && (tx = this.layers[i+1] as Transformation)?.scope == TransformScope.PreviousOne) {
                    if (!resetTx)
                        resetTx = ctx.getTransform();
                    tx.render(ctx, rect);
                    ++i;
                }
                await layer.render(ctx, rect);
                // Reset any transform(s) which applied only to this layer.
                if (resetTx)
                    ctx.setTransform(resetTx);
            }
            return ctx.canvas.toBuffer('png');
        }
        catch (e) {
            console.error(e);
            return Buffer.from("")
        }

    };
}

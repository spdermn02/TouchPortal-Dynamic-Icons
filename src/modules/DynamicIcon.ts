
import { ILayerElement } from "./interfaces";
import { Rectangle, SizeType } from "./types";
import { Canvas } from 'skia-canvas';
import Transformation, { TransformScope } from "./elements/Transformation";

// Stores a collection of ILayerElement types as layers and produces a composite image from all the layers when rendered.
export default class DynamicIcon
{
    name: string = "";
    size: SizeType = { width: 256, height: 256 };
    delayGeneration: boolean = false;   //  true if icon was explicitly created with a "New" action, will require a corresponding "Render" action to actually draw it.
    stateCreated: boolean = false;     // TP State created for this icon
    nextIndex: number = 0;
    layers: ILayerElement[] = [];

    constructor(name: string, size:SizeType) {
        this.name = name;
        this.size = size;
    }

    async render() : Promise<Buffer> {
        try {
            let canvas = new Canvas(this.size.width, this.size.height);
            const ctx = canvas.getContext("2d");
            const rect = new Rectangle(0, 0, this.size.width, this.size.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // if (this.name === "DI_TC_Gauge") console.dir(this, {depth: 5, colors: true});
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
            const buff:Buffer = await ctx.canvas.toBuffer('png');
            canvas = undefined;
            return buff;
        }
        catch (e) {
            console.error(e);
            return Buffer.from("")
        }

    };
}

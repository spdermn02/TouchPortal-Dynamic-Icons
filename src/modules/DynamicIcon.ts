import sharp, { type CreateRaw } from 'sharp';   // for final result image compression
import { PluginSettings, TPClient } from '../common';
import {
    Canvas, LayerRole, logging, Rectangle, Size,
    Transformation, TransformScope
} from './';

import type {
    DOMMatrix,
    ILayerElement, IPathHandler, IPathProducer, IRenderable,
    Logger, SizeType, PointType, Path2D,
} from './';

type TxStackRecord = { tx: Transformation, startIdx: number }

// Stores a collection of ILayerElement types as layers and produces a composite image from all the layers when rendered.
export default class DynamicIcon
{
    /** the icon name is also used for the corresponding TP State ID */
    name: string = "";
    /** This is the size of one "tile" (see also `actualSize()`); For now these must be square due to TP limitation. */
    size: SizeType = Size.new(PluginSettings.defaultIconSize);
    /** Specifies an optional grid to split the final image into multiple parts before sending to TP. */
    tile: PointType = { x: 0, y: 0 };
    /** `true` if icon was explicitly created with a "New" action, will require a corresponding "Render" action to actually draw it. */
    delayGeneration: boolean = false;
    /** Whether to use GPU for rendering (on supported hardware). Passed to skia-canvas's Canvas::gpu property. */
    gpuRendering: boolean = PluginSettings.defaultGpuRendering;
    /** Used while building a icon from TP layer actions to keep track of current layer being affected. */
    nextIndex: number = 0;
    /** Flag to indicate early v1.2-alpha style tiling where the specified icon size was per tile instead of overall size. TODO: Remove  */
    sizeIsActual: boolean = true;
    /** The array of elements which will be rendered. */
    readonly layers: ILayerElement[] = [];
    // Options for the 'sharp' lib image compression. These are passed to sharp() when generating PNG results.
    // `compressionLevel` of `0` disables compression step entirely (sharp lib is never invoked).
    // See https://sharp.pixelplumbing.com/api-output#png for option descriptions.
    readonly outputCompressionOptions: any = {
        compressionLevel: PluginSettings.defaultOutputCompressionLevel,
        effort: 1,        // MP: 1 actually uses less CPU time than higher values (contrary to what sharp docs suggest) and gives slightly higher compression.
        palette: true     // MP: Again the docs suggest enabling this would be slower but my tests show a significant speed improvement.
    };

    private log: Logger;

    constructor(init?: Partial<DynamicIcon>) {
        Object.assign(this, init);
        this.log = logging().getLogger('icon');
    }

    /** true if the image should be split into parts before delivery, false otherwise. Checks if either of `tile.x` or `tile.y` are `> 1`. */
    get isTiled() { return this.tile.x > 1 || this.tile.y > 1; }

    /** Returns actual pixel dimensions of this image, which is either same as the `size` property if `sizeIsActual` is true,
        or otherwise the `size` property multiplied by the number of grid cells specified in `tile` property for each dimension.
        TODO: Remove
    */
    actualSize() : SizeType {
        return this.sizeIsActual ? this.size : { width: this.size.width * this.tile.x, height: this.size.height * this.tile.y };
    }

    /** Formats and returns a TP State ID for a given tile coordinate. Format is '<icon.name>_<column>_<row>'
        'x' and 'y' of `tile` are assumed to be zero-based; coordinates used in the State ID are 1-based (so, 1 is added to x and y values of `tile`). */
    getTileStateId(tile: PointType | any) {
        return `${this.name}_${tile.x+1}_${tile.y+1}`;
    }

    getTileStateName(tile: PointType) {
        return `${this.name} - Tile col. ${tile.x+1}, row ${tile.y+1}`
    }

    // Send TP State update with an icon's image data. The data Buffer is encoded to base64 before transmission.
    private sendStateData(stateId: string, data: Buffer | null) {
        if (data?.length) {
            // this.log.debug(`Sending data for icon state '${stateId}' with length ${data.length}`);
            TPClient.stateUpdate(stateId, data.toString("base64"));
        }
    }

    // Sends the canvas contents directly, w/out any compression or tiling.
    private sendCanvasImage(stateId: string, canvas: Canvas) {
        canvas.toBuffer('png')
        .then((data: Buffer) => this.sendStateData(stateId, data))
        .catch(e => this.log.error(`Exception while reading canvas buffer for icon '${self.name}': ${e}`) );
    }

    // Sends the canvas contents after re-compressing it with Sharp.
    private sendCompressedImage(canvas: Canvas) {
        const size = this.actualSize();
        const raw: CreateRaw = { width: size.width, height: size.height, channels: 4, premultiplied: true };
        canvas
        .toBuffer("raw" as any)
        .then((data: Buffer) => {
            sharp(data, { raw })
            .png(this.outputCompressionOptions)
            .toBuffer()
            .then((b: Buffer) => this.sendStateData(this.name, b) )
            .catch(e => this.log.error(`Sharp exception while loading image data for icon '${this.name}': ${e}`) );
        })
        .catch(e => this.log.error(`Skia exception while exporting data for icon '${this.name}': ${e}`) );
    }

    // Sends the canvas tiled, w/out compression.
    // While this isn't really any faster than using Skia anyway, it does use less CPU and/or uses GPU instead when that option is enabled.
    private sendCanvasTiles(canvas: Canvas) {
        const size = this.actualSize(),
            tileW = Math.ceil(size.width / this.tile.x),
            tileH = Math.ceil(size.height / this.tile.y);
        for (let y=0; y < this.tile.y; ++y) {
            for (let x=0; x < this.tile.x; ++x) {
                const tl = tileW * x,
                    tt = tileH * y,
                    tw = Math.min(tileW, size.width - tl),
                    th = Math.min(tileH, size.height - tt);
                try {
                    // Extract tile-sized part of the current canvas onto a new canvas which is the size of a tile.
                    const tileCtx = new Canvas(tw, th).getContext("2d");
                    // tileCtx.canvas.gpu = this.gpuRendering;
                    tileCtx.drawCanvas(canvas, tl, tt, tw, th, 0, 0, tw, th);
                    this.sendCanvasImage(this.getTileStateId({x: x, y: y}), tileCtx.canvas);
                }
                catch (e) {
                    this.log.error(`Exception for icon '${this.name}' while extracting tile ${x + y} at ${tl},${tt} of size ${tw}x${th} from icon ${Size.toString(size)}: ${e}`);
                }
            }
        }
    }

    // Send the canvas contents by breaking up into tiles using Sharp, with added compression.
    // Much more efficient than using the method in sendCanvasTiles() and then compressing each resulting canvas tile.
    private sendCompressedTiles(canvas: Canvas) {
        const size = this.actualSize(),
            tileW = Math.ceil(size.width / this.tile.x),
            tileH = Math.ceil(size.height / this.tile.y);
        const raw: CreateRaw = { width: size.width, height: size.height, channels: 4, premultiplied: true };
        canvas
        .toBuffer("raw" as any)
        .then((data: Buffer) => {
            for (let y=0; y < this.tile.y; ++y) {
                for (let x=0; x < this.tile.x; ++x) {
                    const tl = tileW * x,
                        tt = tileH * y,
                        tw = Math.min(tileW, size.width - tl),
                        th = Math.min(tileH, size.height - tt);
                    // extract image slice, encode PNG, and send the tile
                    sharp(data, { raw })
                    .extract({ left: tl, top: tt, width: tw, height: th })
                    .png(this.outputCompressionOptions)
                    .toBuffer()
                    .then((data: Buffer) => this.sendStateData(this.getTileStateId({x: x, y: y}), data) )
                    .catch(e => {
                        this.log.error(`Exception for icon '${this.name}' while extracting/compressing tile ${x + y} at ${tl},${tt} of size ${tw}x${th} from icon ${Size.toString(size)}: ${e}`);
                    });
                }
            }
        })
        .catch(e => this.log.error(`Sharp exception while loading image data for icon '${this.name}': ${e}`) );
    }

    async render() {
        try {
            const rect = Rectangle.fromSize(this.actualSize());
            const canvas = new Canvas(rect.width, rect.height);
            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            canvas.gpu = this.gpuRendering;

            const pathStack: Array<Path2D> = [];
            const activeTxStack: Array<TxStackRecord> = [];

            let layer: ILayerElement;
            let role: LayerRole;
            let tx: Transformation | null = null;
            let layerResetTx: DOMMatrix | null = null;

            for (let i = 0, e = this.layers.length; i < e; ++i) {
                layer = this.layers[i];
                if (!layer)
                    continue;

                // The layer "role" determines what we're going to do with it.
                role = layer.layerRole || LayerRole.Drawable;

                // First handle path producer/consumer and transform type layers.

                if (role & LayerRole.PathProducer) {
                    // producers may mutate the path stack by combining with previous path(s)
                    const path = (layer as IPathProducer).getPath(rect, pathStack);
                    pathStack.push(path);
                    // for (const atx of activeTxStack)
                    //     if (atx.startIdx == pathStack.length - 1)
                    //         atx.startIdx == ;
                }

                if (role & LayerRole.PathConsumer) {
                    // handlers will mutate the path stack
                    // apply any currently active "until reset" scope transforms here before the path is drawn or clipped
                    if (pathStack.length) {
                        for (const atx of activeTxStack) {
                            if (atx.startIdx < pathStack.length)
                                atx.tx.transformPaths(pathStack, ctx, rect, atx.startIdx);
                            atx.startIdx = 0;  // assumes the stack will be emptied... see below.
                        }
                    }
                    // now feed the handler
                    (layer as IPathHandler).renderPaths(pathStack, ctx, rect);
                    // All the consumers we have so far will snarf the whole path stack, so the following lines would be redundant.
                    // for (const atx of activeTxStack)
                    //     atx.startIdx = pathStack.length;
                }

                if (role & LayerRole.Transform) {
                    tx = (layer as Transformation);
                    switch (tx.scope) {
                        case TransformScope.Cumulative:
                            // transform the canvas before transforming paths
                            tx.render(ctx, rect);
                            break;

                        case TransformScope.PreviousOne:
                            // If we encounter this tx type in the layers here then it can only apply to a Path
                            // type layer since the canvas transforms would already be removed by the code below.
                            if (!pathStack.length)
                                // This would be a "mistake" on the user's part, putting a "previous layer" Tx after something like a style or clip. Which we don't handle gracefully at this time.
                                this.log.warn("A 'previous layer' scope transformation cannot be applied to layer %d of type '%s' for icon '%s'. ", i+1, this.layers.at(i-1)?.type, this.name);
                            break;

                        case TransformScope.UntilReset:
                            // Add to active list
                            activeTxStack.push({tx, startIdx: pathStack.length});
                            continue;  // do not transform any current paths

                        case TransformScope.Reset:
                            // Reset to no transform.
                            // apply any currently active transforms to paths which may not have been handled yet
                            const atx = activeTxStack.pop();
                            if (atx && pathStack.length && atx.startIdx < pathStack.length)
                                atx.tx.transformPaths(pathStack, ctx, rect, atx.startIdx);
                            continue;  // do not transform any further
                    }
                    if (pathStack.length) {
                        // this.log.trace('%O', activeTxStack);
                        for (const atx of activeTxStack) {
                            if (atx.startIdx < pathStack.length)
                                atx.tx.transformPaths(pathStack, ctx, rect, atx.startIdx);
                            atx.startIdx = pathStack.length;
                        }
                        tx.transformPaths(pathStack, ctx, rect);
                    }
                    continue;
                }

                // Anything past here will render directly to the canvas.
                if (!(role & LayerRole.Drawable))
                    continue;

                layerResetTx = null;

                // apply any "until reset" scope transforms; we do it like this to avoid double-transforming Paths.
                for (const atx of activeTxStack) {
                    if (!layerResetTx)
                        layerResetTx = ctx.getTransform();
                    atx.tx.render(ctx, rect);
                }

                // We need to examine any following layer item(s) to check for transform(s) which are meant to apply to the layer we're drawing now ('PreviousOne' scope).
                // This is because to transform what we're drawing, we need to actually transform the canvas first, before we draw our thing.
                // But for UI purposes it makes more sense to apply transform(s) after the thing one wants to transform. If we handle this on the action parsing side (index.ts or whatever),
                // we'd have to resize the layers array to insert transforms in the correct places and also keep track of when to reset the transform.
                while (i+1 < this.layers.length && (this.layers[i+1] instanceof Transformation) && (tx = this.layers[i+1] as Transformation).scope == TransformScope.PreviousOne) {
                    if (!layerResetTx)
                        layerResetTx = ctx.getTransform();
                    tx.render(ctx, rect);
                    ++i;
                }

                await (layer as IRenderable).render(ctx, rect);

                // Reset any transform(s) which applied only to this layer.
                if (layerResetTx)
                    ctx.setTransform(layerResetTx);
            }

            if (this.isTiled) {
                if (this.outputCompressionOptions.compressionLevel > 0)
                    this.sendCompressedTiles(canvas);
                else
                    this.sendCanvasTiles(canvas);
                return;
            }

            // Not tiled, send whole rendered canvas at once.

            if (this.outputCompressionOptions.compressionLevel > 0)
                this.sendCompressedImage(canvas);
            else
                this.sendCanvasImage(this.name, canvas);

        }
        catch (e: any) {
            this.log.error("ERROR", `Exception while rendering icon '${this.name}': ${e}\n${e.stack}`);
        }

    };
}

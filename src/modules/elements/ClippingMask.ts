
import { IPathHandler } from '../interfaces';
import { Canvas, LayerRole, ParseState, Path2D, Rectangle, RenderContext2D } from '../';
import { Act, DataValue, Str } from '../../utils/consts';
import { assignExistingProperties } from '../../utils';

/** The type of clipping to apply when using {@link ClippingMask} element. */
export const enum ClipAction {
    /** Apply clip using path fill area as the mask (clips out anything outside the path area). */
    Normal,
    /** Apply clip using inverse of path fill area as mask (clips out everything inside the path area). */
    Inverse,
    /** Reset any previously applied clipping. */
    Release,
}

/** Applies a `clip(path)` operation to the current canvas context using given path(s).
    The mask can optionally be inverted against a given rectangle (eg. the drawing area).
    It can also "release" a clipped canvas by redrawing the current contents onto a new unclipped canvas.
 */
export default class ClippingMask implements IPathHandler
{
    /** Type of clip to apply, or `ClipAction.Release` to remove clipping. */
    action: ClipAction = ClipAction.Normal;
    /** Fill rule to use when clipping using intersecting paths. One of: "evenodd" or "nonzero" */
    fillRule: CanvasFillRule = 'nonzero';

    constructor(init?: Partial<ClippingMask> ) {
        assignExistingProperties(this, init, 0);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.PathConsumer;

    /** @internal */
    loadFromActionData(state: ParseState): ClippingMask {
        let atEnd = false;
        // the incoming data IDs should be structured with a naming convention
        for (let e = state.data.length; state.pos < e && !atEnd; ) {
            const data = state.data[state.pos];
            const dataType = data?.id.split(Act.IconClip + Str.IdSep).at(-1);
            switch (dataType) {
                case 'action':
                    switch(data.value) {
                        case DataValue.ClipMaskInverse:
                            this.action = ClipAction.Inverse;
                            break;
                        case DataValue.ClipMaskRelease:
                            this.action = ClipAction.Release;
                            break;
                        case DataValue.ClipMaskNormal:
                        default:
                            this.action = ClipAction.Normal;
                            break;
                    }
                    break;
                case 'fillRule':
                    this.fillRule = data.value as CanvasFillRule;
                    break;
                default:
                    atEnd = true;
                    continue;  // do not increment position counter
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // IPathHandler
    /** Applies clipping mask to `ctx` using all paths in `paths` array if {@link action} property is `ClipAction.Normal` or `ClipAction.Inverse`.
        `rect` area is used to calculate an inverse clip.
        If {@link action} is `ClipAction.Release` then will remove any clipping on the `ctx` by redrawing it onto a fresh canvas of same size as `ctx.canvas`. */
    renderPaths(paths: Path2D[], ctx: RenderContext2D, rect: Rectangle): void
    {
        if (this.action == ClipAction.Release) {
            // To release a mask we redraw the current canvas onto a fresh unclipped one.
            // The other way to reset is to a saved context state before the clip and restore it after,
            // but then we'd be restoring some arbitrary state which may have transforms or whatnot applied.
            const tCtx = new Canvas(ctx.canvas.width, ctx.canvas.height).getContext('2d');
            tCtx.drawCanvas(ctx.canvas, 0, 0);
            ctx.reset();
            ctx.drawCanvas(tCtx.canvas, 0, 0);
            return;
        }

        // A path of the full drawing area for creating inverted masks.
        let invPath: Path2D | null = null;
        if (this.action == ClipAction.Inverse) {
            invPath = new Path2D();
            invPath.rect(rect.x, rect.y, rect.width, rect.height);
        }

        // Create masks from any paths in the stack.
        let path: Path2D;
        while (paths.length) {
            path = paths.shift()!;
            if (invPath)
                path = path.complement(invPath);
            ctx.clip(path, this.fillRule);
        }
    }

}

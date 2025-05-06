import { arraysMatchExactly, assignExistingProperties, parseNumericArrayString, } from '../../utils';
import { ColorUpdateType, LayerRole, ParseState } from '../';
import { BrushStyle, StrokeStyle, ShadowStyle } from './';
import { Act, Str } from '../../utils/consts';
import type { IColorElement, ILayerElement, IPathHandler } from '../interfaces';
import type { Path2D, Rectangle } from '..';

/** Applies a drawing style to a canvas context or `Path2D` objects, which includes all fill, stroke, and shadow attributes. */
export default class DrawingStyle implements ILayerElement, IPathHandler, IColorElement
{
    /** Style to apply as context `fillStyle` property. */
    fill: BrushStyle;
    /** Defines how to apply the fill style when filling `Path2D` paths. One of: "evenodd" or "nonzero" */
    fillRule: CanvasFillRule = 'nonzero';
    /** Styles to apply as context `strokeStyle`, `line*`, and `miterLimit` properties (and `setLineDash()` method). */
    stroke: StrokeStyle;
    /** Styles to apply as context `shadow*` properties. */
    shadow: ShadowStyle;
    /** When styling `Path2D` paths, the stroke is to be drawn on top of the fill if this property is `true`, otherwise it will draw under the fill
        (only half the line width will protrude around the filled area). */
    strokeOver: boolean = true;

    constructor(init?: PartialDeep<DrawingStyle> ) {
        this.fill = new BrushStyle(init?.fill);
        this.stroke = new StrokeStyle(init?.stroke);
        this.shadow = new ShadowStyle(init?.shadow);
        assignExistingProperties(this, init, 0);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.PathConsumer;

    /** Returns true if there is nothing at all to draw for this style: fill is transparent, stroke is zero size, and there is no shadow.  */
    get isEmpty(): boolean { return this.fill.isEmpty && this.stroke.isEmpty && this.shadow.isEmpty; }

    // IColorElement
    /** @internal */
    setColor(value: string, type: ColorUpdateType): void {
        // Even though ColorUpdateType is a bitfield flag, currently nothing is going to
        // update multiple properties at once, so we can shortcut here.
        switch (type) {
            case ColorUpdateType.Fill:
                this.fill.color = value;
                break;
            case ColorUpdateType.Stroke:
                this.stroke.pen.color = value;
                break;
            case ColorUpdateType.Shadow:
                this.shadow.color = value;
                break;
        }
    }

    /** @internal Returns `true` if stroke line width/unit or shadow properties have changed. */
    loadFromDataRecord(dr: TpActionDataRecord): boolean {
        let dirty = false;
        for (const [key, value] of Object.entries(dr)) {
            switch (key) {
                case 'fillColor':
                    this.fill.color = value;
                    break;
                case 'fillRule':
                    this.fillRule = <CanvasFillRule>value;
                    break;
                case 'strokeOver':
                    // "Stroke over", "Stroke under"
                    this.strokeOver = value.endsWith("over");
                    break;
                case 'shadowColor':
                    this.shadow.color = value;
                    break;
                case 'shadow': {
                    // shadow is specified as (blur [,offsetX[,offsetY]])
                    const s = [],
                        shadow = [this.shadow.blur, this.shadow.offset.x, this.shadow.offset.y];
                    if (parseNumericArrayString(value, s, 3)) {
                        this.shadow.blur = Math.max(s[0], 0);
                        if (s.length > 1)
                            this.shadow.offset.set(s[1], s[2]);
                        else
                            this.shadow.offset.set(0, 0);
                    }
                    else {
                        this.shadow.resetCoordinates();
                    }
                    dirty = !arraysMatchExactly(shadow, [this.shadow.blur, this.shadow.offset.x, this.shadow.offset.y])
                    break;
                }
                default:
                    continue;
            }
            delete dr[key];
        }
        dirty = this.stroke.loadFromDataRecord(ParseState.splitRecordKeys(dr, "line_")) || dirty;
        // console.dir(this);
        return dirty;
    }

    // ILayerElement
    /** @internal */
    loadFromActionData(state: ParseState, dataIdPrefix:string = ""): DrawingStyle {
        this.loadFromDataRecord(state.asRecord(state.pos, dataIdPrefix + Act.IconStyle + Str.IdSep));
        return this;
    }

    /** Applies current fill, stroke, and shadow styling properties to the given canvas `ctx`. `rect` size is used to scale relative-sized stroke width. */
    render(ctx: RenderContext2D, rect?: Rectangle): void {
        this.shadow.render(ctx);
        this.stroke.render(ctx, rect);
        this.fill.render(ctx);
    }

    // IPathHandler
    /** Fills and strokes each path in the given array using `DrawingStyle.renderPath()` method. **The given `paths` array is cleared.** */
    renderPaths(paths: Path2D[], ctx: RenderContext2D, rect: Rectangle): void {
        while (paths.length)
            this.renderPath(ctx, paths.shift()!, rect);
    }

    /** Fills and strokes the given path onto context using the current drawing style settings.
     * The context is saved before drawing and restored afterwards.
     * Any shadow is applied to fill layer, unless that is transparent, in which case it is applied on the stroke.
     * The stroke can be drawn under or on top of the fill, depending on the value of `strokeOver` property.
     * If a `rect` is given it will be passed on to StrokeStyle which will automatically scale itself if necessary.
     */
    renderPath(ctx: RenderContext2D, path: Path2D, rect?: Rectangle)
    {
        if (!path)
            return;
        const haveFill = !this.fill.isEmpty;
        const haveShadow = !this.shadow.isEmpty;

        ctx.save();

        if (!this.strokeOver)
            this.strokePath(ctx, path, haveShadow, rect)

        if (haveFill) {
            this.fill.render(ctx);
            if (haveShadow && this.strokeOver) {
                this.shadow.saveContext(ctx);
                this.shadow.render(ctx);
                ctx.fill(path, this.fillRule);
                this.shadow.restoreContext(ctx);
            }
            else {
                ctx.fill(path, this.fillRule);
            }
        }

        if (this.strokeOver)
            this.strokePath(ctx, path, haveShadow && !haveFill, rect)

        ctx.restore();
    }

    /** Draws just the current stroke (line) style onto the given path, with or w/out the current shadow (if any).
     * It does NOT save or restore full context, only shadow properties (if a shadow is used).
     */
    strokePath(ctx: RenderContext2D, path: Path2D, withShadow: boolean = false, rect?: Rectangle)
    {
        if (this.stroke.isEmpty)
            return;
        this.stroke.render(ctx, rect);
        if (withShadow) {
            this.shadow.saveContext(ctx);
            this.shadow.render(ctx);
            ctx.stroke(path);
            this.shadow.restoreContext(ctx);
        }
        else {
            ctx.stroke(path);
        }

    }

}

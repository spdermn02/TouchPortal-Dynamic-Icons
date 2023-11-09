import { assignExistingProperties, parseNumericArrayString, } from '../../utils';
import { IPathHandler, ILayerElement } from '../interfaces';
import { LayerRole, ParseState, Path2D, Rectangle, RenderContext2D } from '../';
import { BrushStyle, StrokeStyle, ShadowStyle } from './';
import { Act, Str } from '../../utils/consts';

// Applies a drawing style to a canvas context, which includes all fill, stroke, and shadow attributes.
export default class DrawingStyle implements ILayerElement, IPathHandler
{
    fill: BrushStyle;
    fillRule: CanvasFillRule = 'nonzero';
    line: StrokeStyle;
    shadow: ShadowStyle;
    strokeOver: boolean = true;  // the stroke is to be drawn on top of the fill if `true`, otherwise under the fill

    constructor(init?: Partial<DrawingStyle> | any ) {
        assignExistingProperties(this, init, 0);
        this.fill = new BrushStyle(init?.color);
        this.line = new StrokeStyle(init?.stroke);
        this.shadow = new ShadowStyle(init?.shadow);
    }

    // ILayerElement
    readonly type: string = "DrawingStyle";
    readonly layerRole: LayerRole = LayerRole.PathConsumer;

    /** Returns true if there is nothing at all to draw for this style: fill is transparent, stroke is zero size, and there is no shadow.  */
    get isEmpty(): boolean { return this.fill.isEmpty && this.line.isEmpty && this.shadow.isEmpty; }

    loadFromActionData(state: ParseState, dataIdPrefix:string = ""): DrawingStyle {
        dataIdPrefix += Act.IconStyle + Str.IdSep;
        let lineParsed = false;
        let atEnd = false;
        // the incoming data IDs should be structured with a naming convention
        for (let e = state.data.length; state.pos < e && !atEnd; ) {
            const data = state.data[state.pos];
            const dataType = data?.id.split(dataIdPrefix).at(-1);  // last part of the data ID determines its meaning
            //console.log(state.pos, dataType);
            switch (dataType) {
                case 'fillColor':
                    this.fill.color = data.value;
                    break;
                case 'fillRule':
                    this.fillRule = data.value as CanvasFillRule;
                    break;
                case 'strokeOver':
                    // "Stroke over", "Stroke under"
                    this.strokeOver = data.value.endsWith("over");
                    break;
                case 'shadowColor':
                    this.shadow.color = data.value;
                    break;
                case 'shadow': {
                    // shadow is specified as (blur [,offsetX[,offsetY]])
                    this.shadow.clear();
                    const s = [];
                    if (parseNumericArrayString(data.value, s, 3)) {
                        this.shadow.blur = Math.max(s[0], 0);
                        if (s.length > 1)
                            this.shadow.offset.set(s[1], s.length > 2 ? s[2] : s[1]);
                    }
                    break;
                }
                default:
                    if (!lineParsed && dataType?.startsWith('line_')) {
                        this.line.loadFromActionData(state, dataIdPrefix);
                        lineParsed = true;
                    }
                    else {
                        atEnd = true;
                    }
                    continue;  // do not increment position counter
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    render(ctx: RenderContext2D, rect?: Rectangle): void {
        this.shadow.render(ctx);
        this.line.render(ctx, rect);
        this.fill.render(ctx);
    }

    // IPathHandler
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
        if (this.line.isEmpty)
            return;
        this.line.render(ctx, rect);
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

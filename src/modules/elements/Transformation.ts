
import { ILayerElement, IRenderable } from '../interfaces';
import {
    Canvas, DOMMatrix, LayerRole, Path2D, ParseState, Point, PointType,
    Rectangle, RenderContext2D, Size, SizeType, TransformOpType
} from '../';
import { DEFAULT_TRANSFORM_OP_ORDER } from '../../utils/consts';
import { arraysMatchExactly, evaluateValue, fuzzyEquals4p, round4p /* , parsePointFromValue */ } from '../../utils';

export const enum TransformScope {
    PreviousOne,  // affects only the layer before the transform
    Cumulative,   // affects all previous layers drawn so far
    UntilReset,   // affects all layers until an empty transform (or end)
    Reset,        // resets one previous `UntilReset` transform
}

export default class Transformation implements ILayerElement, IRenderable
{
    // Coordinates are stored as decimals as used in matrix transform operations.
    rotate: number = 0; // percent of 360 degrees
    scale: PointType = Point.new(); // percent of requested image size (not the original source image), eg: 2.0 is double size, 0.5 is half size.
    translate: PointType = Point.new(); // percentage of relevant dimension of requested image size
                                        // eg: x = 1 translates one full image width to the right (completely out of frame for an unscaled source image)
    skew: PointType = Point.new(); // percent of requested image size (not the original source image)
    transformOrder: TransformOpType[] = DEFAULT_TRANSFORM_OP_ORDER;  // careful! reference... don't edit, replace entirely.
    scope: TransformScope = TransformScope.PreviousOne;

    private cache = {
        matrix: <DOMMatrix | null> null,
        origin: <PointType | null> null,
        size: <SizeType | null> null,
    }

    constructor(init?: Partial<Transformation>) { Object.assign(this, init); }

    // ILayerElement
    readonly type = "Transformation";
    readonly layerRole: LayerRole = LayerRole.Transform;

    get isEmpty(): boolean {
        return this.scope == TransformScope.Reset || (fuzzyEquals4p(this.rotate, 0) && Point.fuzzyIsNull(this.translate) && Point.fuzzyIsNull(this.skew) && !this.isScaling);
    }
    get isScaling(): boolean {
        return !Point.fuzzyEquals(this.scale, {x:100,y:100});
    }

    loadFromActionData(state: ParseState): Transformation {
        // the incoming data IDs should be structured with a naming convention
        // For properties with X,Y values, this currently can handle both single and double-field versions (X and Y are separate fields),
        // though currently no actions use the single field variant so this could be trimmed down if no use is found for that option.
        let atEnd = false, dirty = false, tmp;
        for (const e = state.data.length; state.pos < e && !atEnd;) {
            const data = state.data[state.pos];
            const dataType = data.id.split('tx_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'rot':
                    if (this.rotate != (tmp = evaluateValue(data.value))) {
                        this.rotate = tmp;
                        dirty = true;
                    }
                    break;
                case 'trsX':
                    if (this.translate.x != (tmp = evaluateValue(data.value))) {
                        this.translate.x = tmp;
                        dirty = true;
                    }
                    break;
                case 'trsY':
                    if (this.translate.y != (tmp = data.value.trim() ? evaluateValue(data.value) : this.translate.x)) {
                        this.translate.y = tmp;
                        dirty = true;
                    }
                    break;
                case 'sclX':
                    if (this.scale.x != (tmp = evaluateValue(data.value))) {
                        this.scale.x = tmp;
                        dirty = true;
                    }
                    break;
                case 'sclY':
                    if (this.scale.y != (tmp = data.value.trim() ? evaluateValue(data.value) : this.scale.x)) {
                        this.scale.y = tmp;
                        dirty = true;
                    }
                    break;
                case 'skwX':
                    if (this.skew.x != (tmp = evaluateValue(data.value))) {
                        this.skew.x = tmp;
                        dirty = true;
                    }
                    break;
                case 'skwY':
                    if (this.skew.y != (tmp = data.value.trim() ? evaluateValue(data.value) : this.skew.x)) {
                        this.skew.y = tmp;
                        dirty = true;
                    }
                    break;
                /* these 3 cases allow for X[,Y] coordinates to be specified in one data field, however they're currently unused by any action
                case 'trs':
                    Point.set(this.translate, parsePointFromValue(data.value));
                    break;
                case 'scl':
                    Point.set(this.scale, parsePointFromValue(data.value));
                    break;
                case 'skw':
                    Point.set(this.skew, parsePointFromValue(data.value));
                    break;
                */
                case 'order': {
                    if (data.value) {
                        const order = data.value.split(', ') as TransformOpType[];
                        if (!arraysMatchExactly(this.transformOrder, order)) {
                            this.transformOrder = order;
                            dirty = true;
                        }
                    }
                    break;
                }
                case 'scope': {
                    let scope: TransformScope | null = null;
                    // "previous layer", "all previous", "all following", "reset following"
                    if (data.value[0] == 'p')
                        scope = TransformScope.PreviousOne;
                    else if (data.value[4] == 'p')
                        scope = TransformScope.Cumulative;
                    else if (data.value[4] == 'f')
                        scope = TransformScope.UntilReset;
                    else if (data.value[0] == 'r')
                        scope = TransformScope.Reset;
                    if (scope && scope != this.scope) {
                        this.scope = scope;
                        dirty = true;
                    }
                    break;
                }
                default:
                    atEnd = true;
                    continue;
            }
            ++state.pos;
        }
        if (dirty)
            this.cache.matrix = null;
        // console.dir(this);
        return this;
    }

    /** Returns the current transform operations as a `DOMMatrix` which uses given `txOrigin` as origin point for rotatoin and scaling,
        and scales translations to `txArea` size.  The returned value may be a cached version if no properties have changed since the cache was created,
        and `txOrigin` and `txArea` are the same as the cache'd version. Using this method with a new arguments will regenerate the matrix and update the cache. */
    getMatrix(txOrigin: PointType, txArea: SizeType) {
        if (!this.cache.matrix || !this.cache.origin || !this.cache.size || !Point.fuzzyEquals(this.cache.origin, txOrigin) || !Size.fuzzyEquals(this.cache.size, txArea)) {
            this.cache.matrix = this.toMatrix(txOrigin, txArea);
            this.cache.origin = txOrigin;
            this.cache.size = txArea;
        }
        return this.cache.matrix;
    }

    /** Creates a DOMMatrix from the current transform options which uses given `txOrigin` as transform origin and scales translations to `txArea` size.
        This method does not use any cached matrix but always generates a new one. */
    toMatrix(txOrigin: PointType, txArea: SizeType): DOMMatrix {
        const m = new DOMMatrix();
        for (const op of this.transformOrder) {
            switch (op) {
                case TransformOpType.Rotate:
                    if (!fuzzyEquals4p(this.rotate, 0)) {
                        // rotate from origin point
                        m.translateSelf(txOrigin.x, txOrigin.y);
                        m.rotateSelf(0, 0, round4p(this.rotate * .01 * 360));
                        m.translateSelf(-txOrigin.x, -txOrigin.y);
                    }
                    break;
                case TransformOpType.Offset:
                    if (!Point.fuzzyIsNull(this.translate))
                        m.translateSelf(round4p(this.translate.x * .01 * txArea.width), round4p(this.translate.y * .01 * txArea.height), 0);
                    break;
                case TransformOpType.Scale:
                    if (this.isScaling)
                        m.scaleSelf(round4p(this.scale.x * .01), round4p(this.scale.y * .01), 0, txOrigin.x, txOrigin.y, 0);
                    break;
                case TransformOpType.Skew:
                    if (!fuzzyEquals4p(this.skew.x, 0))
                        m.skewXSelf(round4p(this.skew.x * .01));
                    if (!fuzzyEquals4p(this.skew.y, 0))
                        m.skewYSelf(round4p(this.skew.y * .01));
                    break;
            }
        }
        return m;
    }

    // ILayerElement
    // Applies current transform matrix to the given canvas context using `rect` coordinates for tx center origin and area.
    render(ctx: RenderContext2D, rect: Rectangle) : void {
         if (this.isEmpty)
            return;

        // For a cumulative ("everything above") type Tx we need to apply it to a new canvas/context and then afterwards we draw the original canvas on top.
        if (this.scope == TransformScope.Cumulative) {
            // Here we need to copy anything drawn previously onto the new transformed context/canvas.
            // It may be clever to just switch up the context reference that is getting passed around
            // to all the render() methods... but that just seems wrong on several levels.
            // Anyway it's pretty fast, tens of _micro_seconds, uncomment below to check.
            const tCtx = new Canvas(ctx.canvas.width, ctx.canvas.height).getContext('2d');
            tCtx.transform(this.getMatrix(rect.center, rect.size));
            // const st = process.hrtime();
            tCtx.drawCanvas(ctx.canvas, 0, 0);
            ctx.reset();
            ctx.drawCanvas(tCtx.canvas, 0, 0);
            // console.log(process.hrtime(st));
        }
        else {
            ctx.transform(this.getMatrix(rect.center, rect.size));
        }
    }

    // IPathHandler
    transformPaths(paths: Path2D[], _: RenderContext2D, rect: Rectangle, fromIdx: number = 0): void {
        const len = paths.length;
        if (!len || fromIdx < 0 || fromIdx >= len || this.isEmpty)
            return;

        if (this.scope == TransformScope.PreviousOne)
            fromIdx = len - 1;

        for ( ; fromIdx < len; ++fromIdx) {
            const path = paths[fromIdx];
            const bounds = path.bounds;
            const ctr = { x: round4p(bounds.left + bounds.width * .5), y: round4p(bounds.top + bounds.height * .5) };
            paths[fromIdx] = path.transform(this.getMatrix(ctr, rect.size));
        }
    }

}

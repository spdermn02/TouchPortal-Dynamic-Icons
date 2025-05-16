
import { Canvas, DOMMatrix, LayerRole, Point, Size, TransformOpType, Vect2d } from '../';
import { DEFAULT_TRANSFORM_OP_ORDER } from '../../utils/consts';
import { assignExistingProperties, arraysMatchExactly, evaluateValue, fuzzyEquals4p, round4p } from '../../utils';
import type { ILayerElement, IRenderable } from '../interfaces';
import type { ParseState, Path2D, Rectangle, } from '../';

export const enum TransformScope {
    /** affects only the layer before the transform */
    PreviousOne,
    /** affects all previous layers drawn so far */
    Cumulative,
    /** affects all layers until an empty transform (or end) */
    UntilReset,
    /** resets one previous `UntilReset` transform */
    Reset,
}

/** Applies a matrix transformation to a canvas context.

Transform operations are specified as individual steps (eg. rotate, translate) and then combined in the specified {@link order}
into a {@link DOMMatrix} which can then be queried with {@link toMatrix} and {@link getMatrix} or
applied to a context or a `Path2D` path in the {@link render} or {@link transformPaths} methods, respectively.

The primary difference between this class and a regular `DOMMatrix` (or transforming a canvas directly) is that all the terms
used in `Transformation` are relative to a given size when queried or drawn. The values for all operations are specified as percentages,
not literal pixels. The query and drawing methods all require a rectangle (or size and origin point) to scale the final matrix into.

It employs a caching strategy to avoid re-computing the final matrix if input parameters and the drawing bounds do not change between
calls to the `render()`, `transformPaths()` or `getMatrix()` methods.
*/
export default class Transformation implements ILayerElement, IRenderable
{
    #rotate = 0;                   // percent of 360 degrees
    #scale = new Vect2d(100, 100); // percentage of relevant dimension of requested size
    #translate = new Vect2d();     //
    #skew = new Vect2d();          //
    #transformOrder = DEFAULT_TRANSFORM_OP_ORDER;  // careful! reference... don't edit, replace entirely.
    #scope = TransformScope.PreviousOne;
    #cache = {
        matrix: <DOMMatrix | null> null,
        origin: <PointType | null> null,
        size: <SizeType | null> null,
    }

    constructor(init?: PartialDeep<Transformation>) {
        assignExistingProperties(this, init, 0);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Transform;

    /** Returns `true` if this transform has no operations to perform. */
    get isEmpty(): boolean {
        return this.#scope == TransformScope.Reset || (fuzzyEquals4p(this.#rotate, 0) && this.#translate.fuzzyIsNull && this.#skew.fuzzyIsNull && !this.isScaling);
    }
    /** Returns `true` if this transformation has a scaling component. */
    get isScaling(): boolean {
        return !this.#scale.fuzzyIsNull;
    }

    /** Rotation component of the transform expressed as percent of 360 degrees (eg. 50 % = 180 degrees). */
    get rotate() { return this.#rotate; }
    set rotate(percent: number) {
        if (percent != this.#rotate) {
            this.#rotate = percent;
            this.clearCache();
        }
    }

    /** Translation component expressed as percentage of relevant dimension of requested size; eg: x = 100 translates one full width to the right. */
    get translate() { return this.#translate; }
    set translate(percent: PointType) {
        if (!this.#translate.equals(percent)) {
            this.#translate.set(percent);
            this.clearCache();
        }
    }

    /** Scaling component expressed as percent of requested size, eg: 200.0 is double size, 50 is half size. */
    get scale() { return this.#scale; }
    set scale(percent: PointType) {
        if (!this.#scale.equals(percent)) {
            this.#scale.set(percent);
            this.clearCache();
        }
    }

    /** Skewing component expressed as percent of requested size. */
    get skew() { return this.#skew; }
    set skew(percent: PointType) {
        if (!this.#skew.equals(percent)) {
            this.#skew.set(percent);
            this.clearCache();
        }
    }

    /** The order in which to apply transform component operations. Expressed as an array of operations where each operation is one of:
    ```
        "O"  - Offset (translate)
        "R"  - Rotate
        "SC" - Scale
        "SK" - Skew
    ```
    */
    get order() { return this.#transformOrder; }
    set order(order: TransformOpType[]) {
        if (!arraysMatchExactly(this.#transformOrder, order)) {
            this.#transformOrder = order;
            this.clearCache();
        }
    }

    /** The transformation scope affects which layer(s) of a layered icon or paths of a paths array are affected by this transform.
    Valid string values for setting this property are one of: "previous layer", "all previous", "all following", "reset [following]"
    Only relevant when using {@link render} or {@link transformPaths} methods. For `transformPaths()`, only the first two scopes are relevant.
    When reading the property it is always returned as a numeric enumeration type.
    */
    get scope(): TransformScope { return this.#scope; }
    set scope(scope: TransformScope | string) {
        if (typeof scope == 'string') {
            // "previous layer", "all previous", "all following", "reset following"
            if (scope[0] == 'p')
                scope = TransformScope.PreviousOne;
            else if (scope[4] == 'p')
                scope = TransformScope.Cumulative;
            else if (scope[4] == 'f')
                scope = TransformScope.UntilReset;
            else if (scope[0] == 'r')
                scope = TransformScope.Reset;
            else
                return;
        }
        this.#scope = scope;
    }

    /** Clears the cached transform matrix. Typically the cache management is handled automatically when relevant properties are modified. */
    clearCache() { this.#cache.matrix = null; }

    /** Returns `true` if any properties were modified or cached matrix hasn't been generated yet.
        @internal  */
    loadFromDataRecord(dr: TpActionDataRecord): boolean {
        if (dr.rot)
            this.rotate = evaluateValue(dr.rot);
        if (dr.trsX)
            this.translate = Point.new(evaluateValue(dr.trsX), evaluateValue(dr.trsY, null));
        if (dr.sclX)
            this.scale = Point.new(evaluateValue(dr.sclX), evaluateValue(dr.sclY, null));
        if (dr.skwX)
            this.skew = Point.new(evaluateValue(dr.skwX), evaluateValue(dr.skwY, null));
        if (dr.order)
            this.order = dr.order.split(', ') as TransformOpType[];
        if (dr.scope)
            this.scope = dr.scope;
        // console.dir(this);
        return this.#cache.matrix == null;
    }

    /** @internal */
    loadFromActionData(state: ParseState /* , statePrefix: string = Act.IconTx */): this {
        // const dr = state.asRecord(state.pos, statePrefix + Str.IdSep);
        this.loadFromDataRecord(state.dr);
        return this;
    }

    /** Returns the current transform operations as a `DOMMatrix` which uses given `txOrigin` as origin point for rotation and scaling,
        and scales translations to `txArea` size.  The returned value may be a cached version if no properties have changed since the cache was created,
        and `txOrigin` and `txArea` are the same as the cache'd version. Using this method with a new arguments will regenerate the matrix and update the cache. */
    getMatrix(txOrigin: PointType, txArea: SizeType) {
        if (!this.#cache.matrix || !this.#cache.origin || !this.#cache.size || !Point.fuzzyEquals(this.#cache.origin, txOrigin) || !Size.fuzzyEquals(this.#cache.size, txArea)) {
            this.#cache.matrix = this.toMatrix(txOrigin, txArea);
            this.#cache.origin = txOrigin;
            this.#cache.size = txArea;
        }
        return this.#cache.matrix;
    }

    /** Creates a `DOMMatrix` from the current transform options which uses given `txOrigin` as transform origin and scales translations to `txArea` size.
        This method does not use any cached matrix but always generates a new one. */
    toMatrix(txOrigin: PointType, txArea: SizeType): DOMMatrix {
        const m = new DOMMatrix();
        for (const op of this.#transformOrder) {
            switch (op) {
                case TransformOpType.Rotate:
                    if (!fuzzyEquals4p(this.#rotate, 0))
                        m.rotateZSelf(round4p(this.#rotate * .01 * 360), txOrigin);
                    break;
                case TransformOpType.Offset:
                    if (!this.#translate.fuzzyIsNull)
                        m.translateSelf(round4p(this.#translate.x * .01 * txArea.width), round4p(this.#translate.y * .01 * txArea.height), 0);
                    break;
                case TransformOpType.Scale:
                    if (this.isScaling)
                        m.scaleSelf(round4p(this.#scale.x * .01), round4p(this.#scale.y * .01), 0, txOrigin.x, txOrigin.y, 0);
                    break;
                case TransformOpType.Skew:
                    if (!this.#skew.fuzzyIsNull)
                        m.skewSelf(round4p(this.#skew.x * .01 * txArea.width), round4p(this.#skew.y * .01 * txArea.height), txOrigin);
                    break;
            }
        }
        return m;
    }

    // IRenderable
    /** Applies current transform matrix to the given canvas context using `rect` coordinates for tx center origin and area. */
    render(ctx: RenderContext2D, rect: Rectangle) : void {
         if (this.isEmpty)
            return;

        // For a cumulative ("everything above") type Tx we need to apply it to a new canvas/context and then afterwards we draw the original canvas on top.
        if (this.#scope == TransformScope.Cumulative) {
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

    /** Applies current transform matrix to the given `paths` starting at `fromIdx` and using `rect.size` for relative scaling and translation.
        The individual path bounds are used for computing center point for rotations and scaling.

        If the `scope` of this transform is `TransformScope.PreviousOne` then only the last path in `paths` array is tranformed, regardless of how many there are in total.
    */
    transformPaths(paths: Path2D[], _: RenderContext2D, rect: Rectangle, fromIdx: number = 0): void {
        const len = paths.length;
        if (!len || fromIdx < 0 || fromIdx >= len || this.isEmpty)
            return;

        if (this.#scope == TransformScope.PreviousOne)
            fromIdx = len - 1;

        for ( ; fromIdx < len; ++fromIdx) {
            const path = paths[fromIdx];
            const bounds = path.bounds;
            const ctr = { x: round4p(bounds.left + bounds.width * .5), y: round4p(bounds.top + bounds.height * .5) };
            paths[fromIdx] = path.transform(this.getMatrix(ctr, rect.size));
        }
    }

}

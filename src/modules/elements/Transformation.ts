
import { ILayerElement, RenderContext2D } from '../interfaces';
import { ParseState } from '../types';
import { Point, PointType, Rectangle } from '../geometry'
import { PI2 } from '../../utils/consts';
import { Canvas } from 'skia-canvas';
import { evaluateValue /* , parsePointFromValue */ } from '../../utils/helpers';

export type TransformOpType = 'O' | 'R' | 'SC' | 'SK';    // offset (translate) | rotate | scale | skew

export const enum TransformScope {
    PreviousOne,  // affects only the layer before the transform
    Cumulative,   // affects all previous layers drawn so far
    UntilReset,   // affects all layers until an empty transform (or end)
}

export default class Transformation implements ILayerElement
{
    // all values are percentages coming from TP actions, not actual matrix values
    rotate: number = 0; // percent of 360 degrees
    scale: PointType = Point.new(); // percent of requested image size (not the original source image), negative for reduction; eg: 100 is double size, -50 is half size.
    translate: PointType = Point.new(); // percentage of relevant dimension of requested image size
                                      // eg: x = 100 translates one full image width to the right (completely out of frame for an unscaled source image)
    skew: PointType = Point.new(); // percent of requested image size (not the original source image)
    transformOrder: TransformOpType[] = ['O', 'R', 'SC', 'SK'];
    scope: TransformScope = TransformScope.PreviousOne;

    constructor(init?: Partial<Transformation>) { Object.assign(this, init); }

    // ILayerElement
    readonly type = "Transformation";

    get isEmpty(): boolean {
        return !this.rotate && Point.isNull(this.translate) && Point.isNull(this.skew) && !this.isScaling;
    }
    get isScaling(): boolean {
        return this.scale.x != 100 || this.scale.y != 100;
    }

    loadFromActionData(state: ParseState): Transformation {
        // the incoming data IDs should be structured with a naming convention
        // For properties with X,Y values, this currently can handle both single and double-field versions (X and Y are separate fields),
        // though currently no actions use the single field variant so this could be trimmed down if no use is found for that option..
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const data = state.data[i];
            const dataType = data.id.split('tx_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'rot':
                    this.rotate = evaluateValue(data.value);
                    break;
                case 'trsX':
                    this.translate.x = evaluateValue(data.value);
                    break;
                case 'trsY':
                    this.translate.y = data.value.trim() ? evaluateValue(data.value) : this.translate.x;
                    break;
                case 'sclX':
                    this.scale.x = evaluateValue(data.value);
                    break;
                case 'sclY':
                    this.scale.y = data.value.trim() ? evaluateValue(data.value) : this.scale.x;
                    break;
                case 'skwX':
                    this.skew.x = evaluateValue(data.value);
                    break;
                case 'skwY':
                    this.skew.y = data.value.trim() ? evaluateValue(data.value) : this.skew.x;
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
                case 'order':
                    if (data.value)
                        this.transformOrder = data.value.split(', ') as typeof this.transformOrder;
                    break;
                case 'scope':
                    // "previous layer", "all previous", "all following"
                    if (data.value[0] == 'p')
                        this.scope = TransformScope.PreviousOne;
                    else if (data.value[4] == 'p')
                        this.scope = TransformScope.Cumulative;
                    else if (data.value[4] == 'f')
                        this.scope = TransformScope.UntilReset;
                    break;
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
    render(ctx: RenderContext2D, rect: Rectangle) : void {
        if (!ctx)
            return;
         if (this.isEmpty) {
            // reset context transform if this is an "until reset" type
            if (this.scope == TransformScope.UntilReset)
                ctx.resetTransform();
            return;
        }

        const ctr = Point.plus_eq(Point.new(rect.origin), rect.width * .5, rect.height * .5);
        let tCtx = ctx;
        // For a cumulative ("everything above") type Tx we need to apply it to a new canvas/context and then afterwards we draw the original canvas on top.
        if (this.scope == TransformScope.Cumulative)
            tCtx = new Canvas(rect.width, rect.height).getContext('2d'); // ctx.canvas.newPage(w, h);

        // all operations from center of rect
        tCtx.translate(ctr.x, ctr.y);
        for (const op of this.transformOrder) {
            if (op === 'R' && this.rotate)
                tCtx.rotate(this.rotate * .01 * PI2);
            else if (op === 'O' && !Point.isNull(this.translate))
                tCtx.translate(this.translate.x * .01 * rect.width, this.translate.y * .01 * rect.height);
            else if (op === 'SC' && this.isScaling)
                tCtx.scale(this.scale.x * .01, this.scale.y * .01);
            else if (op === 'SK' && !Point.isNull(this.skew))
                tCtx.transform(1, this.skew.y * .01, this.skew.x * .01, 1, 0, 0);
        }
        // translate back to top left corner before drawing
        tCtx.translate(-ctr.x, -ctr.y);

        if (this.scope == TransformScope.Cumulative) {
            // Here we need to copy anything drawn previously onto the new transformed context/canvas.
            // It may be clever to just switch up the context reference that is getting passed around
            // to all the render() methods... but that just seems wrong on several levels.
            // Anyway it's pretty fast, tens of _micro_seconds, uncomment below to check.
            // const st = process.hrtime();
            tCtx.drawCanvas(ctx.canvas, rect.x, rect.y);
            ctx.resetTransform();
            ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
            ctx.drawCanvas(tCtx.canvas, rect.x, rect.y);
            // console.log(process.hrtime(st));
        }
    }
}

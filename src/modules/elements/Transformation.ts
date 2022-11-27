
import { ILayerElement, RenderContext2D } from "../interfaces";
import { ParseState, Rectangle, Vect2d } from "../types";
import { PI2 } from '../../utils/consts';
import { Canvas } from 'skia-canvas';
import { evaluateValue, parseVect2dFromValue } from "../../utils/helpers";

export type TransformOpType = 'O' | 'R' | 'SC' | 'SK';    // offset (translate) | rotate | scale | skew

export enum TransformScope {
    PreviousOne,  // affects only the layer before the transform
    Cumulative,   // affects all previous layers drawn so far
    UntilReset,   // affects all layers until an empty transform (or end)
}

export default class Transformation implements ILayerElement
{
    // all values are percentages coming from TP actions, not actual matrix values
    rotate: number = 0; // percent of 360 degrees
    scale: Vect2d = new Vect2d(); // percent of requested image size (not the original source image), negative for reduction; eg: 100 is double size, -50 is half size.
    translate: Vect2d = new Vect2d(); // percentage of relevant dimension of requested image size
                                      // eg: x = 100 translates one full image width to the right (completely out of frame for an unscaled source image)
    skew: Vect2d = new Vect2d(); // percent of requested image size (not the original source image)
    transformOrder: TransformOpType[] = ['O', 'R', 'SC', 'SK'];
    scope: TransformScope = TransformScope.PreviousOne;

    constructor(init?: Partial<Transformation>) { Object.assign(this, init); }
    // ILayerElement
    get type() { return "Transformation"; }

    get isEmpty(): boolean {
        return !this.rotate && this.translate.isEmpty && this.skew.isEmpty && !this.isScaling;
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
                case 'trs':
                    this.translate = parseVect2dFromValue(data.value);
                    break;
                case 'trsX':
                    this.translate.x = evaluateValue(data.value);
                    break;
                case 'trsY':
                    this.translate.y = data.value.trim() ? evaluateValue(data.value) : this.translate.x;
                    break;
                case 'scl':
                    this.scale = parseVect2dFromValue(data.value);
                    break;
                case 'sclX':
                    this.scale.x = evaluateValue(data.value);
                    break;
                case 'sclY':
                    this.scale.y = data.value.trim() ? evaluateValue(data.value) : this.scale.x;
                    break;
                case 'skw':
                    this.skew = parseVect2dFromValue(data.value);
                    break;
                case 'skwX':
                    this.skew.x = evaluateValue(data.value);
                    break;
                case 'skwY':
                    this.skew.y = data.value.trim() ? evaluateValue(data.value) : this.skew.x;
                    break;
                case 'order':
                    if (data.value)
                        this.transformOrder = data.value.split(', ') as typeof this.transformOrder;
                    break;
                case 'scope':
                    switch (data.value.toLowerCase()) {
                        case "all previous":  this.scope = TransformScope.Cumulative;  break;
                        case "all following": this.scope = TransformScope.UntilReset;  break;
                        default: break;  // keep default TransformScope.PreviousOne
                    }
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
    async render(ctx: RenderContext2D, rect: Rectangle) : Promise<void> {
        if (!ctx)
            return;
         if (this.isEmpty) {
            // reset context transform if this is an "until reset" type
            if (this.scope == TransformScope.UntilReset)
                ctx.resetTransform();
            return;
        }

        const ctr: Vect2d = new Vect2d(rect.origin).add(rect.width * .5, rect.height * .5);
        let tCtx = ctx;
        // For a cumulative ("everything above") type Tx we need to apply it to a new canvas/context and then afterwards we draw the original canvas on top.
        if (this.scope == TransformScope.Cumulative)
            tCtx = new Canvas(rect.width, rect.height).getContext('2d'); // ctx.canvas.newPage(w, h);

        // all operations from center of rect
        tCtx.translate(ctr.x, ctr.y);
        for (const op of this.transformOrder) {
            if (op === 'R' && this.rotate)
                tCtx.rotate(this.rotate * .01 * PI2);
            else if (op === 'O' && !this.translate.isEmpty)
                tCtx.translate(this.translate.x * .01 * rect.width, this.translate.y * .01 * rect.height);
            else if (op === 'SC' && this.isScaling)
                tCtx.scale(this.scale.x * .01, this.scale.y * .01);
            else if (op === 'SK' && !this.skew.isEmpty)
                tCtx.transform(1, this.skew.y * .01, this.skew.x * .01, 1, 0, 0);
        }
        // translate back to top left corner before drawing
        tCtx.translate(-ctr.x, -ctr.y);

        if (this.scope == TransformScope.Cumulative) {
            // Here we need to copy anything drawn previously onto the new transformed context/canvas.
            // It may be clever to just switch up the context reference that is getting passed around
            // to all the render() methods... but that just seems wrong on several levels.
            // Anyway it's pretty fast, tens of _micro_seconds on a GPU, uncomment below to check.
            // const st = process.hrtime();
            await tCtx.drawCanvas(ctx.canvas, rect.x, rect.y);
            ctx.resetTransform();
            ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
            await ctx.drawCanvas(tCtx.canvas, rect.x, rect.y);
            // console.log(process.hrtime(st));
        }
    }
}

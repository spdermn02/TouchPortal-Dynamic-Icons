
export type TpActionDataType = { id:string, value:string };
export type TpActionDataArrayType = TpActionDataType[];
export type TpActionDataRecord = Record<string, string>;

export type ConstructorType<T> = new(...args:any[])=>T;

// We specifically need the CanvasRenderingContext2D and Path2D from Skia, not the default definitions, since they have methods we use which the default versions doesn't.
// The idea is to centralize the types here which other modules need, instead of importing from skia-canvas inside each implementation.
// This should also make is easier to change provider libraries if necessary.
export {
    Canvas, CanvasRenderingContext2D as RenderContext2D,
    DOMMatrix, DOMPoint, DOMRect,
    Image, ImageData,
    Path2D, TextMetrics,
} from 'skia-canvas';

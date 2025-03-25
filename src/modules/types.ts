
export type TpActionDataType = { id:string, value:string };
export type TpActionDataArrayType = TpActionDataType[];
export type TpActionDataRecord = Record<string, string>;

// We specifically need the CanvasRenderingContext2D and Path2D from Skia, not the default definitions, since they have methods we use which the default versions doesn't.
// The idea is to centralize the types here which other modules need, instead of importing from skia-canvas inside each implementation.
// This should also make is easier to change provider libraries if necessary.
export { Canvas, DOMMatrix, DOMPoint, DOMRect, Path2D, CanvasRenderingContext2D as RenderContext2D, TextMetrics } from 'skia-canvas';

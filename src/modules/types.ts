
/** @internal */
export type TpActionDataType = { id:string, value:string };
/** @internal */
export type TpActionDataArrayType = TpActionDataType[];
/** @internal */
export type TpActionDataRecord = Record<string, string>;

/** @internal */
export type ConstructorType<T> = new(...args:any[])=>T;

/** Defines how to resize images (or other block elements). Equivalent to CSS `object-fit` property. */
export type ResizeFitOption = "contain" | "cover" | "fill" | "scale-down" | "none";

// We specifically need the CanvasRenderingContext2D and Path2D from Skia, not the default definitions, since they have methods we use which the default versions doesn't.
// The idea is to centralize the types here which other modules need, instead of importing from skia-canvas inside each implementation.
// This should also make is easier to change provider libraries if necessary.
export {
    Canvas, CanvasRenderingContext2D,
    DOMMatrix, DOMPoint, DOMRect,
    Image, ImageData, loadImage, loadImageData,
    Path2D, TextMetrics,
    type CanvasTextAlign, type CanvasTextBaseline, type CanvasRenderingContext2D as RenderContext2D,
} from 'skia-canvas';

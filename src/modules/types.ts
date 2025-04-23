
/** @internal */
export type TpActionDataType = { id:string, value:string };
/** @internal */
export type TpActionDataArrayType = TpActionDataType[];
/** @internal */
export type TpActionDataRecord = Record<string, string>;

/** Defines how to resize images (or other block elements). Equivalent to CSS `object-fit` property. */
export type ResizeFitOption = "contain" | "cover" | "fill" | "scale-down" | "none";

import type { CanvasGradient, CanvasPattern, CanvasTexture } from 'skia-canvas';
export type ContextFillStrokeType = string | CanvasGradient | CanvasPattern | CanvasTexture;

// We specifically need the CanvasRenderingContext2D and Path2D from Skia, not the default definitions, since they have methods we use which the default versions doesn't.
// The idea is to centralize the types here which other modules need, instead of importing from skia-canvas inside each implementation.
// This should also make is easier to change provider libraries if necessary.
export {
    Canvas, CanvasGradient, CanvasPattern, CanvasRenderingContext2D, CanvasTexture,
    DOMMatrix, DOMPoint, DOMRect,
    Image, ImageData, loadImage, loadImageData,
    Path2D, TextMetrics,
    type CanvasTextAlign, type CanvasTextBaseline, type CanvasRenderingContext2D as RenderContext2D,
} from 'skia-canvas';


/** @internal */
declare global {

    type ConstructorType<T> = new(...args:any[])=>T;

    // https://stackoverflow.com/a/49725198/3246449
    type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
        Pick<T, Exclude<keyof T, Keys>>  & {
            [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
        }[Keys];

    // https://stackoverflow.com/a/51365037/3246449
    type PartialDeep<T> = {
        [P in keyof T]?:
            T[P] extends (infer U)[] ? PartialDeep<U>[] :
            T[P] extends object | undefined ? PartialDeep<T[P]> :
            T[P];
    };

}

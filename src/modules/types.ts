
// The idea is to centralize the types here which other modules need, instead of importing from skia-canvas inside each implementation.
// This should also make is easier to change provider libraries if necessary.
export {
    Canvas, DOMMatrix, DOMPoint, DOMRect,
    Image, ImageData, loadImage, loadImageData, Path2D
} from 'skia-canvas';

// Only typings from here on down.

// for global definitions
import type * as canvas from 'skia-canvas';
import type * as geometry from './geometry';

/** Some custom type declarations.
    @mergeModuleWith <project>
*/
export declare namespace types {
    /** All possible types for canvas fill/stroke style. */
    type ContextFillStrokeType = string | canvas.CanvasGradient | canvas.CanvasPattern | canvas.CanvasTexture;
    /** Defines how to resize images (or other block elements). Equivalent to CSS `object-fit` property. */
    type ResizeFitOption = "contain" | "cover" | "fill" | "scale-down" | "none";

    type ConstructorType<T> = new(...args:any[])=>T;

    // https://stackoverflow.com/a/51365037/3246449
    /** A recursive version of `Partial<>` type. Accepts any existing property of this object, including child objects and their properties. */
    type PartialDeep<T> = {
        [P in keyof T]?:
            T[P] extends (infer U)[] ? PartialDeep<U>[] :
            T[P] extends object | undefined ? PartialDeep<T[P]> :
            T[P];
    };
    // https://stackoverflow.com/a/49725198/3246449
    /** Requires at least one of specified properties to be present in an object. */
    type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
        Pick<T, Exclude<keyof T, Keys>>  & {
            [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
        }[Keys];
}

declare global {
    // un-creatable skia-canvas type aliases
    type CanvasDirection = canvas.CanvasDirection;
    type CanvasFillRule = canvas.CanvasFillRule;
    type CanvasFontStretch = canvas.CanvasFontStretch;
    type CanvasGradient = canvas.CanvasGradient;
    type CanvasLineCap = canvas.CanvasLineCap;
    type CanvasLineJoin = canvas.CanvasLineJoin;
    type CanvasPattern = canvas.CanvasPattern;
    type CanvasRenderingContext2D = canvas.CanvasRenderingContext2D;
    type CanvasTextAlign = canvas.CanvasTextAlign;
    type CanvasTextBaseline = canvas.CanvasTextBaseline;
    type CanvasTexture = canvas.CanvasTexture;
    type ContextFillStrokeType = types.ContextFillStrokeType;
    type GlobalCompositeOperation = canvas.GlobalCompositeOperation;
    type RenderContext2D = CanvasRenderingContext2D;
    type TextMetrics = canvas.TextMetrics;
    type TextMetricsLine = canvas.TextMetricsLine;
    // un-creatable geometry type aliases
    type PointType = geometry.PointType;
    type SizeType = geometry.SizeType;

    type ResizeFitOption = types.ResizeFitOption;

    // TP action data type aliases
    type TpActionDataType = { id:string, value:string };
    type TpActionDataArrayType = TpActionDataType[];
    type TpActionDataRecord = Record<string, string>;

    // misc utilities
    type ConstructorType<T> = types.ConstructorType<T>;
    type RequireAtLeastOne<T, Keys extends keyof T> = types.RequireAtLeastOne<T, Keys>;
    type PartialDeep<T> = types.PartialDeep<T>;
}

// TODO: Update all code to rely on global declarations and remove these. Maybe declare creatable canvas/geo types as global also?
export type RenderContext2D = canvas.CanvasRenderingContext2D;
/** @internal */
export type TpActionDataRecord = globalThis.TpActionDataRecord;

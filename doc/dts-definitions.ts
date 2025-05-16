/// <reference lib="es2022" />
// @ts-ignore

// These definitions are set up for feeding to dts-bundle-generator and actually parses the
// definitions created by `typedoc`, which needs to be run first and creates a definitions build in ./docs/dist/src
// (in addition to the actual HTML docs).
// The dts-bundle-generator output still needs some adjustments to make it work correctly (see ./docs/build.js).
// Definitely room for improvement of the process since there is a lot of redundancy between this and the `typedoc-definitions.ts` version.

// First export everything as direct exports in the generated bundle

export type * from './dist/src/modules/geometry';
export type * from './dist/src/modules/elements';
export type * from './dist/src/modules/enums';
export type * from 'skia-canvas';
export type * from './dist/src/utils/extensions';
export type { DynamicIcon } from './dist/src/modules';
export type { Logger } from './dist/src/modules/logging';
// export type * from './dist/src/utils';
// export type * from './dist/src/modules/types';
// export type { PngOptions } from 'sharp';

// Then export some of those types again but within a namespace, which are used as references in the globals declaration

export type * as geometry from './dist/src/modules/geometry';
export type * as elements from './dist/src/modules/elements';
export type * as enums from './dist/src/modules/enums';
export type * as utils from './dist/src/utils';
export type * as canvas from 'skia-canvas';

// Now we need to import the types we're then aliasing in globals. The "as" namespaces must match the exported ones above.

import type * as geometry from './dist/src/modules/geometry';
import type * as elements from './dist/src/modules/elements';
import type * as enums from './dist/src/modules/enums';
import type * as utils from './dist/src/utils';
import type * as canvas from 'skia-canvas';
import type { DynamicIcon } from './dist/src/modules';
import type { Logger } from './dist/src/modules/logging';

/** Additional global scope variables, classes, and utility functions which are available in the scripting environment. */
declare global {
    /** The canvas context to draw into. */
    var canvasContext: canvas.CanvasRenderingContext2D;
    /** A class representing a rectangle with `x`, `y`, `width`, & `height` properties describing the area to draw into.
        This is typically the same width & height as the main icon instance, with `x` and `y` both `0`. */
    var paintRectangle: geometry.Rectangle;
    /** Argument string specified in the "Run Custom Script" action's "Arguments" field or via "Update Value" action. */
    var scriptArgs: string;
    /** A class representing the current icon instance that is running this script.
        It has useful properties such as `iconName`, `width` & `height`. */
    var parentIcon: DynamicIcon;
    /** A class for writing output to the Dynamic Icons plugin log file. Has `debug()`, `info()`, `warn()`, `error()` and `trace()` methods,
        which are equivalent to their `console` counterparts. */
    var logger: Logger;

    /** The `DI` namespace object contains static utility functions, enumerations, and constructors for custom Dynamic Icons elements. */
    const DI: typeof elements & typeof utils & typeof enums;

    // We have to include aliases for both the implementation and type of each class in the global scope,
    // otherwise apparently either one or the other isn't propertly recognized as being global (at leat in VSCode).

    const Point: typeof geometry.Point;
    const Rectangle: typeof geometry.Rectangle;
    const Size: typeof geometry.Size;
    const UnitValue: typeof geometry.UnitValue;
    const Vect2d: typeof geometry.Vect2d;

    const Canvas: typeof canvas.Canvas;
    const DOMMatrix: typeof canvas.DOMMatrix;
    const DOMPoint: typeof canvas.DOMPoint;
    const DOMRect: typeof canvas.DOMRect;
    const Image: typeof canvas.Image;
    const ImageData: typeof canvas.ImageData;
    const Path2D: typeof canvas.Path2D;
    const loadImage: typeof canvas.loadImage;
    const loadImageData: typeof canvas.loadImageData;

    // Some other aliases are already declared in global scope from our ./src/module/types.ts
    type Rectangle = geometry.Rectangle;
    type Size = geometry.Size;
    type UnitValue = geometry.UnitValue;
    type Vect2d = geometry.Vect2d;

    type Canvas = canvas.Canvas;
    type DOMMatrix = canvas.DOMMatrix;
    type DOMPoint = canvas.DOMPoint;
    type DOMRect = canvas.DOMRect;
    type Image = canvas.Image;
    type ImageData = canvas.ImageData;
    type Path2D = canvas.Path2D;
}


// Include `sharp.PngOptions` here instead of re-exporting from sharp... it's simpler and we have custom defaults anyway.
/** Image compression options to use when rendering icon images for final output to Touch Portal.

    Default `compressionLevel` and `quality` are set in plugin settings and can be overridden in an icon's "finalize" action.
    `compressionLevel` of `0` disables compression step entirely (`sharp` lib is never invoked, `skia-canvas` PNG-24 output is used directly).
    Otherwise these are passed to [`sharp.png()`](https://sharp.pixelplumbing.com/api-output#png) for final compression of the `skia-canvas` output.
    Default `effort` is set to `1` and `palette` to `true`.
*/
export namespace sharp {
    export interface PngOptions {
        /** Force format output, otherwise attempt to use input format (optional, default true) */
        force?: boolean | undefined;
        /** Use progressive (interlace) scan (optional, default false) */
        progressive?: boolean | undefined;
        /** zlib compression level, 0-9 (optional, default 6) */
        compressionLevel?: number | undefined;
        /** Use adaptive row filtering (optional, default false) */
        adaptiveFiltering?: boolean | undefined;
        /** Use the lowest number of colours needed to achieve given quality (optional, default `100`) */
        quality?: number | undefined;
        /** Level of CPU effort to reduce file size, between 1 (fastest) and 10 (slowest), sets palette to true (optional, default 7) */
        effort?: number | undefined;
        /** Quantise to a palette-based image with alpha transparency support (optional, default false) */
        palette?: boolean | undefined;
        /** Maximum number of palette entries (optional, default 256) */
        colours?: number | undefined;
        /** Alternative Spelling of "colours". Maximum number of palette entries (optional, default 256) */
        colors?: number | undefined;
        /**  Level of Floyd-Steinberg error diffusion (optional, default 1.0) */
        dither?: number | undefined;
    }
}

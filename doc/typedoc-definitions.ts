/**
@packageDocumentation
Reference documentation for the Touch Portal Dynamic Icons Plugin scripting environment available with the
["Run Custom Script"](https://github.com/spdermn02/TouchPortal-Dynamic-Icons/wiki/Custom-Scripts) action.

Note that everything described here as being in the {@link global} "Variable" is actually just in the global scope of the scripting environment.
Those variables and classes are available directly, w/out needing any import or prefix.

All the other types listed on this page are available either directly in the global scope or from the global {@link DI} namespace object.
See the {@link global} reference for details.

The `skia-canvas` module summary is included here for quick reference, but for complete documentation see {@link http://skia-canvas.org/api}.

An exported [definitions file](./dynamic-icons.d.ts) is available to provide code hinting in compatible editors (such as `VSCode`).
The defintions describe everything available in the global scope, all *skia-canvas* types, and all custom types from this reference.

Place this file somewhere "close" to your scripts and reference it using a "triple slash directive" at the top of your script, including a relative path.
For example, if the declarations file is in the same folder as your script:
```js
/// <reference path="./dynamic-icons.d.ts"/>
```
*/

// These definitions are set up for feeding to `typedoc` and focus on just the types available in the public scripting environment.
// Typedoc should be run from the project root with:
//   typedoc --options ./doc/typedoc.json
//
// Note: the `global` "variable" declared here is actually the global scope, but there doesn't seem to be a way to document that with Typedoc.
//
// TODO: could probably generate a lot of this instead of creating manually.


export type * from '../src/modules/geometry';
// export type * as geometry from '../src/modules/geometry';
export type * from '../src/modules/elements';
// export type * as elements from '../src/modules/elements';
export type * from '../src/modules/enums';
// export type * as enums from '../src/modules/enums';
export type * from '../src/utils/helpers';
export type * from '../src/utils/drawing';
// export * from '../src/utils';
// export type * as utils from '../src/utils';
export type * as canvas from 'skia-canvas';
export type * from '../src/utils/extensions';
export type { types } from '../src/modules/types';
export type { DynamicIcon } from '../src/modules';
export type { Logger } from '../src/modules/logging';

import type * as geometry from '../src/modules/geometry';
import type * as elements from '../src/modules/elements';
import type * as utils from '../src/utils';
import type * as canvas from 'skia-canvas';
import type { DynamicIcon } from '../src/modules';
import type { Logger } from '../src/modules/logging';

/** Additional global scope variables, classes, and utility functions which are available in the scripting environment.

    Although `global` is described here as a "variable" type, it is really the global _scope_ which is documented. No prefix or import
    is required to use these variables/types.

    The documentation here just provides links to the actual type references (also found in the left navigation bar).
    Click on the types (on right side) for full details.
*/
export declare var global: {
    /** The canvas context to draw into. */
    canvasContext: canvas.CanvasRenderingContext2D
    /** A class representing a rectangle with `x`, `y`, `width`, & `height` properties describing the area to draw into.
        This is typically the same width & height as the main icon instance, with `x` and `y` both `0`. */
    paintRectangle: geometry.Rectangle
    /** Argument string specified in the "Run Custom Script" action's "Arguments" field or via "Update Value" action. */
    scriptArgs: string
    /** A class representing the current icon instance that is running this script. It has useful properties such as `name`, `width` & `height`. */
    parentIcon: DynamicIcon
    /** A class for writing output to the Dynamic Icons plugin log file. */
    logger: Logger

    /** The `DI` namespace object contains static utility functions, enumerations, and constructors for custom Dynamic Icons elements. See {@link DI} for details.  */
    DI: DI

    Point: typeof geometry.Point
    Rectangle: geometry.Rectangle
    Size: geometry.Size
    Vect2d: geometry.Vect2d

    Canvas: canvas.Canvas
    DOMMatrix: canvas.DOMMatrix
    DOMPoint: canvas.DOMPoint
    DOMRect: canvas.DOMRect
    Image: canvas.Image
    ImageData: canvas.ImageData
    Path2D: canvas.Path2D
    loadImage: typeof canvas.loadImage
    loadImageData: typeof canvas.loadImageData

}

// Would be nice to present Point as an interface instead of a variable, but no joy.
// type PointT = typeof geometry.Point;
// export interface Point extends PointT {}
// export var Point: typeof geometry.Point;

/** The `DI` namespace object contains static utility functions, enumerations, and constructors for custom Dynamic Icons elements.

    Note: enumerations are not listed here, refer to the main index page or navigation tree for listing.

    To use any of these classes, functions, or enums, prefix them with `DI` (similar to how `Math` works). For example:
    ```js
        let c = DI.round4p(Math.cos(angle));
        const textElement = new DI.StyledText({ text: "Hello World!", alignment: DI.Alignment.TopCenter });
    ```
    The documentation here just provides links to the actual class/function references (also found in the left navigation bar).
    Click on the types (on right side) for full details.
*/
export declare const DI: {
        BarGraph: elements.BarGraph,
        BrushStyle: elements.BrushStyle,
        // CanvasFilter: elements.CanvasFilter,  // not needed in scripts
        CircularTicks: elements.CircularTicks,
        // ClippingMask: elements.ClippingMask,  // not needed in scripts
        // CompositionMode: elements.CompositionMode,  // not needed in scripts
        DrawingStyle: elements.DrawingStyle,
        DynamicImage: elements.DynamicImage,
        EllipsePath: elements.EllipsePath,
        FreeformPath: elements.FreeformPath,
        // GaugeTicks: elements.GaugeTicks,  // not creatable
        LinearProgressBar: elements.LinearProgressBar,
        LinearTicks: elements.LinearTicks,
        // Path: elements.Path,  // not creatable
        RectanglePath: elements.RectanglePath,
        RoundProgressGauge: elements.RoundProgressGauge,
        // Script: elements.Script,  // not needed from within other scripts
        ShadowStyle: elements.ShadowStyle,
        // SizedElement: elements.SizedElement,  // not creatable
        StrokeStyle: elements.StrokeStyle,
        StyledRectangle: elements.StyledRectangle,
        StyledText: elements.StyledText,
        Transformation: elements.Transformation,

        arraysMatchExactly: typeof utils.arraysMatchExactly,
        assignExistingProperties: typeof utils.assignExistingProperties,
        circularLabelsPath: typeof utils.circularLabelsPath,
        cirularGaugeTicksPath: typeof utils.cirularGaugeTicksPath,
        clamp: typeof utils.clamp,
        elideLeft: typeof utils.elideLeft,
        elideRight: typeof utils.elideRight,
        evaluateStringValue: typeof utils.evaluateStringValue,
        evaluateValue: typeof utils.evaluateValue,
        evaluateValueAsArray: typeof utils.evaluateValueAsArray,
        fuzzyEquals: typeof utils.fuzzyEquals,
        fuzzyEquals3p: typeof utils.fuzzyEquals3p,
        fuzzyEquals4p: typeof utils.fuzzyEquals4p,
        fuzzyEquals5p: typeof utils.fuzzyEquals5p,
        fuzzyEquals6p: typeof utils.fuzzyEquals6p,
        linearGaugeTicksPath: typeof utils.linearGaugeTicksPath,
        linearLabelsPath: typeof utils.linearLabelsPath,
        normalizeAngle: typeof utils.normalizeAngle,
        parseAlignmentFromValue: typeof utils.parseAlignmentFromValue,
        parseAlignmentsFromString: typeof utils.parseAlignmentsFromString,
        parseArcDirection: typeof utils.parseArcDirection,
        parseBoolFromValue: typeof utils.parseBoolFromValue,
        parseBoolOrDefault: typeof utils.parseBoolOrDefault,
        parseIntOrDefault: typeof utils.parseIntOrDefault,
        parseNumericArrayString: typeof utils.parseNumericArrayString,
        parsePlacement: typeof utils.parsePlacement,
        parsePointFromValue: typeof utils.parsePointFromValue,
        qualifyFilepath: typeof utils.qualifyFilepath,
        round2p: typeof utils.round2p,
        round3p: typeof utils.round3p,
        round4p: typeof utils.round4p,
        round5p: typeof utils.round5p,
        round6p: typeof utils.round6p,
    }

// this is for the 'global' variable to reference, don't export
declare interface DI {}

/** Image compression options to use when rendering icon images for final output to Touch Portal.

    Default `compressionLevel` and `quality` are set in plugin settings and can be overridden in an icon's "finalize" action.
    `compressionLevel` of `0` disables compression step entirely (`sharp` lib is never invoked, `skia-canvas` PNG-24 output is used directly).
    Otherwise these are passed to [`sharp.png()`](https://sharp.pixelplumbing.com/api-output#png) for final compression of the `skia-canvas` output.
    Default `effort` is set to `1` and `palette` to `true`.
*/
export type PngOptions = {
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
    /** Quantize to a palette-based image with alpha transparency support (optional, default false) */
    palette?: boolean | undefined;
    /** Maximum number of palette entries (optional, default 256) */
    colours?: number | undefined;
    /** Alternative Spelling of "colours". Maximum number of palette entries (optional, default 256) */
    colors?: number | undefined;
    /**  Level of Floyd-Steinberg error diffusion (optional, default 1.0) */
    dither?: number | undefined;
}

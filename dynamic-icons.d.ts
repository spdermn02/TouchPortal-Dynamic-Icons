/// <reference no-default-lib="true"/>
/// <reference lib="es2022" />
/// <reference types="node" />

import { EventEmitter } from 'events';

/** A numeric value with an associated unit type. Sort-of like CSSUnitValue.
	For now unit types are only "%" or "px", and this object just stores
	a flag indicating if the value is relative (%) or absolute (px).
*/
declare class UnitValue extends Object {
	value: number;
	isRelative: boolean;
	protected _unit: string;
	constructor(value?: number);
	constructor(value: string);
	constructor(value: number, unit: string);
	constructor(value: number, isRelative: boolean);
	static isRelativeUnit(unit: string): unit is "%";
	static fromString(value: string): UnitValue;
	get unit(): string;
	set unit(unit: string);
	setUnit(unit: string): boolean;
	setRelative(relative: boolean): void;
	setFromString(value: string): this;
	toString(): string;
}
/** A rectangle type storing x, y, with, & height values. Convenience methods are provided for various operations.

The values are stored as `origin` (`Vect2d` type) and `size` (`Size` type) properties
which can be read or manipulated directly using their respective methods.
*/
declare class Rectangle {
	readonly origin: Vect2d;
	readonly size: Size;
	constructor();
	constructor(rect: Rectangle);
	constructor(origin: PointType, size: SizeType);
	constructor(origin: PointType, width: number, height: number);
	constructor(top: number, left?: number, size?: SizeType);
	constructor(top: number, left: number, width?: number, height?: number);
	set(rect: Rectangle): this;
	set(origin: PointType, size?: SizeType): this;
	set(origin: PointType, width?: number, height?: number): this;
	set(top: number, left: number, size?: SizeType): this;
	set(top?: number, left?: number, width?: number, height?: number): this;
	clone(): Rectangle;
	toString(): string;
	/** Creates a new instance of Rectangle with origin(0,0) and the given size for width and height. */
	static fromSize(size: SizeType): Rectangle;
	/** Creates a new instance of Rectangle from a "bounds" type object where origin coordinate properties are left/top instead of x/y. */
	static fromBounds(bounds?: {
		left: number;
		top: number;
		width: number;
		height: number;
	}): Rectangle;
	get x(): number;
	set x(x: number);
	get y(): number;
	set y(y: number);
	get width(): number;
	set width(w: number);
	get height(): number;
	set height(h: number);
	get top(): number;
	get right(): number;
	get bottom(): number;
	get left(): number;
	get center(): PointType;
	/** Returns true if either of the width or height are less than or equal to zero. */
	get isEmpty(): boolean;
	/** Returns true if both the width or height are zero. */
	get isNull(): boolean;
	/** Returns true if both width and height values are equal to zero to within 4 decimal places of precision. */
	get fuzzyIsNull(): boolean;
	/** Sets the top left coordinates of this rectangle to `origin` and returns itself. */
	setOrigin(origin: PointType): this;
	/** Sets the top left coordinates of this rectangle to `x` and `y` and returns itself.
		If `y` is undefined then value of `x` is used for both dimensions. */
	setOrigin(x: number, y?: number): this;
	/** Sets the size of this rectangle to `size` and returns itself. */
	setSize(size: SizeType): this;
	/** Sets the size of this rectangle to `width` and `height` and returns itself.
		If `height` is undefined then value of `width` is used for both dimensions. */
	setSize(width: number, height?: number): this;
	/** Resets origin and size of this Rectangle instance to `0`s and returns itself. */
	clear(): this;
	/** Returns true if this rectangle's origin and size are equal to `other` rectangle's origin and size. */
	equals(other: Rectangle): boolean;
	/** Returns true if this rectangle's origin and size are equal to `other` rectangle's origin and size to within `epsilon` decimal places of precision. */
	fuzzyEquals(other: Rectangle, epsilon?: number): boolean;
	/** Clones this Rectangle, adds `origin` to both origin coordinates and `size` to both size coordinates, and returns the new instance.  */
	adjusted(origin: number | PointType, size: number | SizeType): Rectangle;
	/** Clones this Rectangle, adds `origin` to both origin coordinates and `right` and `bottom` to size coordinates, and returns the new instance. */
	adjusted(origin: number | PointType, right: number, bottom: number): Rectangle;
	/** Adds given offsets to a copy of this rectangle and returns the copy. */
	adjusted(left: number, top: number, right: number, bottom: number): Rectangle;
	/** Adds `origin` to both origin coordinates and `size` to both size coordinates of this instance and returns itself. */
	adjust(origin: number | PointType, size: number | SizeType): this;
	/** Adds `origin` to both origin coordinates and `right` and `bottom` to size coordinates of this instance and returns itself. */
	adjust(origin: number | PointType, right: number, bottom: number): this;
	/** Adds given values to this rectangle's coordinates and returns this instance. */
	adjust(left: number, top: number, right: number, bottom: number): this;
	/** Combines the bounding area of this rectangle with that of the given rectangle(s) and returns itself. */
	unite(...args: Array<Rectangle>): Rectangle;
	/** Returns the bounding area of this rectangle and the given rectangle(s) as a new `Rectangle` instance. Doesn't modify the original. */
	united(...args: Array<Rectangle>): Rectangle;
	/** Moves the x,y origin of the rectangle by the given offset. Returns itself. */
	translate(offset: PointType): this;
	/** Moves the x,y origin of the rectangle by the given amounts. If `y` is undefined then `x` value is added to both dimensions. Returns itself. */
	translate(x: number, y?: number): this;
	/** Scales this rectangle's `origin.x` and `size.width` by `factor.x` and `origin.y` and `size.height` by `factor.y` values. Returns itself. */
	scale(factor: PointType): this;
	/** Scales this rectangle's `origin` and `size` by `factor`. Returns itself. */
	scale(factor: number): this;
	/** Scales this rectangle's `origin.x` and `size.width` by `factorX` and `origin.y` and `size.height` by `factorY` values. */
	scale(factorX: number, factorY: number): this;
	/** Adds given offsets to a copy of the `rect` Rectangle and returns the copied & adjusted Rectangle. */
	static adjusted(rect: Rectangle, origin: number | PointType, size: number | SizeType): Rectangle;
	/** Clones the `rect` Rectangle, adds `origin` to both origin coordinates and `right` and `bottom` to size coordinates, and returns the new instance. */
	static adjusted(rect: Rectangle, origin: number | PointType, right: number, bottom: number): Rectangle;
	/** Adds given offsets to a copy of `rect` Rectangle and returns the copy. */
	static adjusted(rect: Rectangle, left: number, top: number, right: number, bottom: number): Rectangle;
	/** Adds `origin` to both `rect.origin` coordinates and `size` to both `rect.size` coordinates. The input rectangle is modified. Returns the adjusted Rectangle.  */
	static adjust(rect: Rectangle, origin: number | PointType, size: number | SizeType): Rectangle;
	/** Adds `origin` to both `rect.origin` coordinates and `right` and `bottom` to `rect.size` coordinates. The input rectangle is modified. Returns the adjusted Rectangle. */
	static adjust(rect: Rectangle, origin: number | PointType, right: number, bottom: number): Rectangle;
	/** Adds given offsets to the given rectangle's coordinates. The input rectangle is modified. Returns the adjusted Rectangle. */
	static adjust(rect: Rectangle, left: number, top: number, right: number, bottom: number): Rectangle;
	/** Returns the bounding area of the given rectangle(s) as a new `Rectangle` instance. Doesn't modify inputs. */
	static united(...args: Array<Rectangle>): Rectangle;
	/** Combines the bounding area of `rect` rectangle and the given rectangle(s). The input rectangle is modified and returned. */
	static unite(rect: Rectangle, ...args: Array<Rectangle>): Rectangle;
	/** Moves the x,y origin of the rectangle `rect` by the given offset. The input rectangle is modified and returned. */
	static translate(rect: Rectangle, offset: PointType): Rectangle;
	/** Moves the x,y origin of the rectangle `rect` by the given amounts. If `y` is undefined then `x` value is added to both dimensions. The input rectangle is modified and returned. */
	static translate(rect: Rectangle, x: number, y?: number): Rectangle;
	/** Scales `rect` rectangle's `origin.x` and `size.width` by `factor.x` and `origin.y` and `size.height` by `factor.y` values. The input rectangle is modified and returned. */
	static scale(rect: Rectangle, factor: PointType): Rectangle;
	/** Scales `rect` rectangle's `origin` and `size` by `factor`. The input rectangle is modified and returned. */
	static scale(rect: Rectangle, factor: number): Rectangle;
	/** Scales `rect` rectangle's `origin.x` and `size.width` by `factorX` and `origin.y` and `size.height` by `factorY` values. The input rectangle is modified and returned. */
	static scale(rect: Rectangle, factorX: number, factorY: number): Rectangle;
	static [Symbol.hasInstance](obj: any): boolean;
}
type PointType = {
	x: number;
	y: number;
};
/** `Point` is a static/const container for helper functions to deal with PointType objects,
	such as creating them or doing math operations.  Benchmarks show 40x(!) faster performance
	when creating plain objects vs. classes/function prototypes, although once any members are accessed,
	the difference drops to "only" 2-3 improvement. The performance difference of using instance methods vs. static
	functions (like provided here) is less significant. So in some cases the convenience may outweigh the creation cost.
	Generally, read-only access if faster on plain objects vs. class instances, while changing property values is
	faster on the latter.
	`Point` could be converted to a class with static methods, which in some cases seems to perform (a little) better or
	(much) worse depending on the operation and what is being operated on (plain object or Vect2d class instance), and perhaps other factors.
 */
declare const Point: {
	/** Returns a new `PointType` object with `x` and `y` set from number value(s) or another PointType object.
		When no arguments are used, the default is `0` for both `x` and `y`. */
	readonly "new": (xOrPt?: number | PointType, y?: number) => PointType;
	/** Sets the x and y values of a PointType instance.
		The first parameter can be any object containing 'x' and 'y' properties, or a numeric value for the 'x' value.
		In the latter case, if a 2nd parameter is passed, it is assigned to the 'y' value; otherwise the first parameter
		is used for both 'x' and 'y'. */
	readonly set: (pt: PointType, xOrPt: number | PointType, y?: number) => PointType;
	readonly setFromXY: (pt: PointType, x: number, y?: number) => PointType;
	readonly setFromPt: (pt: PointType, fromPt: PointType) => PointType;
	/** Returns true if both x and y values of `pt` are zero. */
	readonly isNull: (pt: PointType) => boolean;
	/** Returns true if both x and y values of `pt` are within `epsilon` delta of zero. */
	readonly fuzzyIsNull: (pt: PointType, epsilon?: number) => boolean;
	/** Adds value(s) to `pt` and returns it. Modifies input value. */
	readonly plus_eq: (pt: PointType, xOrPt: number | PointType, y?: number) => PointType;
	/** Adds value(s) to `pt` and returns new instance, does not modify input value. */
	readonly plus: (pt: PointType, xOrPt: number | PointType, y?: number) => PointType;
	/** Multiplies `pt` coordinates by value(s) and returns it. Modifies input value. */
	readonly times_eq: (pt: PointType, xOrPt: number | PointType, y?: number) => PointType;
	/** Multiplies `pt` coordinates by value(s) and returns new instance, does not modify input value, */
	readonly times: (pt: PointType, xOrPt: number | PointType, y?: number) => PointType;
	/** Swaps the `x` and `y` values of `pt` and returns it. */
	readonly transpose: (pt: PointType) => PointType;
	/** Returns a new PointType object with the `x` and `y` values of `pt` swapped with each other. */
	readonly transposed: (pt: PointType) => PointType;
	/** Returns true is this PointType equals the given PointType or x & y values. */
	readonly equals: (pt: PointType, xOrPt: number | PointType, y?: number) => boolean;
	/** Returns true is this PointType equals the given PointType to within `epsilon` decimal places of precision. */
	readonly fuzzyEquals: (pt: PointType, other: PointType, epsilon?: number) => boolean;
	readonly toString: (pt: PointType, name?: string) => string;
};
/** `Vect2d` is a concrete implementation of a `PointType` class. It is generally slower to create and read than a
	"plain" `PointType` object (eg. from `Point.new()`), but OTOH is usually faster when being updated/written.
	Using `Vect2d` is generally recommended for stored objects that persist for some time and/or are likely to get modified. */
declare class Vect2d implements PointType {
	x: number;
	y: number;
	/** A Vect2d instance can optionally be constructed from another PointType object (with 'x' and 'y' properties),
		or from numeric `x[,y]` arguments (see `set()` for details).
		A `Vect2d` constructed with no arguments has both `x` and `y` set to `0`. */
	constructor(xOrPt?: number | PointType, y?: number);
	/** Returns true if both x and y values are zero. */
	get isNull(): boolean;
	/** Returns true if both x and y values are equal to zero to within 4 decimal places of precision. */
	get fuzzyIsNull(): boolean;
	/** Length is the hypotenuse of the x and y values. */
	get length(): number;
	/** Sets the x and y values of this Vect2d instance.
		The first parameter can be any object containing 'x' and 'y' properties, or a numeric value for the 'x' value.
		In the latter case, if a 2nd parameter is passed, it is assigned to the 'y' value; otherwise the first parameter
		is used for both 'x' and 'y' values. */
	set(xOrPt?: number | PointType, y?: number): Vect2d;
	/** Returns a new Vect2d with this instance's `x` and `y` values. */
	clone(): Vect2d;
	/** Adds value(s) to current coordinates. Modifies the current value of this instance and returns itself */
	plus_eq(xOrPt: number | PointType, y?: number): Vect2d;
	/** Adds value(s) to current coordinates and returns a new Vect2d object. */
	plus(xOrPt: number | PointType, y?: number): Vect2d;
	/** Adds value(s) to `v` and returns new instance, does not modify input value. */
	static add(v: Vect2d, xOrPt: number | PointType, y?: number): Vect2d;
	/** Multiplies current coordinates by value(s). Modifies the current value of this instance and returns itself */
	times_eq(xOrPt: number | PointType, y?: number): Vect2d;
	/** Multiplies current coordinates by value(s) and returns a new `Vect2d` object. */
	times(xOrPt: number | PointType, y?: number): Vect2d;
	/** Multiplies `v` coordinates by value(s) and returns new instance, does not modify input value, */
	static multiply(v: Vect2d, xOrPt: number | PointType, y?: number): Vect2d;
	/** Swaps the `x` and `y` values of this vector and returns it. */
	transpose(): Vect2d;
	/** Returns a new `Vect2d` object with the `x` and `y` values of this vector swapped. */
	transposed(): Vect2d;
	/** Returns true is this Vect2d equals the given Vect2d or x & y values. */
	equals(xOrPt: number | PointType, y?: number): boolean;
	/** Returns true is this Vect2d equals the given PointType to within `epsilon` decimal places of precision. */
	fuzzyEquals(other: PointType, epsilon?: number): boolean;
	toString(): string;
	static [Symbol.hasInstance](obj: any): boolean;
}
interface ILayerElement {
	/** @internal */
	readonly layerRole: LayerRole;
	/** @internal */
	loadFromActionData(state: ParseState): ILayerElement;
}
interface IRenderable extends ILayerElement {
	render(context: RenderContext2D, rect?: Rectangle): Promise<void> | void;
}
interface IPathProducer extends ILayerElement {
	getPath(rect?: Rectangle, pathStack?: Array<Path2D>): Path2D;
}
interface IPathHandler extends ILayerElement {
	renderPaths(paths: Array<Path2D>, context?: RenderContext2D, rect?: Rectangle): void;
}
interface IValuedElement extends ILayerElement {
	setValue(value: string): void;
}
interface IColorElement extends ILayerElement {
	setColor(value: string, type: ColorUpdateType): void;
}
/** Draws a values series as a basic vertical bar graph onto a canvas context. */
export declare class BarGraph implements ILayerElement, IRenderable, IValuedElement, IColorElement {
	#private;
	barColor: BrushStyle;
	/** Width of each bar section, in pixels. */
	barWidth: number;
	backgroundColorOn: boolean;
	backgroundColor: BrushStyle;
	/** Maximum width, in pixels, into which the bars need to fit (or height if an orientation option is added).
		Typically this is the size of the icon/image being drawn.
		Values that would cause the graph to draw beyond this extent are removed from the stored values array. */
	maxExtent: number;
	constructor(init?: PartialDeep<BarGraph> & {
		parentIcon?: DynamicIcon;
	});
	/** @internal */
	readonly layerRole: LayerRole;
	/** Returns the currently stored numeric values as a new array.
		Values are represented as decimal percentages in the range of 0.0 - 1.0, inclusive. */
	get values(): Array<number>;
	/** Adds `value` to current array along with the current bar drawing style and
		shifts out old values if necessary based on available size and bar width.
		@param value Fractional percentage, 0.0 - 1.0. The given value is clamped to this range. */
	addValue(value: number): void;
	/** Clears all stored values. */
	clearValues(): void;
	/** Evaluates string value to a number, divides by 100 and calls (@link addValue} with the result. */
	setValue(value: string): void;
	/** @internal */
	setColor(value: string, type: ColorUpdateType): void;
	/** @internal */
	loadFromActionData(state: ParseState): BarGraph;
	/** Draws the bar graph onto `ctx` using `rect` dimensions positioning the graph and scaling the height of the bars. */
	render(ctx: RenderContext2D, rect: Rectangle): void;
}
/** Class for storing a fill or stroke style to use on a Canvas context. */
export declare class BrushStyle {
	#private;
	constructor(init?: PartialDeep<BrushStyle> | string);
	/** Returns `true` if color string is empty and gradient/pattern/texture are all `null`. */
	get isNull(): boolean;
	/** Returns `true` if `isNull` is `true` OR a solid color represents a transparent color. */
	get isEmpty(): boolean;
	/** Returns any color previously set on the `color` property, if any (default is an empty string). */
	get color(): string;
	/** Set brush style as a solid color.

		Input value must be a format accepted by `CanvasRenderingContext2D` `fillStyle` and `strokeStyle` properties:
		a CSS named color, `#RGB[A]` hex values, `rgb[a](r g b [/ a])`, `hsl[a](h s l [/ a])`, or `hwb(h w b [/ a])`

		 Setting a color will override all other styles (even if it is empty or transparent).
	*/
	set color(v: string);
	/** Specifies a gradient to use for the drawing style. Setting a gradient will override all other styles (even if it is `null`). */
	get gradient(): CanvasGradient | null;
	set gradient(v: CanvasGradient | null);
	/** Specifies a pattern to use for the drawing style. Setting a pattern will override all other styles (even if it is `null`). */
	get pattern(): CanvasPattern | null;
	set pattern(v: CanvasPattern | null);
	/** Specifies a texture to use for the drawing style. Setting a texture will override all other styles (even if it is `null`). */
	get texture(): CanvasTexture | null;
	set texture(v: CanvasTexture | null);
	/** Returns the current style to apply to canvas context properties `fillStyle` or `strokeStyle`. */
	get style(): ContextFillStrokeType;
	/** Applies the current `style` property to the given `ctx` as a `fillStyle`, or `strokeStyle` if `asFill` is set to `false`.
		If the current `isNull` property returns `true` then no styles are applied. */
	render(ctx: RenderContext2D, asFill?: boolean): void;
}
export declare class CanvasFilter implements ILayerElement, IRenderable, IValuedElement {
	filter: string;
	constructor(init?: Partial<CanvasFilter>);
	/** @internal */
	readonly layerRole: LayerRole;
	get isEmpty(): boolean;
	setValue(value: string): void;
	loadFromActionData(state: ParseState): CanvasFilter;
	render(ctx: RenderContext2D): void;
}
/** The type of clipping to apply when using {@link ClippingMask} element. */
export declare const enum ClipAction {
	/** Apply clip using path fill area as the mask (clips out anything outside the path area). */
	Normal = 0,
	/** Apply clip using inverse of path fill area as mask (clips out everything inside the path area). */
	Inverse = 1,
	/** Reset any previously applied clipping. */
	Release = 2
}
/** Applies a `clip(path)` operation to the current canvas context using given path(s).
	The mask can optionally be inverted against a given rectangle (eg. the drawing area).
	It can also "release" a clipped canvas by redrawing the current contents onto a new unclipped canvas.
 */
export declare class ClippingMask implements IPathHandler {
	/** Type of clip to apply, or `ClipAction.Release` to remove clipping. */
	action: ClipAction;
	/** Fill rule to use when clipping using intersecting paths. One of: "evenodd" or "nonzero" */
	fillRule: CanvasFillRule;
	constructor(init?: Partial<ClippingMask>);
	/** @internal */
	readonly layerRole: LayerRole;
	/** @internal */
	loadFromActionData(state: ParseState): ClippingMask;
	/** Applies clipping mask to `ctx` using all paths in `paths` array if {@link action} property is `ClipAction.Normal` or `ClipAction.Inverse`.
		`rect` area is used to calculate an inverse clip.
		If {@link action} is `ClipAction.Release` then will remove any clipping on the `ctx` by redrawing it onto a fresh canvas of same size as `ctx.canvas`. */
	renderPaths(paths: Path2D[], ctx: RenderContext2D, rect: Rectangle): void;
}
export declare class CompositionMode implements ILayerElement, IRenderable {
	mode: GlobalCompositeOperation;
	/** @internal */
	readonly layerRole: LayerRole;
	get isEmpty(): boolean;
	loadFromActionData(state: ParseState): CompositionMode;
	render(ctx: RenderContext2D): void;
}
/** Applies a drawing style to a canvas context or `Path2D` objects, which includes all fill, stroke, and shadow attributes. */
export declare class DrawingStyle implements ILayerElement, IPathHandler, IColorElement {
	/** Style to apply as context `fillStyle` property. */
	fill: BrushStyle;
	/** Defines how to apply the fill style when filling `Path2D` paths. One of: "evenodd" or "nonzero" */
	fillRule: CanvasFillRule;
	/** Styles to apply as context `strokeStyle`, `line*`, and `miterLimit` properties (and `setLineDash()` method). */
	stroke: StrokeStyle;
	/** Styles to apply as context `shadow*` properties. */
	shadow: ShadowStyle;
	/** When styling `Path2D` paths, the stroke is to be drawn on top of the fill if this property is `true`, otherwise it will draw under the fill
		(only half the line width will protrude around the filled area). */
	strokeOver: boolean;
	constructor(init?: PartialDeep<DrawingStyle>);
	/** @internal */
	readonly layerRole: LayerRole;
	/** Returns true if there is nothing at all to draw for this style: fill is transparent, stroke is zero size, and there is no shadow.  */
	get isEmpty(): boolean;
	/** @internal */
	setColor(value: string, type: ColorUpdateType): void;
	/** @internal Returns `true` if stroke line width/unit or shadow properties have changed. */
	loadFromDataRecord(dr: TpActionDataRecord): boolean;
	/** @internal */
	loadFromActionData(state: ParseState, dataIdPrefix?: string): DrawingStyle;
	/** Applies current fill, stroke, and shadow styling properties to the given canvas `ctx`. `rect` size is used to scale relative-sized stroke width. */
	render(ctx: RenderContext2D, rect?: Rectangle): void;
	/** Fills and strokes each path in the given array using `DrawingStyle.renderPath()` method. **The given `paths` array is cleared.** */
	renderPaths(paths: Path2D[], ctx: RenderContext2D, rect: Rectangle): void;
	/** Fills and strokes the given path onto context using the current drawing style settings.
	 * The context is saved before drawing and restored afterwards.
	 * Any shadow is applied to fill layer, unless that is transparent, in which case it is applied on the stroke.
	 * The stroke can be drawn under or on top of the fill, depending on the value of `strokeOver` property.
	 * If a `rect` is given it will be passed on to StrokeStyle which will automatically scale itself if necessary.
	 */
	renderPath(ctx: RenderContext2D, path: Path2D, rect?: Rectangle): void;
	/** Draws just the current stroke (line) style onto the given path, with or w/out the current shadow (if any).
	 * It does NOT save or restore full context, only shadow properties (if a shadow is used).
	 */
	strokePath(ctx: RenderContext2D, path: Path2D, withShadow?: boolean, rect?: Rectangle): void;
}
/**
	This class hold an image source (file path or b64 string) and associated data like processing options and a transformation to apply.

	It makes use of a global image cache for storing & retrieving the actual images.

	The `render()` method will take care of any required scaling (according to the {@link resizeOptions.fit} property setting)
	and apply the {@link transform}, if needed.
*/
export declare class DynamicImage implements ILayerElement, IRenderable, IValuedElement {
	/** Path to image file or a base-64 encoded string containing image data.
		Relative paths are resolved against default file path configured in plugin settings, if any. */
	source: string;
	/** The icon name to which this image is assigned. This is required for image cache management. */
	iconName: string;
	/** Settings to determine how images are resized to fit into drawing area. */
	resizeOptions: {
		/** Defines how to resize image. Equivalent to the CSS {@link https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit | object-fit} property.
			One of: "contain", "cover", "fill", "scale-down", or "none" */
		fit: ResizeFitOption;
	};
	/** Tranformation to apply to this image when drawn. See {@link Transformation} for details. */
	readonly transform: Transformation;
	/** Constructor argument requires an object with either `iconName: string` or `parentIcon: DynamicIcon` properties. */
	constructor(init: RequireAtLeastOne<PartialDeep<DynamicImage & {
		fit: ResizeFitOption;
	}> & {
		parentIcon?: DynamicIcon;
	}, "iconName" | "parentIcon">);
	/** @internal */
	readonly layerRole: LayerRole;
	/** Returns true if source string is empty */
	get isEmpty(): boolean;
	/** Sets/updates the image source using an evaluated string. */
	setValue(value: string): void;
	/** @internal Used by plugin action handler for tx update action. */
	loadTransform(dr: TpActionDataRecord): void;
	/** @internal */
	loadFromActionData(state: ParseState): DynamicImage;
	/** Scales `imgRect` to size of `intoRect` based on `fit` strategy. Also centers `imgRect` if it is smaller than `intoRect` in either dimension.

		Modifies `imgRect` input, returns undefined. */
	static scaleImageRect(imgRect: Rectangle, intoRect: Rectangle, fit: ResizeFitOption): void;
	/** Loads and draws source image onto the given `ctx` using all current properties such as resize strategy and transformation steps. */
	render(ctx: RenderContext2D, rect: Rectangle): Promise<void>;
}
type SizedElementInit = PartialDeep<SizedElement> & {
	width?: number | string;
	height?: number | string;
};
/** Base class for any element needing size, alignment, and offset properties. Not drawable on its own and cannot be created directly. */
export declare class SizedElement {
	/** A zero width/height (default) indicates to draw into the full available image area (eg. passed to `render()` in `rect` argument). Negative values are not allowed. */
	width: UnitValue;
	height: UnitValue;
	/** How to align within drawing area if/when `width`/`height` doesn't fill it completely. */
	alignment: Alignment;
	/** Extra position offset to apply after alignment. Expressed as a percentage of overall drawing area size. */
	offset: Vect2d;
	protected constructor(init?: SizedElementInit);
	protected init(init?: SizedElementInit, depth?: number): void;
	/** Always returns false since a zero size will actually fill a drawing area. */
	get isEmpty(): boolean;
	/** Alignment value as two string values, first for vertical and second for horizontal. Eg. "top left" or "center middle".
		Setting the property can be done with either a single direction or both (separated by space or comma) in either order. */
	get align(): string;
	set align(value: string | Alignment);
	/** Horizontal alignment value as string. One of: 'left', 'center', 'right' */
	get halign(): CanvasTextAlign;
	set halign(value: CanvasTextAlign | Alignment);
	/** Vertical alignment value as string. One of: 'top', 'middle', 'bottom' */
	get valign(): CanvasTextBaseline;
	set valign(value: CanvasTextBaseline | Alignment);
	/** Sets element width and height property values with optional unit type specifier to use for both dimensions.
		If `unit` is undefined then the current unit types for each dimension remain unchanged. */
	setSize(size: SizeType, unit?: string, unitY?: string): void;
	/** Returns actual pixel width of this element, either scaled to `viewWidth` if width unit is `%`
		or actual width value if it is in pixels already. If this element's width value is zero then return `viewWidth`. */
	actualWidth(viewWidth: number): number;
	/** Returns actual pixel height of this element, either scaled to `viewHeight` if height unit is `%`
		or actual height value if it is in pixels already. If this element's height value is zero then return `viewHeight`. */
	actualHeight(viewHeight: number): number;
	/** Returns actual pixel width and height of this element, potentially scaled to `viewSize`.
		See {@link actualWidth} and {@link actualHeight} for details on returned values. */
	actualSize(viewSize: SizeType): SizeType;
	/** Returns true if alignment value was changed, false otherwise. */
	protected setAlignment(value: Alignment, mask: Alignment): boolean;
	/** Returns true if any properties were changed. */
	protected loadFromDataRecord(dr: TpActionDataRecord): boolean;
	protected computeAlignmentHOffset(bounds: Rectangle, rect: Rectangle, adjustLeft?: boolean): number;
	protected computeAlignmentVOffset(bounds: Rectangle, rect: Rectangle, adjustTop?: boolean): number;
	protected computeOffset(bounds: Rectangle, rect: Rectangle, adjustTopLeft?: boolean): PointType;
	protected computeBounds(rect: Rectangle): Rectangle;
}
declare class PathCache {
	path: Path2D | null;
	size: Size | null;
	clear(): void;
	isDirtyForSize(size: Size): boolean;
}
type PathInit = SizedElementInit & PartialDeep<Path>;
/** Base class for Path elements. Extends {@link SizedElement} with {@link operation} property and provides helper methods. */
export declare class Path extends SizedElement {
	/** Boolean operation to perform with previous path, if any.
		May be used by subclasses in their `IPathProducer#getPath` method to automatically combine with other paths. */
	operation: PathBoolOperation;
	/** Cache for generated `Path3D` objects, possibly scaled to a particular size. May be used by subclasses.
		@see {@link clearCache}. */
	protected readonly cache: PathCache;
	readonly layerRole: LayerRole;
	protected constructor(init?: PathInit);
	/** Clears the generated & cached Path2D object (if any). Some `Path` subclasses my not use the cache.
		Typically the cache management is handled automatically when relevant properties are modified. */
	clearCache(): void;
	/** Parses a string value into an `PathBoolOperation` enum type result and returns it, or PathBoolOperation.None if the value wasn't valid. */
	protected parsePathOperation(value: string): PathBoolOperation;
	/** @internal  Returns true if any parent `SizedElement` properties were changed. */
	protected loadFromDataRecord(dr: TpActionDataRecord): boolean;
	protected getCombinedPath(path: Path2D, pathStack?: Array<Path2D>): Path2D;
}
type EllipsePathInit = PathInit & PartialDeep<EllipsePath>;
/** Creates a full or partial ellipse/circle/arc path of given diameter, start and end angle values,
	draw direction, and optional rotation around center. Essentially a proxy for `Path2D.ellipse()` method.
	The `IValuedElement::setValue()` interface sets the arc's ending angle. */
export declare class EllipsePath extends Path implements ILayerElement, IPathProducer, IValuedElement {
	/** Starting angle in radians (0 points east) */
	startAngle: number;
	/** Ending angle in radians (0 points east) */
	endAngle: number;
	/** Rotation angle in radians (0 points east) */
	rotation: number;
	/** Drawing direction, clockwise (0), counter-clockwise (1), or automatic (2) based on value being positive (CW) or negative (CCW). */
	direction: ArcDrawDirection;
	constructor(init?: EllipsePathInit);
	/** Returns true if the diameter on either axis is empty (width or height are zero) */
	get isEmpty(): boolean;
	/** Sets the ending angle of the arc using evaluated string value. */
	setValue(value: string): void;
	loadFromActionData(state: ParseState, statePrefix?: string): EllipsePath;
	/** Returns the ellipse as a `Path2D` object, scaled to fit into `rect` bounds (if size units are relative), and combined
		with any paths in the `pathStack` according to value of the {@link operation} property. */
	getPath(rect: Rectangle, pathStack: Array<Path2D>): Path2D;
}
type FreeformPathInit = PathInit & PartialDeep<FreeformPath>;
/**
	An element for drawing paths/shapes, eg. for styled drawing or for clipping.
	A path can be specified with either an array of points or an SVG syntax path.
	When using arrays of points, multiple line segments can be specified by wrapping
	each segment in its own array.
 */
export declare class FreeformPath extends Path implements ILayerElement, IPathProducer, IValuedElement {
	#private;
	/** When `true`, path is scaled to size of drawing rectangle. */
	relativeUnits: boolean;
	/** `true` if a `closePath()` should be used at the of each line segment when crating
		paths from arrays of points (ignored for SVG paths, use 'Z'/'z' instead). */
	closePath: boolean;
	constructor(init?: FreeformPathInit);
	/** Returns `true` if there are fewer than 2 points to draw and has no SVG path. */
	get isEmpty(): boolean;
	/** Returns the currently cached Path2D object, if any, or `null` otherwise. */
	get path(): Path2D | null;
	/** Explicitly sets the cached `Path3D` object to `path`.
		A new path will not be re-generated unless `svgPath` or `lines` properties are set, or cache is explicitly cleared with `clearCache()`.
		The path will still be scaled and aligned in {@link getPath()}, if needed, and the new scaled/aligned path will then be cached. */
	set path(path: Path2D | null);
	/** Set or get the path definition as an SVG path string.
		Reading the property returns empty unless the property was explicitly set previously. */
	get svgPath(): string;
	set svgPath(path: string);
	/** Set or get the path definition as an array or line coordinates.
		Reading the property returns an empty array unless the property was explicitly set previously. */
	get lines(): Array<PointType[]>;
	set lines(lines: Array<PointType[]>);
	/** Appends an array of points to the current lines array. */
	appendLine(line: Array<PointType>): void;
	/** Clears all coordinates in the current lines array. */
	clearLines(): void;
	/** Parses and sets the path from an evaluated string value, with minimal validation.
		First checks value against the cached last value. Returns `false` if the path hasn't changed or couldn't be loaded.

		Accepted path values:
		```
			"x,y" || "[x,y]" - single point (<pt>), y is optional (defaults to x)
			"<pt>, <pt>, ..." - Multiple points on one path; at least 2 points are required
			"[  <pt>, <pt>, ...], [ <pt>, <pt>, ...], ..." - Multiple paths
			"M..." or "m..." - An SVG path; The action data is evaluated as an interpolated string for embedded JS ('${...}')
			"() => {...}" - A function returning either a points array or an SVG path string.
		```
	*/
	setPathFromString(value: string): boolean;
	/** @internal */
	setValue(value: string): boolean;
	/** @internal */
	loadFromActionData(state: ParseState, statePrefix?: string): FreeformPath;
	private parsePoints;
	private createPath;
	/** Returns the defined path as a `Path2D` object, scaled to fit into `rect` bounds (if size units are relative), and combined
		with any paths in the `pathStack` according to value of the {@link operation} property. */
	getPath(rect: Rectangle, pathStack?: Array<Path2D>): Path2D;
}
type RectanglePathInit = PathInit & PartialDeep<RectanglePath>;
/** Creates a rectangle path with optional radii applied to any/all of the 4 corners (like CSS). */
export declare class RectanglePath extends Path implements IPathProducer {
	#private;
	/** `true` if radius values in `radii` array are given in percentages, or `false` if they represent absolute pixels. Default is `true`. */
	radiusIsRelative: boolean;
	/** This property indicates if any positive radius values have been set. Can be used to determine if a faster `rect()` can be drawn instead of `roundRect()`. */
	protected haveRadius: boolean;
	constructor(init?: RectanglePathInit);
	/** Validates the value types in given array and that none of the values are `< 0`;
		Turns all single numeric values into `{x,y}` PointType objects. **Modifies the input array** if needed.
		Any array members which are neither numeric nor `{x,y}` objects are replaced with a zero value. */
	static cleanRadiusArray(radii: Array<PointType | number>): asserts radii is Array<PointType>;
	/** Returns true if the rectangle is empty (width or height are zero) */
	get isEmpty(): boolean;
	/** `radii` value is like css border-radius, an array of 1-4 "point-like" objects (`{x,y}`) starting at top left corner, etc.
		Empty array for no radius. Values can be in either percent of overall size (like CSS border-radius %) or in absolute pixels,
		depending on the {@link radiusIsRelative} property. Radius values cannot be negative.

		See `radii` param at https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect#syntax
	*/
	get radii(): Array<PointType>;
	/** The radii can be set using an array of 1-4 numbers or `PointType` `{x,y}` objects, or a single numeric value (for all 4 corners). */
	set radii(radii: Array<number | PointType> | number);
	/** Returns `true` if `radii` argument array equals current `radii` property. */
	protected compareRadii(radii: Array<PointType>): boolean;
	/** Parses string value to radii array and returns `true` if radius array has changed from saved version. */
	protected parseRadius(value: string): boolean;
	/** @internal  Returns true if any properties were changed. */
	loadFromDataRecord(dr: TpActionDataRecord): boolean | any;
	/** @internal */
	loadFromActionData(state: ParseState, statePrefix?: string): RectanglePath;
	/** Returns a copy of the current {@link radii} property with each member scaled by `ratio` amount. */
	scaledRadii(ratio: number): Array<number | PointType>;
	/** Returns the rectangle as a `Path2D` object, scaled to fit into `rect` bounds (if size units are relative), and combined
		with any paths in the `pathStack` according to value of the {@link operation} property. */
	getPath(rect: Rectangle, pathStack?: Array<Path2D>): Path2D;
}
type StyledRectangleInit = RectanglePathInit & PartialDeep<StyledRectangle>;
/** Draws a rectangle shape on a canvas context with optional radii applied to any/all of the 4 corners (like CSS). The shape can be fully styled with the embedded `DrawingStyle` property. */
export declare class StyledRectangle extends RectanglePath implements ILayerElement, IRenderable, IColorElement {
	/** Fill and stroke style to apply when drawing this element. */
	style: DrawingStyle;
	/** Whether to adjust (reduce) the overall drawing area size to account for shadow offset/blur. */
	adjustSizeForShadow: boolean;
	constructor(init?: StyledRectangleInit);
	/** @internal */
	readonly layerRole: LayerRole;
	/** Returns true if there is nothing to draw: there is no fill and stroke width is zero */
	get isEmpty(): boolean;
	/** @internal */
	setColor(value: string, type: ColorUpdateType): void;
	/** @internal */
	loadFromActionData(state: ParseState): StyledRectangle;
	/** Draws the rectangle with all styling and positioning options applied onto `ctx` using `rect` dimensions for scaling and alignment. */
	render(ctx: RenderContext2D, rect: Rectangle): void;
	/** The actual drawing implementation. May be used by subclasses.
		Returns the area left over "inside" the rectangle after adjusting for stroke and/or shadow. */
	protected renderImpl(ctx: RenderContext2D, rect: Rectangle): Rectangle;
}
/** Progress bar incremental direction. */
export declare const enum DrawDirection {
	/** Left to right or bottom to top. */
	Normal = 0,
	/** Right to left or top to bottom. */
	Reverse = 1,
	/** Draw from center in both directions at the same time. */
	Center = 2,
	/** Draw from center with direction depending on current value's sign,
		towards left/bottom for negative values or to right/top for positive ones. TODO */
	CenterAuto = 3
}
/** A progress bar is essentially two rectangles, one inside the other, with the inner one changing length to represent a percentage value.
	The outer container and inner value boxes can be fully styled with the embedded `DrawingStyle` properties.
	This class inherits from `StyledRectangle` which is used for the outer container box, and holds additional properties to control the
	inner value part.  Any corner radius set on the outer container box will also be applied to the inner value part (after some adjustments for size).
*/
export declare class LinearProgressBar extends StyledRectangle implements ILayerElement, IValuedElement, IColorElement {
	orientation: Orientation;
	direction: DrawDirection;
	/** Styling properties for the inner value part of the progress bar. The outer container is styled by the parent's {@link StyledRectangle#style} property. */
	valueStyle: DrawingStyle;
	/** Progress bar value in percent, 0-100. */
	value: number;
	/** Padding controls how much space to leave around the outside of the progress bar relative to the total drawing area.
		It determines the final size of the progress bar based on orientation. With `width` value determines padding along
		the long edges of the bar, and `height` sets the padding around the endpoints (short edges). */
	padding: SizeType;
	constructor(init?: StyledRectangleInit & PartialDeep<LinearProgressBar>);
	/** @internal */
	readonly layerRole: LayerRole;
	/** Sets current {@link LinearProgressBar#value} property using an evaluated string. */
	setValue(value: string): void;
	/** @internal */
	setColor(value: string, type: ColorUpdateType): void;
	/** Returns true if there is nothing to draw: size is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
	get isEmpty(): boolean;
	/** @internal */
	loadFromActionData(state: ParseState): LinearProgressBar;
	render(ctx: RenderContext2D, rect: Rectangle): void;
}
type GaugeTicksInit = SizedElementInit & PartialDeep<GaugeTicks>;
type TickProperties = {
	type: 0 | 1;
	count: number;
	len: UnitValue;
	place: Placement;
	path: Path2D | null;
	stroke: StrokeStyle;
};
type PathMetrics = ReturnType<GaugeTicks["metrics"]>;
type TickMetrics = PathMetrics & {
	ticksCount: number;
	tickLen: number | number[];
};
type LabelMetrics = PathMetrics & {
	offset: number;
	position: 1 | -1;
};
/**
	Abstract base class for drawing "tick" marks and/or value labels, for use in a gauge indicator.
	Ticks can be split into "major" and "minor" divisions with separate spacing, size and styling options.
	Label text, font, color, and other presentation properties are configured independently from the tick marks.
*/
export declare abstract class GaugeTicks extends SizedElement {
	#private;
	/** The constructor doesn't call `super.init(init)`, subclasses should do that. */
	protected constructor(init?: GaugeTicksInit);
	/** @internal */
	readonly layerRole: LayerRole;
	/** Returns true if there is nothing to draw: Zero ticks and labels, zero width or height, or all styling would be invisible. */
	get isEmpty(): boolean;
	/** Returns `true` if there are any labels to be drawn. */
	get hasLabels(): boolean;
	protected get ticks(): [
		TickProperties,
		TickProperties
	];
	protected get majTicks(): TickProperties;
	protected get minTicks(): TickProperties;
	/** If `true` (default), scale down the overall size of the generated path (all ticks and labels together) to fit within the available canvas size if it would otherwise overflow. */
	get scaleToFit(): boolean;
	set scaleToFit(v: boolean);
	/** Total number of major tick marks to draw along the curve. This will also determine the spacing (number of degrees) between ticks. */
	get majTicksCount(): number;
	set majTicksCount(v: number);
	/** Length of each major tick mark, in either % or px units. Relative size is calculated based on overall image size. */
	get majTicksLen(): number;
	set majTicksLen(v: number | string);
	/** Length unit for each major tick mark, either `%` or `px`. */
	get majTicksLenUnit(): string;
	set majTicksLenUnit(v: string);
	/** Configures in which direction to draw major tick marks relative to the curve radius. `Inside` will draw from curve radius to the inside of the circle,
		`Outside` will draw from radius towards the outside, and `Center` will split the difference with each mark being centered along the radius. */
	get majTicksPlace(): Placement;
	set majTicksPlace(v: Placement | string);
	/** Major tick marks `StrokeStyle` object. Read-only. */
	get majTicksStroke(): StrokeStyle;
	/** Major tick marks stroke color. */
	get majTicksColor(): string;
	set majTicksColor(v: string);
	/** Major tick marks stroke size and unit. */
	get majTicksWidth(): string;
	set majTicksWidth(v: string);
	/** Gets or sets the `Path2D` object representing the major ticks marks to be drawn. */
	get majTicksPath(): Path2D | null;
	set majTicksPath(v: Path2D | null);
	/** The number of minor tick marks to draw between each major tick (not a total number). This will also determine the spacing (number of degrees) between minor ticks. */
	get minTicksCount(): number;
	set minTicksCount(v: number);
	/** Length of each minor tick mark, in either % or px units. Relative size is calculated based on overall image size. */
	get minTicksLen(): number;
	set minTicksLen(v: number | string);
	/** Length unit for each minor tick mark, either `%` or `px`. */
	get minTicksLenUnit(): string;
	set minTicksLenUnit(v: string);
	/** Configures in which direction to draw minor tick marks relative to the curve radius. `Inside` will draw from curve radius to the inside of the circle,
		`Outside` will draw from radius towards the outside, and `Center` will split the difference with each mark being centered along the radius. */
	get minTicksPlace(): Placement;
	set minTicksPlace(v: Placement | string);
	/** Minor tick marks `StrokeStyle` object. Read-only. */
	get minTicksStroke(): StrokeStyle;
	/** Minor tick marks stroke color. */
	get minTicksColor(): string;
	set minTicksColor(v: string);
	/** Minor tick marks stroke size and unit. */
	get minTicksWidth(): string;
	set minTicksWidth(v: string);
	/** Gets or sets the `Path2D` object representing the minor ticks marks to be drawn. */
	get minTicksPath(): Path2D | null;
	set minTicksPath(v: Path2D | null);
	/** Array of strings to be used as label text. Empty for no labels.
		The individual label values will be distributed evenly along the curve from `startAngle` to `endAngle` (inclusive). */
	get labels(): string[];
	set labels(v: string[]);
	/** Controls label placement, `Placement.Inside` to put labels inside the curve, or `Placement.Outside` to place them outside the curve. */
	get labelsPlace(): Placement;
	set labelsPlace(v: Placement | string);
	get labelsAlign(): Alignment;
	set labelsAlign(v: Alignment | string);
	/** Controls label rotation.
		For linear marks this sets rotation from horizontal, in degrees.
		For circular, 0 = no rotation, 1 = rotate to inside, -1 = rotate to outside. */
	get labelsRotate(): number;
	set labelsRotate(v: number | string);
	/** Expands or contracts the space between label text and the tick marks. Expressed as percent of overall image size. Default is `0`. */
	get labelsPadding(): number;
	set labelsPadding(v: number | string);
	/** CSS font specification for labels text. */
	get labelsFont(): string;
	set labelsFont(v: string);
	/** Letter spacing property expressed as a CSS `length` value, eg: "2px" or "1em". Default is `0px`. */
	get labelsSpacing(): string;
	set labelsSpacing(v: string);
	/** Labels fill `BrushStyle`. Read-only. */
	get labelsStyle(): BrushStyle;
	/** Labels fill color. */
	get labelsColor(): string;
	set labelsColor(v: string);
	/** Gets or sets the `Path2D` object representing the labels to be drawn. */
	get labelsPath(): Path2D | null;
	set labelsPath(v: Path2D | null);
	/** @internal `ColorUpdateType.Fill` set label color and `ColorUpdateType.Stroke` sets stroke color for both major and minor ticks. */
	setColor(value: string, type: ColorUpdateType): void;
	protected clearCache(): void;
	protected setTickCount(t: TickProperties, v: number): void;
	protected setTickLen(t: TickProperties, v: number | string): void;
	protected setTickLenUnit(t: TickProperties, v: string): void;
	protected setTickPlace(t: TickProperties, v: Placement | string): void;
	protected loadTickData(idx: 0 | 1, record: TpActionDataRecord): void;
	/** @internal */
	protected loadFromDataRecord(dr: TpActionDataRecord): boolean;
	/** Label values can be specified as a numeric range and count (eg. "0-360 / 4")
		or as a CSV series of strings (eg. "N, E, S, W"). The string is evaluated before parsing,
		so embedded JS (in ${...} blocks) can be executed, for example to generate a dynamic array of formatted values. */
	protected parseLabelValues(value: string): void;
	protected abstract generateTicksPath(tick: TickProperties, metrics: TickMetrics): void;
	protected abstract generateLabelsPath(ctx: RenderContext2D, metrics: LabelMetrics): void;
	protected generateTicksType(tick: TickProperties, m: PathMetrics): void;
	protected generateTicks(m: PathMetrics): void;
	protected generateLabels(ctx: RenderContext2D, m: PathMetrics): void;
	protected metrics(rect: Rectangle): {
		w: number;
		h: number;
		rX: number;
		rY: number;
		cX: number;
		cY: number;
		lenScl: number;
	};
	protected generatePaths(ctx: RenderContext2D, rect: Rectangle): {
		offset: PointType;
		scale: number;
	};
	/** Draws the gauge marks with all styling and positioning options applied onto `ctx` using `rect` dimensions for scaling and alignment. */
	render(ctx: RenderContext2D, rect: Rectangle): void;
}
type CircularTicksInit = GaugeTicksInit & PartialDeep<CircularTicks>;
/** Implementation of GaugeTicks for drawing ticks/labels along a circular/curved path. */
export declare class CircularTicks extends GaugeTicks implements ILayerElement, IRenderable, IColorElement {
	#private;
	constructor(init?: CircularTicksInit);
	/** Returns true if there is nothing to draw: Start angle == end, zero ticks or labels, or all styling would be invisible. */
	get isEmpty(): boolean;
	/** Starting angle of ticks curve, in degrees. 0° points north. */
	get startAngle(): number;
	set startAngle(v: number);
	/** Ending angle of ticks curve, in degrees. 0° points north. */
	get endAngle(): number;
	set endAngle(v: number);
	/** Normalized (0-360) angle difference between `startAngle` and `endAngle`. Read-only. */
	get angleDelta(): number;
	/** Flag indicating if the labels should be auto-rotated to follow the drawing angle from center of gauge.
		`Placement.Inside` will rotate to face inward, `Placement.Outside` will rotate to face outward, otherwise no auto rotateion is applied.
		In the first two cases, any further {@link labelsRotate} property adjustment is applied relative to the rotated label. */
	get labelsAngled(): Placement;
	set labelsAngled(v: Placement | string);
	/** @internal */
	loadFromActionData(state: ParseState): CircularTicks;
	protected generateTicksPath(tick: TickProperties, m: TickMetrics): void;
	protected generateLabelsPath(ctx: RenderContext2D, m: LabelMetrics): void;
}
type LinearTicksInit = GaugeTicksInit & PartialDeep<LinearTicks>;
/** Implementation of `GaugeTicks` for drawing ticks/labels along a linear path, either horizontally or vertically. */
export declare class LinearTicks extends GaugeTicks implements ILayerElement, IRenderable, IColorElement {
	#private;
	constructor(init?: LinearTicksInit);
	/** Tick path orientation. Ticks are drawn perpendicular to this path. */
	get orientation(): Orientation;
	set orientation(v: Orientation | string);
	/** @internal */
	loadFromActionData(state: ParseState): LinearTicks;
	protected generateTicksPath(tick: TickProperties, m: TickMetrics): void;
	protected generateLabelsPath(ctx: RenderContext2D, m: LabelMetrics): void;
}
/** Draws an arc/circle extending from 0 to 360 degrees based on a given value onto a canvas context. */
export declare class RoundProgressGauge implements ILayerElement, IRenderable, IValuedElement, IColorElement {
	/** Gauge value as decimal percent, -1 through 1 */
	value: number;
	/** A highlight is a copy of the value track with a blur filter applied, drawn behind the value track itself and with the same color. */
	highlightOn: boolean;
	/** Shadow color to draw behind the gauge area. Use any transparent color to disable. */
	readonly shadowColor: BrushStyle;
	/** Starting angle in radians. 0 points east, default is west. */
	startAngle: number;
	/** Drawing direction, clockwise (0), counter-clockwise (1), or automatic (2) based on value being positive (CW) or negative (CCW). */
	direction: ArcDrawDirection;
	/** The background follows the radius of the gauge, not the full icon drawing area. */
	readonly backgroundColor: BrushStyle;
	/** Radius of gauge arc, expressed as decimal percentage of half of the overall drawing size (eg. radius of 0.5 would be one quarter of the overall image size). */
	radius: number;
	/** Style to use for drawing the value track. (The track cannot be filled, only stroked.) */
	readonly lineStyle: StrokeStyle;
	constructor(init?: PartialDeep<RoundProgressGauge>);
	/** @internal */
	readonly layerRole: LayerRole;
	/** Sets {@link RoundProgressGauge#value} property using an evaluated string. */
	setValue(value: string): void;
	/** @internal */
	setColor(value: string, type: ColorUpdateType): void;
	/** @internal */
	loadFromActionData(state: ParseState): RoundProgressGauge;
	/** Draws this gauge at its current `value` property onto `ctx` using `rect` dimensions for scaling. */
	render(ctx: RenderContext2D, rect: Rectangle): void;
}
declare const enum LogLevel {
	ANY = 0,// log all levels
	TRACE = 1,
	DEBUG = 2,
	INFO = 3,
	WARNING = 4,
	ERROR = 5,
	CRITICAL = 6,// throws Error exception after logging
	NONE = 7
}
/** Use `logging.getLogger()` method (from `LogManager`) to get a new instance of a Logger. */
export declare class Logger {
	/** The module name this Logger is for. */
	module: string;
	/** The minimum severity level of messages this logger will output. */
	minLevel: LogLevel;
	/**
	 * Main logging method.
	 * @param logLevel Message severity.
	 * @param message Message body.
	 * @param ...args Additional formatting substitution values (like console.log(), et. al.).
	 */
	log(logLevel: LogLevel, message: any, ...args: any[]): void;
	/** Convenience for `log(LogLevel.TRACE, message, ...args)` */
	trace(message: any, ...args: any[]): void;
	/** Convenience for `log(LogLevel.DEBUG, message, ...args)` */
	debug(message: any, ...args: any[]): void;
	/** Convenience for `log(LogLevel.INFO, message, ...args)` */
	info(message: any, ...args: any[]): void;
	/** Convenience for `log(LogLevel.WARNING, message, ...args)` */
	warn(message: any, ...args: any[]): void;
	/** Convenience for `log(LogLevel.ERROR, message, ...args)` */
	error(message: any, ...args: any[]): void;
	/** Convenience for `log(LogLevel.CRITICAL, message, ...args)`.
	 * After logging the message, it also throws an `Error` type exception with the same message
	 * and the location of the original call to `critical()` as the error's `cause` property. */
	critical(message: any, ...args: any[]): void;
	private logManager;
	/** Typically you would not construct a Logger directly but instead use `logging().getLogger()` or `LogManager.instance().getLogger()`. */
	constructor(logManager: EventEmitter, module: string, minLevel: LogLevel);
	private log_impl;
}
/** This class will run a user-provided script in a (somemwhat) isolated Node VM environment.

The script will be provided with the current canvas context to draw onto and the drawing area rectangle.
An argument string can also be passed to the script.

The context (environment) the script runs in contains many of the classes & utilities used internally
(like `DOMMatrix`, `Canvas`, `loadImage()`, etc) as well as all the existing layer elements (`StyledText`, `RectanglePath`, etc).
A `logger` instance, `console` and `require` are also provided.

@internal
*/
export declare class Script implements ILayerElement, IRenderable, IValuedElement {
	#private;
	/** Argument string to pass to the script's context object in `render()`. */
	args: string;
	readonly log: Logger;
	constructor(init: {
		parentIcon: DynamicIcon;
	} & PartialDeep<Script>);
	/** @internal */
	readonly layerRole = LayerRole.Drawable;
	/** Returns true if no script source has been specified. */
	get isEmpty(): boolean;
	/** Path to script file. Relative paths are resolved against default file path configured in plugin settings, if any. */
	get source(): string;
	set source(path: string);
	/** Get or set the script's timeout setting. This determines how long to wait for the script to complete before killing it. */
	get timeout(): number;
	set timeout(ms: number);
	get iconName(): string;
	/** Sets/updates the script arguments ({@link args} property). */
	setValue(value: string): void;
	private setSource;
	private createContext;
	private getContext;
	private createScript;
	loadFromActionData(state: ParseState): Script;
	render(ctx: RenderContext2D, rect: geometry.Rectangle): Promise<void>;
}
/** Stores properties for applying a shadow to a canvas context.
Can also be used to save & restore context shadow properties. */
export declare class ShadowStyle {
	/** Shadow color. */
	color: string;
	/** Shadow blur radius. */
	blur: number;
	/** Shadow offset coordinates. */
	readonly offset: Vect2d;
	private savedContext;
	constructor(init?: PartialDeep<ShadowStyle>);
	/** Returns `true` if blur and offset are are <= 0. */
	get isEmpty(): boolean;
	/** Resets shadow coordinates to zero. Does not affect color. */
	resetCoordinates(): void;
	/** Applies current shadow styling properties to the given canvas `ctx`. */
	render(ctx: RenderContext2D): void;
	/** Saves the given context's shadow properties. See also `restoreContext()`. */
	saveContext(ctx: RenderContext2D): void;
	/** Resets all shadow attributes on given context to the values saved with `saveContext()`. */
	restoreContext(ctx: RenderContext2D): void;
}
/** Stores stroke (line) canvas context property definitions, which includes stroke ("pen") style, line width, cap, join, miter, and dash array properties.
Line width can be defined as a relative % and scaled automatically in the {@link render} method.
 */
export declare class StrokeStyle {
	/** Size of the stroke in pixels or % of final drawing size. */
	width: UnitValue;
	/** Scaling factor for the stroke size when a relative (%) unit is used.
		This affects return values from `scaledWidth`, `scaledLineDash` and `scaledDashOffset` properties.
		The value is always re-computed inside the {@link render} method if a `rect` argument is passed to it. */
	widthScale: number;
	/** Style (color/gradient/pattern/texture) for the stroke. */
	pen: BrushStyle;
	/** Context `lineCap` property to apply. Default is 'butt'. */
	cap: CanvasLineCap;
	/** Context `lineJoin` property to apply. Default is 'miter'. */
	join: CanvasLineJoin;
	/** Context `miterLimit` property to apply. Default is `10`. */
	miterLimit: number;
	/** Optional array to pass to context's `setLineDash()` method. Default is an empty array (solid line). */
	lineDash: number[];
	/** Context `lineDashOffset` property to apply when specifying a dash pattern. Default is 0. */
	dashOffset: number;
	/** Returns `true` if stroke style is invalid (eg. no color) or {@link scaledWidth} is <= zero. */
	get isEmpty(): boolean;
	/** If the {@link width} unit type is relative (%) then returns the defined width multiplied by {@link widthScale}. Otherwise just returns the actual defined width. */
	get scaledWidth(): number;
	/** If the {@link width} unit type is relative (%) then returns a copy of the {@link lineDash} array with each member multiplied by {@link widthScale}. Otherwise just returns {@link lineDash} unmodified. */
	get scaledLineDash(): number[];
	/** If the {@link width} unit type is relative (%) then returns the {@link dashOffset} value multiplied by {@link widthScale}. Otherwise just returns {@link dashOffset} unmodified. */
	get scaledDashOffset(): number;
	constructor(init?: PartialDeep<StrokeStyle | {
		width?: number | string;
		color?: string;
	}>);
	private setWidthUnit;
	/** @internal Returns `true` if line width or the width unit have changed. */
	loadFromDataRecord(dr: TpActionDataRecord): boolean;
	/** Applies current stroke styling properties to the given canvas `ctx`. `rect` size is used to scale relative-sized stroke width. */
	render(ctx: RenderContext2D, rect?: Rectangle): void;
}
/** Draws text on a canvas context with various options. The text can be fully styled with the embedded {@link style} {@link DrawingStyle} property.

	@property width The width property can set the maximum width of the text for automatic wrapping.
		If width value is greater than zero and {@link wrap} is `true` then text will be automatically wrapped if it doesn't already fit into the specified width.
		The default width is `0` and no automatic wrapping will occur.
	@property height The height property is not used in the `StyledText` element.
	@property alignment  How to align the text within given drawing area. See also {@link align}, {@link valign}, {@link halign} properties.
*/
export declare class StyledText extends SizedElement implements ILayerElement, IRenderable, IValuedElement, IColorElement {
	#private;
	/** The default font variant ensures ligature support, especially useful for named symbol fonts. */
	static readonly defaultFontVariant = "common-ligatures discretionary-ligatures contextual";
	/** All visual styling options to apply when drawing the text. */
	readonly style: DrawingStyle;
	/** Horizontal text alignment, if different from overall block {@link halign}.
		If value is `Alignment.NONE` (default) then block alignment is used. Otherwise can be one of the horizontal alignment types.

		Note that this is really only relevant for multi-line text blocks since it will determine how the lines align in
		relation to each other. With a single line of text the horizontal alignment will always appear to follow the overall
		block alignment anyway (eg. if `halign` is 'left' and `textAlign` is 'right' the text will still be aligned with the left
		side of the image).
	*/
	textAlign: Alignment;
	constructor(init?: PartialDeep<StyledText> & SizedElementInit);
	/** @internal */
	readonly layerRole: LayerRole;
	/** Returns `true` if there is nothing to draw: text is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
	get isEmpty(): boolean;
	/** The text to draw. May contain `\n` control characters for multi-line text (unless the {@link wrap} property is disabled). */
	get text(): string;
	set text(text: string);
	/** Font is specified as a single CSS/CanvasRenderingContext2D style string expression which may contain size, family, and other options.
		See https://developer.mozilla.org/en-US/docs/Web/CSS/font for reference.

		Note that only the following generic font family names are supported: `serif`, `sans-serif`, `monospace`, and `system-ui`.
	*/
	get font(): string;
	set font(fontspec: string);
	/** The font variant(s) can be specified separately from what is allowed in {@link font} because this way supports more variant types than just "small-caps".
		The full range of CSS [font-variant](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant) values can be used. Multiple values should
		be separated by spaces.

		The default variants, specified in the {@link StyledText.defaultFontVariant} static property, add support for ligatures. To preserve
		this support while adding other variant(s), use the static property and add the desired variant(s) to that after a space. Eg.
		```js
			styledText.fontVariant = StyledText.defaultFontVariant + " titling-caps slashed-zero";
		```

		Note: If "small-caps" was specified in the {@link font} property, then it will automatically be added to the current `fontVariant`
		inside the `render()` method (there's no need to specify it separately as a value for this property).
	*/
	get fontVariant(): string;
	set fontVariant(variant: string);
	/** Text drawing direction: 'ltr', 'rtl', or 'inherit' (default). */
	get direction(): CanvasDirection;
	set direction(dir: CanvasDirection);
	/** Letter spacing property expressed as a CSS `length` value, eg: "2px" or "1em". Default is `0px`. */
	get letterSpacing(): string;
	set letterSpacing(spacing: string);
	/** Word spacing property expressed as a CSS `length` value, eg: "2px" or "1em". Default is `0px`. */
	get wordSpacing(): string;
	set wordSpacing(spacing: string);
	/** The `fontStretch` property specifies how the font may be expanded or condensed when drawing text.
		Value is one of: `ultra-condensed`, `extra-condensed`, `condensed`, `semi-condensed`, `normal` (default),
		`semi-expanded`, `expanded`, `extra-expanded`, `ultra-expanded` */
	get fontStretch(): CanvasFontStretch;
	set fontStretch(value: CanvasFontStretch);
	/** The `textDecoration` property can be assigned a string using the same syntax as the CSS
		[text-decoration](https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration) property.
		Set it to `none` or an empty value to draw undecorated text (default). */
	get textDecoration(): string;
	set textDecoration(value: string);
	/** Specifies whether drawn text should be wrapped.
		Currently only has any effect when {@link text} contains `\n` controls characters (there is no auto-wrapping).
		It can be set to `false` to prevent wrapping (in which case any `\n` in the text will be ignored). */
	get wrap(): boolean;
	set wrap(wrap: boolean);
	/** Enables or disables font hinting when drawing text and calculating metrics (for alignment). Default is enabled. */
	get fontHinting(): boolean;
	set fontHinting(value: boolean);
	/** Sets the current {@link StyledText#text} property from an evaluated input string (embedded JS is resolved). */
	setValue(text: string): void;
	/** @internal */
	setColor(value: string, type: ColorUpdateType): void;
	/** @internal */
	loadFromActionData(state: ParseState): StyledText;
	/** Clears any cached text metrics. Typically the cache management is handled automatically when relevant properties are modified. */
	resetMetrics(): void;
	protected applyCommonContextProperties(ctx: RenderContext2D): void;
	/** Returns the current {@link text} outline as a `Path2D` object, taking into account all current typography settings (e.g., font, alignment, wrapping, etc.).
		The path is not scaled and has a 0,0 origin point, so typically it would need to be scaled and aligned separately within a container (eg. by {@link FreeformPath}).
		If a positive `maxWidth` is given and {@link wrap} property is `true` then the text will be word-wrapped to the given width if needed.
	*/
	asPath(ctx: RenderContext2D, maxWidth?: number): Path2D;
	/** Draws the current {@link text} value with all styling and positioning options applied onto `ctx` using `rect` dimensions for scaling and alignment. */
	render(ctx: RenderContext2D, rect: Rectangle): void;
}
export declare const enum TransformScope {
	/** affects only the layer before the transform */
	PreviousOne = 0,
	/** affects all previous layers drawn so far */
	Cumulative = 1,
	/** affects all layers until an empty transform (or end) */
	UntilReset = 2,
	/** resets one previous `UntilReset` transform */
	Reset = 3
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
export declare class Transformation implements ILayerElement, IRenderable {
	#private;
	constructor(init?: PartialDeep<Transformation>);
	/** @internal */
	readonly layerRole: LayerRole;
	/** Returns `true` if this transform has no operations to perform. */
	get isEmpty(): boolean;
	/** Returns `true` if this transformation has a scaling component. */
	get isScaling(): boolean;
	/** Rotation component of the transform expressed as percent of 360 degrees (eg. 50 % = 180 degrees). */
	get rotate(): number;
	set rotate(percent: number);
	/** Translation component expressed as percentage of relevant dimension of requested size; eg: x = 100 translates one full width to the right. */
	get translate(): PointType;
	set translate(percent: PointType);
	/** Scaling component expressed as percent of requested size, eg: 200.0 is double size, 50 is half size. */
	get scale(): PointType;
	set scale(percent: PointType);
	/** Skewing component expressed as percent of requested size. */
	get skew(): PointType;
	set skew(percent: PointType);
	/** The order in which to apply transform component operations. Expressed as an array of operations where each operation is one of:
	```
		"O"  - Offset (translate)
		"R"  - Rotate
		"SC" - Scale
		"SK" - Skew
	```
	*/
	get order(): TransformOpType[];
	set order(order: TransformOpType[]);
	/** The transformation scope affects which layer(s) of a layered icon or paths of a paths array are affected by this transform.
	Valid string values for setting this property are one of: "previous layer", "all previous", "all following", "reset [following]"
	Only relevant when using {@link render} or {@link transformPaths} methods. For `transformPaths()`, only the first two scopes are relevant.
	When reading the property it is always returned as a numeric enumeration type.
	*/
	get scope(): TransformScope;
	set scope(scope: TransformScope | string);
	/** Clears the cached transform matrix. Typically the cache management is handled automatically when relevant properties are modified. */
	clearCache(): void;
	/** Returns `true` if any properties were modified or cached matrix hasn't been generated yet.
		@internal  */
	loadFromDataRecord(dr: TpActionDataRecord): boolean;
	/** @internal */
	loadFromActionData(state: ParseState): this;
	/** Returns the current transform operations as a `DOMMatrix` which uses given `txOrigin` as origin point for rotation and scaling,
		and scales translations to `txArea` size.  The returned value may be a cached version if no properties have changed since the cache was created,
		and `txOrigin` and `txArea` are the same as the cache'd version. Using this method with a new arguments will regenerate the matrix and update the cache. */
	getMatrix(txOrigin: PointType, txArea: SizeType): DOMMatrix;
	/** Creates a `DOMMatrix` from the current transform options which uses given `txOrigin` as transform origin and scales translations to `txArea` size.
		This method does not use any cached matrix but always generates a new one. */
	toMatrix(txOrigin: PointType, txArea: SizeType): DOMMatrix;
	/** Applies current transform matrix to the given canvas context using `rect` coordinates for tx center origin and area. */
	render(ctx: RenderContext2D, rect: Rectangle): void;
	/** Applies current transform matrix to the given `paths` starting at `fromIdx` and using `rect.size` for relative scaling and translation.
		The individual path bounds are used for computing center point for rotations and scaling.

		If the `scope` of this transform is `TransformScope.PreviousOne` then only the last path in `paths` array is tranformed, regardless of how many there are in total.
	*/
	transformPaths(paths: Path2D[], _: RenderContext2D, rect: Rectangle, fromIdx?: number): void;
}
/** @internal */
export declare const enum LayerRole {
	None = 0,
	Drawable = 1,
	Transform = 2,
	PathProducer = 4,
	PathConsumer = 8
}
/** Describes the orientation of a linear element. */
export declare const enum Orientation {
	H = 0,
	V = 1
}
/** Describes the drawing direction for a circular path (arc, ellipse, etc). `Auto` value meaning depends on implementation. */
export declare const enum ArcDrawDirection {
	CW = 0,
	CCW = 1,
	Auto = 2
}
/** Describes the location of an element in relation to another. */
export declare const enum Placement {
	NoPlace = 0,
	Inside = 1,
	Outside = 2,
	Center = 3,
	TopLeft = 1,
	BottomRight = 2
}
/** Describes horizontal and vertical alignment values. */
export declare const enum Alignment {
	NONE = 0,
	LEFT = 1,
	RIGHT = 2,
	HCENTER = 4,
	JUSTIFY = 8,
	H_MASK = 15,// mask
	TOP = 16,
	BOTTOM = 32,
	VCENTER = 64,
	BASELINE = 128,
	V_MASK = 240,// mask
	CENTER = 68,
	TopLeft = 17,
	TopCenter = 20,
	TopCtr = 20,
	TopRight = 18,
	MidLeft = 65,
	MidCenter = 68,
	MidCtr = 68,
	MidRight = 66,
	BotLeft = 33,
	BotCenter = 36,
	BotCtr = 36,
	BotRight = 34
}
/** Path combining operations for {@link Path} type and subclasses. */
export declare const enum PathBoolOperation {
	None = "none",
	Add = "add",// actually `addPath()`
	Complement = "complement",
	Difference = "difference",
	Intersect = "intersect",
	Union = "union",
	Xor = "xor"
}
/** Transformation operation type, used by {@link Transformation }. */
export declare const enum TransformOpType {
	Offset = "O",
	Rotate = "R",
	Scale = "SC",
	Skew = "SK"
}
/** Used by elements supporting the `setColor(value: string, type: ColorUpdateType)` method (`IColorElement` interface).
	@internal
*/
export declare const enum ColorUpdateType {
	None = 0,
	Stroke = 1,
	Fill = 2,
	Shadow = 4,
	Primary = 16,
	Secondary = 32,
	Foreground = 1,
	Background = 2
}
//
// Geometry
//
export interface DOMPointInit {
	x?: number;
	y?: number;
	z?: number;
	w?: number;
}
/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPoint) */
interface DOMPoint extends DOMPointReadOnly {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPoint/x) */
	x: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPoint/y) */
	y: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPoint/z) */
	z: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPoint/w) */
	w: number;
}
declare var DOMPoint: {
	prototype: DOMPoint;
	new (x?: number, y?: number, z?: number, w?: number): DOMPoint;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPoint/fromPoint_static) */
	fromPoint(other?: DOMPointInit): DOMPoint;
};
/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly) */
export interface DOMPointReadOnly {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly/x) */
	readonly x: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly/y) */
	readonly y: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly/z) */
	readonly z: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly/w) */
	readonly w: number;
	matrixTransform(matrix?: DOMMatrixInit): DOMPoint;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly/toJSON) */
	toJSON(): any;
}
export declare var DOMPointReadOnly: {
	prototype: DOMPointReadOnly;
	new (x?: number, y?: number, z?: number, w?: number): DOMPointReadOnly;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMPointReadOnly/fromPoint_static) */
	fromPoint(other?: DOMPointInit): DOMPointReadOnly;
};
/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRect) */
interface DOMRect extends DOMRectReadOnly {
	height: number;
	width: number;
	x: number;
	y: number;
}
export interface DOMRectInit {
	height?: number;
	width?: number;
	x?: number;
	y?: number;
}
declare var DOMRect: {
	prototype: DOMRect;
	new (x?: number, y?: number, width?: number, height?: number): DOMRect;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRect/fromRect_static) */
	fromRect(other?: DOMRectInit): DOMRect;
};
export interface DOMRectList {
	readonly length: number;
	item(index: number): DOMRect | null;
	[index: number]: DOMRect;
}
export declare var DOMRectList: {
	prototype: DOMRectList;
	new (): DOMRectList;
};
/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly) */
export interface DOMRectReadOnly {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/bottom) */
	readonly bottom: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/height) */
	readonly height: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/left) */
	readonly left: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/right) */
	readonly right: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/top) */
	readonly top: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/width) */
	readonly width: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/x) */
	readonly x: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/y) */
	readonly y: number;
	toJSON(): any;
}
export declare var DOMRectReadOnly: {
	prototype: DOMRectReadOnly;
	new (x?: number, y?: number, width?: number, height?: number): DOMRectReadOnly;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/DOMRectReadOnly/fromRect_static) */
	fromRect(other?: DOMRectInit): DOMRectReadOnly;
};
//
// Images
//
/** [Skia Canvas Docs](http://skia-canvas.org/api/image#loadimage) */
declare function loadImage(src: string | Buffer): Promise<Image>;
/** [Skia Canvas Docs](http://skia-canvas.org/api/imagedata#loadimagedata) */
declare function loadImageData(src: string | Buffer, width: number, height?: number): Promise<ImageData>;
/** [Skia Canvas Docs](http://skia-canvas.org/api/imagedata#loadimagedata) */
declare function loadImageData(src: string | Buffer, width: number, height: number, settings?: ImageDataSettings): Promise<ImageData>;
export type ColorSpace = "srgb"; // add "display-p3" when skia_safe supports it
export type ColorType = "Alpha8" | "Gray8" | "R8UNorm" | // 1 byte/px
"A16Float" | "A16UNorm" | "ARGB4444" | "R8G8UNorm" | "RGB565" | // 2 bytes/px
"rgb" | "RGB888x" | "rgba" | "RGBA8888" | "bgra" | "BGRA8888" | "BGR101010x" | "BGRA1010102" | // 4 bytes/px
"R16G16Float" | "R16G16UNorm" | "RGB101010x" | "RGBA1010102" | "RGBA8888" | "SRGBA8888" | // 4 bytes/px
"R16G16B16A16UNorm" | "RGBAF16" | "RGBAF16Norm" | // 8 bytes/px
"RGBAF32"; // 16 bytes/px
export interface ImageDataSettings {
	colorSpace?: ColorSpace;
	colorType?: ColorType;
}
/** [Skia Canvas Docs](https://skia-canvas.org/api/imagedata) */
declare class ImageData {
	prototype: ImageData;
	constructor(sw: number, sh: number, settings?: ImageDataSettings);
	constructor(data: Uint8ClampedArray | Buffer, sw: number, sh?: number, settings?: ImageDataSettings);
	constructor(image: Image, settings?: ImageDataSettings);
	constructor(imageData: ImageData);
	readonly colorSpace: ColorSpace;
	readonly colorType: ColorType;
	readonly data: Uint8ClampedArray;
	readonly height: number;
	readonly width: number;
}
/** [Skia Canvas Docs](https://skia-canvas.org/api/image) */
declare class Image extends EventEmitter {
	constructor();
	get src(): string;
	set src(src: string | Buffer);
	get width(): number;
	get height(): number;
	onload: ((this: Image, image: Image) => any) | null;
	onerror: ((this: Image, error: Error) => any) | null;
	complete: boolean;
	decode(): Promise<Image>;
}
//
// DOMMatrix
//
export interface DOMMatrix2DInit {
	a?: number;
	b?: number;
	c?: number;
	d?: number;
	e?: number;
	f?: number;
	m11?: number;
	m12?: number;
	m21?: number;
	m22?: number;
	m41?: number;
	m42?: number;
}
export interface DOMMatrixInit extends DOMMatrix2DInit {
	is2D?: boolean;
	m13?: number;
	m14?: number;
	m23?: number;
	m24?: number;
	m31?: number;
	m32?: number;
	m33?: number;
	m34?: number;
	m43?: number;
	m44?: number;
}
interface DOMMatrix {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
	m11: number;
	m12: number;
	m13: number;
	m14: number;
	m21: number;
	m22: number;
	m23: number;
	m24: number;
	m31: number;
	m32: number;
	m33: number;
	m34: number;
	m41: number;
	m42: number;
	m43: number;
	m44: number;
	flipX(): DOMMatrix;
	flipY(): DOMMatrix;
	inverse(): DOMMatrix;
	invertSelf(): DOMMatrix;
	multiply(other?: DOMMatrixInit): DOMMatrix;
	multiplySelf(other?: DOMMatrixInit): DOMMatrix;
	preMultiplySelf(other?: DOMMatrixInit): DOMMatrix;
	rotate(rotX?: number, rotY?: number, rotZ?: number): DOMMatrix;
	rotateSelf(rotX?: number, rotY?: number, rotZ?: number): DOMMatrix;
	rotateAxisAngle(x?: number, y?: number, z?: number, angle?: number): DOMMatrix;
	rotateAxisAngleSelf(x?: number, y?: number, z?: number, angle?: number): DOMMatrix;
	rotateFromVector(x?: number, y?: number): DOMMatrix;
	rotateFromVectorSelf(x?: number, y?: number): DOMMatrix;
	scale(scaleX?: number, scaleY?: number, scaleZ?: number, originX?: number, originY?: number, originZ?: number): DOMMatrix;
	scaleSelf(scaleX?: number, scaleY?: number, scaleZ?: number, originX?: number, originY?: number, originZ?: number): DOMMatrix;
	scale3d(scale?: number, originX?: number, originY?: number, originZ?: number): DOMMatrix;
	scale3dSelf(scale?: number, originX?: number, originY?: number, originZ?: number): DOMMatrix;
	skew(sx?: number, sy?: number): DOMMatrix;
	skewSelf(sx?: number, sy?: number): DOMMatrix;
	skewX(sx?: number): DOMMatrix;
	skewXSelf(sx?: number): DOMMatrix;
	skewY(sy?: number): DOMMatrix;
	skewYSelf(sy?: number): DOMMatrix;
	translate(tx?: number, ty?: number, tz?: number): DOMMatrix;
	translateSelf(tx?: number, ty?: number, tz?: number): DOMMatrix;
	setMatrixValue(transformList: string): DOMMatrix;
	transformPoint(point?: DOMPointInit): DOMPoint;
	toFloat32Array(): Float32Array;
	toFloat64Array(): Float64Array;
	toJSON(): any;
	toString(): string;
	clone(): DOMMatrix;
}
export type FixedLenArray<T, L extends number> = T[] & {
	length: L;
};
export type Matrix = string | DOMMatrix | {
	a: number;
	b: number;
	c: number;
	d: number;
	e: number;
	f: number;
} | FixedLenArray<number, 6> | FixedLenArray<number, 16>;
declare var DOMMatrix: {
	prototype: DOMMatrix;
	new (init?: Matrix): DOMMatrix;
	fromFloat32Array(array32: Float32Array): DOMMatrix;
	fromFloat64Array(array64: Float64Array): DOMMatrix;
	fromMatrix(other?: DOMMatrixInit): DOMMatrix;
};
//
// Canvas
//
export type ExportFormat = "png" | "jpg" | "jpeg" | "webp" | "pdf" | "svg" | "raw";
export interface RenderOptions {
	/** Page to export: Defaults to 1 (i.e., first page) */
	page?: number;
	/** Background color to draw beneath transparent parts of the canvas */
	matte?: string;
	/** Number of pixels per grid ‘point’ (defaults to 1) */
	density?: number;
	/** Quality for lossy encodings like JPEG (0.0–1.0) */
	quality?: number;
	/** Convert text to paths for SVG exports */
	outline?: boolean;
}
export interface SaveOptions extends RenderOptions {
	/** Image format to use */
	format?: ExportFormat;
}
/** [Skia Canvas Docs](https://skia-canvas.org/api/canvas) */
declare class Canvas {
	static contexts: WeakMap<Canvas, readonly CanvasRenderingContext2D[]>;
	/**
	 * Gets or sets the height of a canvas element on a document.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/height)
	 */
	height: number;
	/**
	 * Gets or sets the width of a canvas element on a document.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/width)
	 */
	width: number;
	/** [Skia Canvas Docs](https://skia-canvas.org/api/canvas#creating-new-canvas-objects) */
	constructor(width?: number, height?: number);
	/**
	 * Returns an object that provides methods and properties for drawing and manipulating images and graphics on a canvas element in a document. A context object includes information about colors, line widths, fonts, and other graphic parameters that can be drawn on a canvas.
	 * @param type The type of canvas to create. Skia Canvas only supports a 2-D context using canvas.getContext("2d")
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/HTMLCanvasElement/getContext)
	 */
	getContext(type?: "2d"): CanvasRenderingContext2D;
	newPage(width?: number, height?: number): CanvasRenderingContext2D;
	readonly pages: CanvasRenderingContext2D[];
	get gpu(): boolean;
	set gpu(enabled: boolean);
	saveAs(filename: string, options?: SaveOptions): Promise<void>;
	toBuffer(format: ExportFormat, options?: RenderOptions): Promise<Buffer>;
	toDataURL(format: ExportFormat, options?: RenderOptions): Promise<string>;
	saveAsSync(filename: string, options?: SaveOptions): void;
	toBufferSync(format: ExportFormat, options?: RenderOptions): Buffer;
	toDataURLSync(format: ExportFormat, options?: RenderOptions): string;
	get pdf(): Promise<Buffer>;
	get svg(): Promise<Buffer>;
	get jpg(): Promise<Buffer>;
	get png(): Promise<Buffer>;
	get webp(): Promise<Buffer>;
}
//
// Patterns
//
/**
 * An opaque object describing a pattern, based on an image, a canvas, or a video, created by the CanvasRenderingContext2D.createPattern() method.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasPattern)
 */
declare class CanvasPattern {
	setTransform(transform: Matrix): void;
	setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
}
/**
 * An opaque object describing a gradient. It is returned by the methods CanvasRenderingContext2D.createLinearGradient() or CanvasRenderingContext2D.createRadialGradient().
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasGradient)
 */
interface CanvasGradient {
	/**
	 * Adds a color stop with the given color to the gradient at the given offset. 0.0 is the offset at one end of the gradient, 1.0 is the offset at the other end.
	 *
	 * Throws an "IndexSizeError" DOMException if the offset is out of range. Throws a "SyntaxError" DOMException if the color cannot be parsed.
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasGradient/addColorStop)
	 */
	addColorStop(offset: number, color: string): void;
}
declare var CanvasGradient: {
	prototype: CanvasGradient;
	new (): CanvasGradient;
};
declare class CanvasTexture {
}
//
// Context
//
export type CanvasDrawable = Canvas | Image | ImageData;
export type CanvasPatternSource = Canvas | Image;
type CanvasDirection = "inherit" | "ltr" | "rtl";
type CanvasFillRule = "evenodd" | "nonzero";
type CanvasFontStretch = "condensed" | "expanded" | "extra-condensed" | "extra-expanded" | "normal" | "semi-condensed" | "semi-expanded" | "ultra-condensed" | "ultra-expanded";
type CanvasTextAlign = "center" | "end" | "left" | "right" | "start";
type CanvasTextBaseline = "alphabetic" | "bottom" | "hanging" | "ideographic" | "middle" | "top";
type CanvasLineCap = "butt" | "round" | "square";
type CanvasLineJoin = "bevel" | "miter" | "round";
// type CanvasFontKerning = "auto" | "none" | "normal";
// type CanvasFontVariantCaps = "all-petite-caps" | "all-small-caps" | "normal" | "petite-caps" | "small-caps" | "titling-caps" | "unicase";
// type CanvasTextRendering = "auto" | "geometricPrecision" | "optimizeLegibility" | "optimizeSpeed";
export type Offset = [
	x: number,
	y: number
] | number;
export type QuadOrRect = [
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number,
	x4: number,
	y4: number
] | [
	left: number,
	top: number,
	right: number,
	bottom: number
] | [
	width: number,
	height: number
];
type GlobalCompositeOperation = "color" | "color-burn" | "color-dodge" | "copy" | "darken" | "destination-atop" | "destination-in" | "destination-out" | "destination-over" | "difference" | "exclusion" | "hard-light" | "hue" | "lighten" | "lighter" | "luminosity" | "multiply" | "overlay" | "saturation" | "screen" | "soft-light" | "source-atop" | "source-in" | "source-out" | "source-over" | "xor";
export type ImageSmoothingQuality = "high" | "low" | "medium";
export type FontVariantSetting = "normal" | 
/* alternates */ "historical-forms" | 
/* caps */ "small-caps" | "all-small-caps" | "petite-caps" | "all-petite-caps" | "unicase" | "titling-caps" | 
/* numeric */ "lining-nums" | "oldstyle-nums" | "proportional-nums" | "tabular-nums" | "diagonal-fractions" | "stacked-fractions" | "ordinal" | "slashed-zero" | 
/* ligatures */ "common-ligatures" | "no-common-ligatures" | "discretionary-ligatures" | "no-discretionary-ligatures" | "historical-ligatures" | "no-historical-ligatures" | "contextual" | "no-contextual" | 
/* east-asian */ "jis78" | "jis83" | "jis90" | "jis04" | "simplified" | "traditional" | "full-width" | "proportional-width" | "ruby" | 
/* position */ "super" | "sub";
export interface CreateTextureOptions {
	/** The 2D shape to be drawn in a repeating grid with the specified spacing (if omitted, parallel lines will be used) */
	path?: Path2D;
	/** The lineWidth with which to stroke the path (if omitted, the path will be filled instead) */
	line?: number;
	/** The color to use for stroking/filling the path */
	color?: string;
	/** The orientation of the pattern grid in radians */
	angle?: number;
	/** The amount by which to shift the pattern relative to the canvas origin */
	offset?: Offset;
}
export interface CanvasCompositing {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/globalAlpha) */
	globalAlpha: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation) */
	globalCompositeOperation: GlobalCompositeOperation;
}
export interface CanvasDrawImage {
	drawImage(image: CanvasDrawable, dx: number, dy: number): void;
	drawImage(image: CanvasDrawable, dx: number, dy: number, dw: number, dh: number): void;
	drawImage(image: CanvasDrawable, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
	drawCanvas(image: Canvas, dx: number, dy: number): void;
	drawCanvas(image: Canvas, dx: number, dy: number, dw: number, dh: number): void;
	drawCanvas(image: Canvas, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
}
export interface CanvasDrawPath {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/beginPath) */
	beginPath(): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/clip) */
	clip(fillRule?: CanvasFillRule): void;
	clip(path: Path2D, fillRule?: CanvasFillRule): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/fill) */
	fill(fillRule?: CanvasFillRule): void;
	fill(path: Path2D, fillRule?: CanvasFillRule): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/isPointInPath) */
	isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
	isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule): boolean;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/isPointInStroke) */
	isPointInStroke(x: number, y: number): boolean;
	isPointInStroke(path: Path2D, x: number, y: number): boolean;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/stroke) */
	stroke(): void;
	stroke(path: Path2D): void;
}
export interface CanvasFillStrokeStyles {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/fillStyle) */
	fillStyle: string | CanvasGradient | CanvasPattern | CanvasTexture;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/strokeStyle) */
	strokeStyle: string | CanvasGradient | CanvasPattern | CanvasTexture;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createConicGradient) */
	createConicGradient(startAngle: number, x: number, y: number): CanvasGradient;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createLinearGradient) */
	createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createPattern) */
	createPattern(image: CanvasPatternSource, repetition: string | null): CanvasPattern | null;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createRadialGradient) */
	createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
	/** [Skia Canvas Docs](https://skia-canvas.org/api/context#createtexture) */
	createTexture(spacing: Offset, options?: CreateTextureOptions): CanvasTexture;
}
export interface CanvasFilters {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/filter) */
	filter: string;
}
export interface CanvasImageData {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/createImageData) */
	createImageData(width: number, height: number, settings?: ImageDataSettings): ImageData;
	createImageData(imagedata: ImageData): ImageData;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/getImageData) */
	getImageData(x: number, y: number, width: number, height: number, settings?: ImageDataSettings): ImageData;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/putImageData) */
	putImageData(imagedata: ImageData, dx: number, dy: number): void;
	putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
}
export interface CanvasImageSmoothing {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled) */
	imageSmoothingEnabled: boolean;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/imageSmoothingQuality) */
	imageSmoothingQuality: ImageSmoothingQuality;
}
export interface CanvasPath {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/arc) */
	arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/arcTo) */
	arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/bezierCurveTo) */
	bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/closePath) */
	closePath(): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/ellipse) */
	ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineTo) */
	lineTo(x: number, y: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/moveTo) */
	moveTo(x: number, y: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/quadraticCurveTo) */
	quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/rect) */
	rect(x: number, y: number, w: number, h: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/roundRect) */
	roundRect(x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[]): void;
}
export interface CanvasPathDrawingStyles {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineCap) */
	lineCap: CanvasLineCap;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineDashOffset) */
	lineDashOffset: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineJoin) */
	lineJoin: CanvasLineJoin;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/lineWidth) */
	lineWidth: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/miterLimit) */
	miterLimit: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/getLineDash) */
	getLineDash(): number[];
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash) */
	setLineDash(segments: Iterable<number>): void;
}
export interface CanvasRect {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/clearRect) */
	clearRect(x: number, y: number, w: number, h: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/fillRect) */
	fillRect(x: number, y: number, w: number, h: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/strokeRect) */
	strokeRect(x: number, y: number, w: number, h: number): void;
}
export interface CanvasShadowStyles {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/shadowBlur) */
	shadowBlur: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/shadowColor) */
	shadowColor: string;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/shadowOffsetX) */
	shadowOffsetX: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/shadowOffsetY) */
	shadowOffsetY: number;
}
export interface CanvasState {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/reset) */
	reset(): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/restore) */
	restore(): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/save) */
	save(): void;
}
export interface CanvasText {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/fillText) */
	fillText(text: string, x: number, y: number, maxWidth?: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/measureText) */
	measureText(text: string): TextMetrics;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/strokeText) */
	strokeText(text: string, x: number, y: number, maxWidth?: number): void;
}
export interface CanvasTextDrawingStyles {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/direction) */
	direction: CanvasDirection;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/font) */
	font: string;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/fontStretch) */
	fontStretch: CanvasFontStretch;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/letterSpacing) */
	letterSpacing: string;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/textAlign) */
	textAlign: CanvasTextAlign;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/textBaseline) */
	textBaseline: CanvasTextBaseline;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/wordSpacing) */
	wordSpacing: string;
}
export interface CanvasTransform {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/getTransform) */
	getTransform(): DOMMatrix;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/resetTransform) */
	resetTransform(): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/rotate) */
	rotate(angle: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/scale) */
	scale(x: number, y: number): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setTransform) */
	setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
	/** transform argument extensions (accept DOMMatrix & matrix-like objectx, not just param lists) */
	setTransform(transform?: Matrix): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/transform) */
	transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
	transform(transform: Matrix): void;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/translate) */
	translate(x: number, y: number): void;
}
/**
 * The CanvasRenderingContext2D interface, part of the Canvas API, provides the 2D rendering context for the drawing surface of a <canvas> element. It is used for drawing shapes, text, images, and other objects.
 *
 * - [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D)
 * - [Skia Canvas Docs](https://skia-canvas.org/api/context)
 */
interface CanvasRenderingContext2D extends CanvasCompositing, CanvasDrawImage, CanvasDrawPath, CanvasFillStrokeStyles, CanvasFilters, CanvasImageData, CanvasImageSmoothing, CanvasPath, CanvasPathDrawingStyles, CanvasRect, CanvasShadowStyles, CanvasState, CanvasText, CanvasTextDrawingStyles, CanvasTransform {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/canvas) */
	readonly canvas: Canvas;
	fontVariant: FontVariantSetting;
	fontHinting: boolean;
	textWrap: boolean;
	textDecoration: string;
	lineDashMarker: Path2D | null;
	lineDashFit: "move" | "turn" | "follow";
	// skia/chrome beziers & convenience methods
	get currentTransform(): DOMMatrix;
	set currentTransform(matrix: Matrix);
	createProjection(quad: QuadOrRect, basis?: QuadOrRect): DOMMatrix;
	conicCurveTo(cpx: number, cpy: number, x: number, y: number, weight: number): void;
	// getContextAttributes(): CanvasRenderingContext2DSettings;
	// add optional maxWidth to work in conjunction with textWrap
	measureText(text: string, maxWidth?: number): TextMetrics;
	outlineText(text: string, maxWidth?: number): Path2D;
}
//
// Bézier Paths
//
export interface Path2DBounds {
	readonly top: number;
	readonly left: number;
	readonly bottom: number;
	readonly right: number;
	readonly width: number;
	readonly height: number;
}
export type Path2DEdge = [
	verb: string,
	...args: number[]
];
/**
 * This Canvas 2D API interface is used to declare a path that can then be used on a CanvasRenderingContext2D object. The path methods of the CanvasRenderingContext2D interface are also present on this interface, which gives you the convenience of being able to retain and replay your path whenever desired.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Path2D)
 */
interface Path2D extends CanvasPath {
	readonly bounds: Path2DBounds;
	readonly edges: readonly Path2DEdge[];
	d: string;
	/**
	 * Adds the path given by the argument to the path
	 *
	 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/Path2D/addPath)
	 */
	addPath(path: Path2D, transform?: DOMMatrix2DInit): void;
	contains(x: number, y: number): boolean;
	conicCurveTo(cpx: number, cpy: number, x: number, y: number, weight: number): void;
	complement(otherPath: Path2D): Path2D;
	difference(otherPath: Path2D): Path2D;
	intersect(otherPath: Path2D): Path2D;
	union(otherPath: Path2D): Path2D;
	xor(otherPath: Path2D): Path2D;
	interpolate(otherPath: Path2D, weight: number): Path2D;
	jitter(segmentLength: number, amount: number, seed?: number): Path2D;
	offset(dx: number, dy: number): Path2D;
	points(step?: number): readonly [
		x: number,
		y: number
	][];
	round(radius: number): Path2D;
	simplify(rule?: "nonzero" | "evenodd"): Path2D;
	transform(transform: Matrix): Path2D;
	transform(a: number, b: number, c: number, d: number, e: number, f: number): Path2D;
	trim(start: number, end: number, inverted?: boolean): Path2D;
	trim(start: number, inverted?: boolean): Path2D;
	unwind(): Path2D;
}
declare var Path2D: {
	prototype: Path2D;
	new (path?: Path2D | string): Path2D;
};
//
// Typography
//
/**
 * The dimensions of a piece of text in the canvas, as created by the CanvasRenderingContext2D.measureText() method.
 *
 * [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics)
 */
interface TextMetrics {
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/actualBoundingBoxAscent) */
	readonly actualBoundingBoxAscent: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/actualBoundingBoxDescent) */
	readonly actualBoundingBoxDescent: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/actualBoundingBoxLeft) */
	readonly actualBoundingBoxLeft: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/actualBoundingBoxRight) */
	readonly actualBoundingBoxRight: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/alphabeticBaseline) */
	readonly alphabeticBaseline: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/emHeightAscent) */
	readonly emHeightAscent: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/emHeightDescent) */
	readonly emHeightDescent: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/fontBoundingBoxAscent) */
	readonly fontBoundingBoxAscent: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/fontBoundingBoxDescent) */
	readonly fontBoundingBoxDescent: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/hangingBaseline) */
	readonly hangingBaseline: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/ideographicBaseline) */
	readonly ideographicBaseline: number;
	/** [MDN Reference](https://developer.mozilla.org/docs/Web/API/TextMetrics/width) */
	readonly width: number;
	/** Individual metrics for each line (only applicable when context's textWrap is set to `true` ) */
	readonly lines: TextMetricsLine[];
}
declare var TextMetrics: {
	prototype: TextMetrics;
	new (): TextMetrics;
};
interface TextMetricsLine {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly baseline: number;
	readonly startIndex: number;
	readonly endIndex: number;
}
export interface FontFamily {
	family: string;
	weights: number[];
	widths: string[];
	styles: string[];
}
export interface Font {
	family: string;
	weight: number;
	style: string;
	width: string;
	file: string;
}
export interface FontLibrary {
	families: readonly string[];
	family(name: string): FontFamily | undefined;
	has(familyName: string): boolean;
	use(familyName: string, fontPaths?: string | readonly string[]): Font[];
	use(fontPaths: readonly string[]): Font[];
	use(families: Record<string, readonly string[] | string>): Record<string, Font[] | Font>;
	reset(): void;
}
export const FontLibrary: FontLibrary;
export type FitStyle = "none" | "contain-x" | "contain-y" | "contain" | "cover" | "fill" | "scale-down" | "resize";
export type CursorStyle = "default" | "crosshair" | "hand" | "arrow" | "move" | "text" | "wait" | "help" | "progress" | "not-allowed" | "context-menu" | "cell" | "vertical-text" | "alias" | "copy" | "no-drop" | "grab" | "grabbing" | "all-scroll" | "zoom-in" | "zoom-out" | "e-resize" | "n-resize" | "ne-resize" | "nw-resize" | "s-resize" | "se-resize" | "sw-resize" | "w-resize" | "ew-resize" | "ns-resize" | "nesw-resize" | "nwse-resize" | "col-resize" | "row-resize" | "none";
export type WindowOptions = {
	title?: string;
	left?: number;
	top?: number;
	width?: number;
	height?: number;
	fit?: FitStyle;
	page?: number;
	background?: string;
	fullscreen?: boolean;
	visible?: boolean;
	cursor?: CursorStyle;
	canvas?: Canvas;
};
export type MouseEventProps = {
	x: number;
	y: number;
	pageX: number;
	pageY: number;
	button: number;
	ctrlKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
};
export type KeyboardEventProps = {
	key: string;
	code: string;
	location: number;
	repeat: boolean;
	ctrlKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	shiftKey: boolean;
};
export type WindowEvents = {
	mousedown: MouseEventProps;
	mouseup: MouseEventProps;
	mousemove: MouseEventProps;
	keydown: KeyboardEventProps;
	keyup: KeyboardEventProps;
	input: {
		data: string;
		inputType: "insertText";
	};
	wheel: {
		deltaX: number;
		deltaY: number;
	};
	fullscreen: {
		enabled: boolean;
	};
	move: {
		left: number;
		top: number;
	};
	resize: {
		height: number;
		width: number;
	};
	frame: {
		frame: number;
	};
	draw: {
		frame: number;
	};
	blur: {};
	focus: {};
	setup: {};
};
export class Window extends EventEmitter<{
	[EventName in keyof WindowEvents]: [
		{
			target: Window;
			type: EventName;
		} & WindowEvents[EventName]
	];
}> {
	constructor(width: number, height: number, options?: WindowOptions);
	constructor(options?: WindowOptions);
	readonly ctx: CanvasRenderingContext2D;
	canvas: Canvas;
	visible: boolean;
	fullscreen: boolean;
	title: string;
	cursor: CursorStyle;
	fit: FitStyle;
	left: number;
	top: number;
	width: number;
	height: number;
	page: number;
	background: string;
	close(): void;
}
export interface App {
	readonly windows: Window[];
	readonly running: boolean;
	fps: number;
	launch(): void;
	quit(): void;
}
export const App: App;
declare namespace types {
	/** All possible types for canvas fill/stroke style. */
	type ContextFillStrokeType = string | canvas.CanvasGradient | canvas.CanvasPattern | canvas.CanvasTexture;
	/** Defines how to resize images (or other block elements). Equivalent to CSS `object-fit` property. */
	type ResizeFitOption = "contain" | "cover" | "fill" | "scale-down" | "none";
	type ConstructorType<T> = new (...args: any[]) => T;
	/** A recursive version of `Partial<>` type. Accepts any existing property of this object, including child objects and their properties. */
	type PartialDeep<T> = {
		[P in keyof T]?: T[P] extends (infer U)[] ? PartialDeep<U>[] : T[P] extends object | undefined ? PartialDeep<T[P]> : T[P];
	};
	/** Requires at least one of specified properties to be present in an object. */
	type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
		[K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
	}[Keys];
}
declare global {
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
	type PointType = geometry.PointType;
	type SizeType = geometry.SizeType;
	type ResizeFitOption = types.ResizeFitOption;
	type TpActionDataType = {
		id: string;
		value: string;
	};
	type TpActionDataArrayType = TpActionDataType[];
	type TpActionDataRecord = Record<string, string>;
	type ConstructorType<T> = types.ConstructorType<T>;
	type RequireAtLeastOne<T, Keys extends keyof T> = types.RequireAtLeastOne<T, Keys>;
	type PartialDeep<T> = types.PartialDeep<T>;
}
type RenderContext2D = canvas.CanvasRenderingContext2D;
/** Stores a collection of `ILayerElement` types as layers and produces a composite image from all the layers when rendered. */
export declare class DynamicIcon {
	#private;
	/** the icon name is also used for the corresponding TP State ID */
	name: string;
	/** Specifies an optional grid to split the final image into multiple parts before sending to TP. */
	readonly tile: PointType;
	/** `true` if icon was explicitly created with a "New" action, will require a corresponding "Render" action to actually draw it. */
	delayGeneration: boolean;
	/** Whether to use GPU for rendering (on supported hardware). Passed to skia-canvas's Canvas::gpu property. */
	gpuRendering: boolean;
	/** Options for the 'sharp' lib image compression. These are passed to `sharp.png()` when generating PNG results.
		`compressionLevel` of `0` disables compression step entirely (`sharp` lib is never invoked, `skia-canvas` PNG-24 output is used directly).
		Default `compressionLevel` and `quality` are set in plugin settings and can be overridden in an icon "finalize" action.
		Default `effort` is set to `1` and `palette` to `true`.
		See https://sharp.pixelplumbing.com/api-output#png for option descriptions. */
	readonly outputCompressionOptions: sharp.PngOptions;
	private log;
	constructor(init?: Partial<DynamicIcon>);
	/** true if the image should be split into parts before delivery, false otherwise. Checks if either of `tile.x` or `tile.y` are `> 1`. */
	get isTiled(): boolean;
	/** Returns `true` if icon has no layer elements. */
	get isEmpty(): boolean;
	/** This is the overall image size to generate. If the image will be delivered tiled, each tile will be a portion of this size. */
	get size(): SizeType;
	set size(v: SizeType);
	/** Width component of overall image size. */
	get width(): number;
	set width(v: number);
	/** Height component of overall image size. */
	get height(): number;
	set height(v: number);
	/** Returns the number of element layers currently defined. */
	layerCount(): number;
	/** Returns element at `index`, if any, or `undefined` otherwise. Negative indexes count from the end, as in `Array.prototype.at()`. */
	elementAt(index: number): ILayerElement | undefined;
	/** Sets overall image size from action data strings.
		If `height` is undefined then it is set to same as `width` and size is treated as being per-tile (if icon is tiled).
		@internal */
	setSizeFromStrings(width: string, height?: string): void;
	/** Resets the current layer counter to starting position. Call before adding/updating layers via actions sequence. @internal */
	resetCurrentIndex(): void;
	/** Finish adding/updating element layers. Call after modifying elements via actions sequence. @internal */
	finalize(): void;
	/** Adds or updates layer element of given type at the current insertion sequence (current index). This advances the sequence count.
		Optional `args` are passed to element constructor if it needs to be created.
		Call while adding/updating layers via actions sequence (after `resetCurrentIndex()` and before `finalize()`).
		@internal */
	setOrUpdateLayerAtCurrentIndex<T extends ILayerElement>(parseState: ParseState, elType: ConstructorType<T>): void;
	/** Adds or updates layer element of given type at the given index. @internal */
	setOrUpdateLayerAtIndex<T extends ILayerElement>(index: number, parseState: ParseState, elType: ConstructorType<T>): void;
	/** Formats and returns a TP State ID for a given tile coordinate. Format is '<icon.name>_<column>_<row>'
		'x' and 'y' of `tile` are assumed to be zero-based; coordinates used in the State ID are 1-based (so, 1 is added to x and y values of `tile`).
		@internal */
	getTileStateId(tile: PointType | any): string;
	/** Formats and returns a TP State Name for a given tile coordinate. Format is '<icon.name> - Tile col <column>, row <row>'
		@internal */
	getTileStateName(tile: PointType): string;
	private withTiles;
	private sendStateData;
	private sendCanvasImage;
	private sendCompressedImage;
	private sendCanvasTiles;
	private sendCompressedTiles;
	private saveImage;
	private saveImageTiles;
	/** @internal */
	render(options?: Record<string, any>): Promise<void>;
}
declare class ParseState {
	readonly data: TpActionDataArrayType;
	pos: number;
	/** Get the whole data array as a flat object with data IDs as keys. Key names are only the last part after '_' separator in ID. */
	get dr(): TpActionDataRecord;
	private record;
	constructor(data: TpActionDataArrayType, pos?: number);
	setPos(pos: number): ParseState;
	/** Transform data array to a flat object with data IDs as keys, starting at array index `start` (default 0).
	 * Key names are only the last part after '_' separator in ID. */
	asRecord(start?: number, separator?: string): TpActionDataRecord;
	/** Removes everything up to `separator` from key names of `dr` object and returns a new object with new key names and values copied from `dr`.
		if `removeFromSource` is `true` then the original key is deleted from `dr`. Otherwise `dr` is not modified. */
	static splitRecordKeys(dr: TpActionDataRecord, separator: string, removeFromSource?: boolean): TpActionDataRecord;
}
type SizeType = {
	width: number;
	height: number;
};
/** The `Size` class represents an object with `width` and `height` properties. Convenience properties and methods are provided for various operations.
It also provides static methods for working with any `SizeType` object (anything with `width` and `height` properties).
*/
declare class Size implements SizeType {
	width: number;
	height: number;
	constructor(widthOrSize?: number | Size | SizeType, height?: number);
	/** Returns true if either of the width or height are less than or equal to zero. */
	get isEmpty(): boolean;
	/** Returns true if both width and height values are zero. */
	get isNull(): boolean;
	/** Returns true if both width and height values are equal to zero to within 4 decimal places of precision. */
	get fuzzyIsNull(): boolean;
	/** Returns a new `Size` instance with values copied from this one. */
	clone(): Size;
	/** Set the width and height properties.
		The `widthOrSize` parameter can be any object containing 'width' and 'height' properties, or a numeric value for the 'width' value.
		In the latter case, if a `height` parameter is passed, it is assigned to the 'height' value; otherwise the `widthOrSize` parameter
		is used for both 'width' and 'height'.  */
	set(widthOrSize?: number | SizeType, height?: number): this;
	/** Returns true if this size equals the `widthOrSize` SizeType or width & height values. */
	equals(widthOrSize: number | SizeType, height?: number): boolean;
	/** Returns true is this size equals the given SizeType to within `epsilon` decimal places of precision. */
	fuzzyEquals(other: SizeType, epsilon?: number): boolean;
	/** Adds value(s) to current coordinates. Modifies the current value of this instance and returns itself */
	plus_eq(widthOrSize: number | SizeType | PointType, height?: number): this;
	/** Adds value(s) to current coordinates and returns a new Vect2d object. */
	plus(widthOrSize: number | SizeType | PointType, height?: number): Size;
	/** Adds value(s) to `size` and returns new instance, does not modify input value. */
	static add(size: Size, widthOrSize: number | SizeType | PointType, height?: number): Size;
	/** Multiplies current coordinates by value(s). Modifies the current value of this instance and returns itself */
	times_eq(widthOrSize: number | SizeType | PointType, height?: number): this;
	/** Multiplies current coordinates by value(s) and returns a new `Vect2d` object. */
	times(widthOrSize: number | SizeType | PointType, height?: number): Size;
	/** Multiplies `size` coordinates by value(s) and returns new instance, does not modify input value, */
	static multiply(size: Size, widthOrSize: number | SizeType | PointType, height?: number): Size;
	toString(): void;
	/** Returns a new SizeType object with width and height set from number value(s) or another SizeType object. */
	static new(widthOrSize?: number | SizeType, height?: number): SizeType;
	/** Sets the width and height values of a SizeType object.
		The `widthOrSize` parameter can be any object containing 'width' and 'height' properties, or a numeric value for the 'width' value.
		In the latter case, if a `height` parameter is passed, it is assigned to the 'height' value; otherwise the `widthOrSize` parameter
		is used for both 'width' and 'height'.  */
	static set(sz: SizeType, widthOrSize?: number | SizeType, height?: number): SizeType;
	/** Returns true if either of the width or height are less than or equal to zero. */
	static isEmpty(sz: SizeType): boolean;
	/** Returns true if both width and height of `sz` are zero. */
	static isNull(sz: SizeType): boolean;
	/** Returns true if both width and height of `sz` are within `epsilon` delta of zero. */
	static fuzzyIsNull(sz: SizeType, epsilon?: number): boolean;
	/** Returns true if `sz` SizeType equals the `widthOrSize` SizeType or width & height values. */
	static equals(sz: SizeType, widthOrSize: number | SizeType, height?: number): boolean;
	/** Returns true is this SizeType equals the given SizeType to within `epsilon` decimal places of precision. */
	static fuzzyEquals(sz: SizeType, other: SizeType, epsilon?: number): boolean;
	/** Adds value(s) to `sz` and returns it. Modifies input value. */
	static plus_eq(sz: SizeType, widthOrSize: number | SizeType | PointType, height?: number): SizeType;
	/** Adds value(s) to `sz` and returns new instance, does not modify input value. */
	static plus(sz: SizeType, widthOrSize: number | SizeType | PointType, height?: number): SizeType;
	/** Multiplies `sz` coordinates by value(s) and returns it. Modifies input value. */
	static times_eq(sz: SizeType, widthOrSize: number | SizeType | PointType, height?: number): SizeType;
	/** Multiplies `sz` coordinates by value(s) and returns new instance, does not modify input value, */
	static times(sz: SizeType, widthOrSize: number | SizeType | PointType, height?: number): SizeType;
	static toString(sz: SizeType, name?: string): string;
}
export interface CanvasTransform {
		rotate(radians: number, origin?: PointType): void;
		rotate(radians: number, origin?: [
			number,
			number
		]): void;
		rotate(radians: number, originX?: number, originY?: number): void;
		scale(x: number, y: number, origin?: PointType): void;
		scale(x: number, y: number, origin?: [
			number,
			number
		]): void;
		scale(x: number, y: number, originX?: number, originY?: number): void;
	}
	interface DOMMatrix {
		rotate(degX?: number, degY?: number, degZ?: number, origin?: PointType): DOMMatrix;
		rotate(degX?: number, degY?: number, degZ?: number, origin?: [
			number,
			number
		]): DOMMatrix;
		rotate(degX?: number, degY?: number, degZ?: number, originX?: number, originY?: number): DOMMatrix;
		rotateSelf(degX?: number, degY?: number, degZ?: number, origin?: PointType): DOMMatrix;
		rotateSelf(degX?: number, degY?: number, degZ?: number, origin?: [
			number,
			number
		]): DOMMatrix;
		rotateSelf(degX?: number, degY?: number, degZ?: number, originX?: number, originY?: number): DOMMatrix;
		rotateZ(degrees: number, origin?: PointType): DOMMatrix;
		rotateZ(degrees: number, origin?: [
			number,
			number
		]): DOMMatrix;
		rotateZ(degrees: number, originX?: number, originY?: number): DOMMatrix;
		rotateZSelf(degrees: number, origin?: PointType): DOMMatrix;
		rotateZSelf(degrees: number, origin?: [
			number,
			number
		]): DOMMatrix;
		rotateZSelf(degrees: number, originX?: number, originY?: number): DOMMatrix;
		skew(sx?: number, sy?: number, origin?: PointType): DOMMatrix;
		skew(sx?: number, sy?: number, origin?: [
			number,
			number
		]): DOMMatrix;
		skew(sx?: number, sy?: number, originX?: number, originY?: number): DOMMatrix;
		skewSelf(sx?: number, sy?: number, origin?: PointType): DOMMatrix;
		skewSelf(sx?: number, sy?: number, origin?: [
			number,
			number
		]): DOMMatrix;
		skewSelf(sx?: number, sy?: number, originX?: number, originY?: number): DOMMatrix;
	}

declare const enum Str {
	PluginId = "Touch Portal Dynamic Icons",
	PluginName = "Touch Portal Dynamic Icons",
	PluginShortName = "Dynamic Icons",
	IconCategoryName = "Dynamic Icons",// Name of TP Category for dynamically created icon States.
	IdPrefix = "dynamic_icons_",// prefix used in TP IDs for actions/data/states/etc
	IdSep = "_",// action/data ID separator character
	Default = "default",// used in action fields TP UI to indicate a default value
	DefaultChar = "d"
}
declare const enum StateId {
	IconsList = "dynamic_icons_createdIconsList"
}
declare const enum ActHandler {
	Icon = "icon",
	Control = "control"
}
declare const enum Act {
	ControlCommand = "command",
	IconDeclare = "declare",
	IconGenerate = "generate",
	IconSaveFile = "saveFile",
	IconProgGauge = "progGauge",
	IconProgBar = "progBar",
	IconBarGraph = "barGraph",
	IconCircularTicks = "circularTicks",
	IconLinearTicks = "linearTicks",
	IconRect = "rect",
	IconText = "text",
	IconImage = "image",
	IconScript = "script",
	IconFilter = "filter",
	IconCompMode = "compMode",
	IconTx = "tx",
	IconRectPath = "rectpath",
	IconEllipse = "ellipse",
	IconPath = "path",
	IconStyle = "style",
	IconClip = "clip",
	IconSetTx = "set_tx",
	IconSetValue = "set_value",
	IconSetColor = "set_color"
}
declare const enum ActData {
	CommandAction = "action",
	CommandIcon = "icon"
}
declare const enum ChoiceDataId {
	ControlIconsList = "dynamic_icons_control_command_icon"
}
declare const enum DataValue {
	ClearImageCache = "Clear the Source Image Cache",
	DelIconState = "Delete Icon State",
	ClipMaskNormal = "Create Normal",
	ClipMaskInverse = "Create Inverse",
	ClipMaskRelease = "Release",
	ColorTypeStroke = "Stroke/Foreground",
	ColorTypeFill = "Fill/Background",
	ColorTypeShadow = "Shadow",
	TxScopePreviousOne = "previous layer",
	TxScopeCumulative = "all previous",
	TxScopeUntilReset = "all following",
	TxScopeReset = "reset following",
	ArcDrawCW = "Clockwise",
	ArcDrawCCW = "Counter CW",
	ArcDrawAuto = "Automatic",
	YesValue = "Yes",
	NoValue = "No",
	OnValue = "On",
	OffValue = "Off",
	PlaceInside = "Inside",
	PlaceOutside = "Outside",
	PlaceInward = "Inward",
	PlaceOutward = "Outward",
	PlaceTopLeft = "Top/Left",
	PlaceBotRight = "Bottom/Right",
	PlaceCenter = "Center"
}
declare const enum SettingName {
	IconSize = "Default Icon Size",
	ImageFilesPath = "Default Image Files Path",
	GPU = "Use GPU Rendering by Default",
	PngCompressLevel = "Default Output Image Compression Level (0-9)",
	PngQualityLevel = "Default Output Image Quality (1-100)",
	MaxImageProcThreads = "Maximum Image Compression Threads",
	MaxImageGenThreads = "Maximum Image Generator Threads"
}
declare const ALIGNMENT_ENUM_NAMES: {
	readonly 0: "";
	readonly 1: "left";
	readonly 2: "right";
	readonly 4: "center";
	readonly 8: "justify";
	readonly 16: "top";
	readonly 32: "bottom";
	readonly 64: "middle";
	readonly 128: "baseline";
};
declare const enum M {
	PI = 3.141592653589793,
	PI2 = 6.283185307179586,
	PI_2 = 1.5707963267948966,
	D2R = 0.017453292519943295,
	R2D = 57.29577951308232
}
declare const CTRL_CMD_ACTION_CHOICES: DataValue[];
declare const DEFAULT_TRANSFORM_OP_ORDER: TransformOpType[];
declare const STYLE_FILL_RULE_CHOICES: string[];
declare const PATH_BOOL_OPERATION_CHOICES: PathBoolOperation[];
declare const COLOR_UPDATE_TYPE_CHOICES: DataValue[];
declare const ARC_DIRECTION_CHOICES: DataValue[];
declare function cirularGaugeTicksPath(x: number, y: number, rx: number, ry: number, from: number, to: number, count: number, len: number | Array<number>, ctr?: boolean): Path2D;
declare function circularLabelsPath(ctx: RenderContext2D, x: number, y: number, rx: number, ry: number, from: number, to: number, labels: Array<string>, position: 1 | -1, rotate?: number, rotateToAngle?: number): Path2D;
declare function linearGaugeTicksPath(x: number, y: number, size: number, vertical: boolean, count: number, len: number | Array<number>, ctr?: boolean): Path2D;
declare function linearLabelsPath(ctx: RenderContext2D, x: number, y: number, size: number, vertical: boolean, labels: Array<string>, position: 1 | -1, rotate?: number, alignAuto?: boolean): Path2D;
declare function clamp(value: number, min: number, max: number): number;
declare function round2p(value: number): number;
declare function round3p(value: number): number;
declare function round4p(value: number): number;
declare function round5p(value: number): number;
declare function round6p(value: number): number;
declare function fuzzyEquals(value1: number, value2: number, epsilon: number): boolean;
declare function fuzzyEquals3p(value1: number, value2: number): boolean;
declare function fuzzyEquals4p(value1: number, value2: number): boolean;
declare function fuzzyEquals5p(value1: number, value2: number): boolean;
declare function fuzzyEquals6p(value1: number, value2: number): boolean;
declare function normalizeAngle(degrees: number): number;
declare function elideLeft(str: string, maxLen: number): string;
declare function elideRight(str: string, maxLen: number): string;
declare function qualifyFilepath(path: string): string;
declare function assignExistingProperties(to: {}, from?: {}, recurseLevel?: number, strToNum?: boolean): void;
declare function arraysMatchExactly(array1: any[], array2: any[]): boolean;
declare function evaluateValue(value: string, defaultValue?: number | any): number | typeof defaultValue;
declare function evaluateStringValue(value: string): string;
declare function evaluateValueAsArray(value: string): any[];
declare function parseNumericArrayString(value: string, dest: Array<number>, maxCount?: number, minValue?: number, maxValue?: number): boolean;
declare function parsePointFromValue(value: string): PointType;
declare function parseAlignmentFromValue(value: string, mask: Alignment): Alignment;
declare function parseAlignmentsFromString(value: string, mask?: Alignment): Alignment;
declare function parseArcDirection(value: string, defaultValue?: ArcDrawDirection): ArcDrawDirection;
declare function parsePlacement(v: string, defaultValue?: Placement): Placement;
declare function parseBoolFromValue(value: string): boolean;
declare function parseIntOrDefault(value: string, dflt: number): number;
declare function parseBoolOrDefault(value: string, dflt: boolean): boolean;
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
/** Image compression options to use when rendering icon images for final output to Touch Portal.

	Default `compressionLevel` and `quality` are set in plugin settings and can be overridden in an icon's "finalize" action.
	`compressionLevel` of `0` disables compression step entirely (`sharp` lib is never invoked, `skia-canvas` PNG-24 output is used directly).
	Otherwise these are passed to [`sharp.png()`](https://sharp.pixelplumbing.com/api-output#png) for final compression of the `skia-canvas` output.
	Default `effort` is set to `1` and `palette` to `true`.
*/
declare namespace sharp {
	interface PngOptions {
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

declare namespace canvas {
	export { App, Canvas, CanvasCompositing, CanvasDirection, CanvasDrawImage, CanvasDrawPath, CanvasDrawable, CanvasFillRule, CanvasFillStrokeStyles, CanvasFilters, CanvasFontStretch, CanvasGradient, CanvasImageData, CanvasImageSmoothing, CanvasLineCap, CanvasLineJoin, CanvasPath, CanvasPathDrawingStyles, CanvasPattern, CanvasPatternSource, CanvasRect, CanvasRenderingContext2D, CanvasShadowStyles, CanvasState, CanvasText, CanvasTextAlign, CanvasTextBaseline, CanvasTextDrawingStyles, CanvasTexture, CanvasTransform, ColorSpace, ColorType, CreateTextureOptions, CursorStyle, DOMMatrix, DOMMatrix2DInit, DOMMatrixInit, DOMPoint, DOMPointInit, DOMPointReadOnly, DOMRect, DOMRectInit, DOMRectList, DOMRectReadOnly, ExportFormat, FitStyle, FixedLenArray, Font, FontFamily, FontLibrary, FontVariantSetting, GlobalCompositeOperation, Image, ImageData, ImageDataSettings, ImageSmoothingQuality, KeyboardEventProps, Matrix, MouseEventProps, Offset, Path2D, Path2DBounds, Path2DEdge, QuadOrRect, RenderOptions, SaveOptions, TextMetrics, TextMetricsLine, Window, WindowEvents, WindowOptions, loadImage, loadImageData };
}
declare namespace geometry {
	export { Point, PointType, Rectangle, Size, SizeType, UnitValue, Vect2d };
}
declare namespace elements {
	export { BarGraph, BrushStyle, CanvasFilter, CircularTicks, ClipAction, ClippingMask, CompositionMode, DrawDirection, DrawingStyle, DynamicImage, EllipsePath, FreeformPath, GaugeTicks, LinearProgressBar, LinearTicks, Path, RectanglePath, RoundProgressGauge, Script, ShadowStyle, SizedElement, StrokeStyle, StyledRectangle, StyledText, TransformScope, Transformation };
}
declare namespace enums {
	export { Alignment, ArcDrawDirection, ColorUpdateType, LayerRole, Orientation, PathBoolOperation, Placement, TransformOpType };
}
declare namespace utils {
	export { ALIGNMENT_ENUM_NAMES, ARC_DIRECTION_CHOICES, Act, ActData, ActHandler, COLOR_UPDATE_TYPE_CHOICES, CTRL_CMD_ACTION_CHOICES, ChoiceDataId, DEFAULT_TRANSFORM_OP_ORDER, DataValue, M, PATH_BOOL_OPERATION_CHOICES, STYLE_FILL_RULE_CHOICES, SettingName, StateId, Str, arraysMatchExactly, assignExistingProperties, circularLabelsPath, cirularGaugeTicksPath, clamp, elideLeft, elideRight, evaluateStringValue, evaluateValue, evaluateValueAsArray, fuzzyEquals, fuzzyEquals3p, fuzzyEquals4p, fuzzyEquals5p, fuzzyEquals6p, linearGaugeTicksPath, linearLabelsPath, normalizeAngle, parseAlignmentFromValue, parseAlignmentsFromString, parseArcDirection, parseBoolFromValue, parseBoolOrDefault, parseIntOrDefault, parseNumericArrayString, parsePlacement, parsePointFromValue, qualifyFilepath, round2p, round3p, round4p, round5p, round6p };
}

export {
	Canvas,
	CanvasDirection,
	CanvasFillRule,
	CanvasFontStretch,
	CanvasGradient,
	CanvasLineCap,
	CanvasLineJoin,
	CanvasPattern,
	CanvasRenderingContext2D,
	CanvasTextAlign,
	CanvasTextBaseline,
	CanvasTexture,
	DOMMatrix,
	DOMPoint,
	DOMRect,
	GlobalCompositeOperation,
	Image,
	ImageData,
	Path2D,
	Point,
	PointType,
	Rectangle,
	Size,
	SizeType,
	TextMetrics,
	TextMetricsLine,
	UnitValue,
	Vect2d,
	canvas,
	elements,
	enums,
	geometry,
	loadImage,
	loadImageData,
	sharp,
	utils,
};

export {};

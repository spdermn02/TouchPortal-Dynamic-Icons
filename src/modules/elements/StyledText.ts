
import { Alignment, LayerRole, ParseState, Rectangle, UnitValue } from '../';
import { evaluateStringValue } from '../../utils'
import { Act, ALIGNMENT_ENUM_NAMES, Str } from '../../utils/consts';
import { DrawingStyle } from './';
import SizedElement, {type  SizedElementInit} from './SizedElement';

import type { IColorElement, ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type { ColorUpdateType, Path2D, } from '../';

/** Draws text on a canvas context with various options. The text can be fully styled with the embedded {@link style} {@link DrawingStyle} property.

    @property width The width property can set the maximum width of the text for automatic wrapping.
        If width value is greater than zero and {@link wrap} is `true` then text will be automatically wrapped if it doesn't already fit into the specified width.
        The default width is `0` and no automatic wrapping will occur.
    @property height The height property is not used in the `StyledText` element.
    @property alignment  How to align the text within given drawing area. See also {@link align}, {@link valign}, {@link halign} properties.
*/
export default class StyledText extends SizedElement implements ILayerElement, IRenderable, IValuedElement, IColorElement
{
    /** The default font variant ensures ligature support, especially useful for named symbol fonts. */
    static readonly defaultFontVariant = 'common-ligatures discretionary-ligatures contextual';

    /** All visual styling options to apply when drawing the text. */
    readonly style: DrawingStyle;

    /** Horizontal text alignment, if different from overall block {@link halign}.
        If value is `Alignment.NONE` (default) then block alignment is used. Otherwise can be one of the horizontal alignment types.

        Note that this is really only relevant for multi-line text blocks since it will determine how the lines align in
        relation to each other. With a single line of text the horizontal alignment will always appear to follow the overall
        block alignment anyway (eg. if `halign` is 'left' and `textAlign` is 'right' the text will still be aligned with the left
        side of the image).
    */
    textAlign: Alignment = Alignment.NONE;

    // These are all private because changing them will affect the cached text metrics.
    #text: string = "";
    #font: string = "";
    #variant: string = StyledText.defaultFontVariant;
    #smallCaps: string = "";
    #direction: CanvasDirection = 'inherit';
    #letterSpacing: UnitValue = new UnitValue(0, "px");
    #wordSpacing: UnitValue = new UnitValue(0, "px");
    #decoration: string = "";
    #stretch: CanvasFontStretch | '' = "";
    #wrap: boolean = true;
    #hinting: boolean = true;   // looks & aligns better with most fonts
    #tm: TextMetrics | null = null;  // cached as needed

    constructor(init?: PartialDeep<StyledText> & SizedElementInit) {
        super();
        this.style = new DrawingStyle(init?.style);
        super.init(init);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    /** Returns `true` if there is nothing to draw: text is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
    override get isEmpty(): boolean {
        return !this.#text || (this.style.fill.isEmpty && this.style.stroke.isEmpty);
    }

    /** The text to draw. May contain `\n` control characters for multi-line text (unless the {@link wrap} property is disabled). */
    get text() { return this.#text; }
    set text(text: string) {
        if (this.#text != text) {
            this.#text = text;
            this.resetMetrics();
        }
    }

    /** Font is specified as a single CSS/CanvasRenderingContext2D style string expression which may contain size, family, and other options.
        See https://developer.mozilla.org/en-US/docs/Web/CSS/font for reference.

        Note that only the following generic font family names are supported: `serif`, `sans-serif`, `monospace`, and `system-ui`.
    */
    get font() { return this.#font; }
    set font(fontspec: string) {
        if (this.#font != fontspec) {
            this.#font = fontspec;
            // if user specified a "small-caps" variant in the font spec then we need to also
            // include that when setting `ctx.fontVariant` since it overrides the variant set in `ctx.font`.
            this.#smallCaps = fontspec.includes("small-caps") ? " small-caps" : "";
            this.style.stroke.widthScale = 1;  // depends on font, reset it
            this.resetMetrics();
        }
    }

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
    get fontVariant() { return this.#variant; }
    set fontVariant(variant: string) {
        if (this.#variant != variant) {
            this.#variant = variant;
            this.style.stroke.widthScale = 1;  // depends on font, reset it
            this.resetMetrics();
        }
    }

    /** Text drawing direction: 'ltr', 'rtl', or 'inherit' (default). */
    get direction() { return this.#direction; }
    set direction(dir: CanvasDirection) {
        if (this.#direction != dir) {
            this.#direction = dir;
            this.resetMetrics();
        }
    }

    /** Letter spacing property expressed as a CSS `length` value, eg: "2px" or "1em". Default is `0px`. */
    get letterSpacing() { return this.#letterSpacing.toString(); }
    set letterSpacing(spacing: string) {
        if (this.letterSpacing != spacing) {
            this.#letterSpacing.setFromString(spacing);
            this.resetMetrics();
        }
    }

    /** Word spacing property expressed as a CSS `length` value, eg: "2px" or "1em". Default is `0px`. */
    get wordSpacing() { return this.#wordSpacing.toString(); }
    set wordSpacing(spacing: string) {
        if (this.wordSpacing != spacing) {
            this.#wordSpacing.setFromString(spacing);
            this.resetMetrics();
        }
    }

    /** The `fontStretch` property specifies how the font may be expanded or condensed when drawing text.
        Value is one of: `ultra-condensed`, `extra-condensed`, `condensed`, `semi-condensed`, `normal` (default),
        `semi-expanded`, `expanded`, `extra-expanded`, `ultra-expanded` */
    get fontStretch() { return this.#stretch || 'normal'; }
    set fontStretch(value: CanvasFontStretch) {
        if (this.#stretch != value) {
            this.#stretch = value;
            this.resetMetrics();
        }
    }

    /** The `textDecoration` property can be assigned a string using the same syntax as the CSS
        [text-decoration](https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration) property.
        Set it to `none` or an empty value to draw undecorated text (default). */
    get textDecoration() { return this.#decoration; }
    set textDecoration(value: string) {
        if (this.#decoration != value) {
            this.#decoration = value;
            this.resetMetrics();
        }
    }

    /** Specifies whether drawn text should be wrapped.
        Currently only has any effect when {@link text} contains `\n` controls characters (there is no auto-wrapping).
        It can be set to `false` to prevent wrapping (in which case any `\n` in the text will be ignored). */
    get wrap() { return this.#wrap; }
    set wrap(wrap: boolean) {
        if (this.#wrap != wrap) {
            this.#wrap = wrap;
            this.resetMetrics();
        }
    }

    /** Enables or disables font hinting when drawing text and calculating metrics (for alignment). Default is enabled. */
    get fontHinting() { return this.#hinting; }
    set fontHinting(value: boolean) {
        if (this.#hinting != value) {
            this.#hinting = value;
            this.resetMetrics();
        }
    }

    // IValuedElement
    /** Sets the current {@link StyledText#text} property from an evaluated input string (embedded JS is resolved). */
    setValue(text: string): void {
        this.text = evaluateStringValue(text);
    }

    // IColorElement
    /** @internal */
    setColor(value: string, type: ColorUpdateType): void { this.style.setColor(value, type); }

    // ILayerElement
    /** @internal */
    loadFromActionData(state: ParseState): StyledText {
        const dr = state.asRecord(state.pos, Act.IconText + Str.IdSep);
        super.loadFromDataRecord(dr);
        if (dr.str != undefined)
            this.setValue(dr.str);
        if (dr.font != undefined)
            this.font = dr.font;
        if (dr.tracking != undefined)
            // the deprecated skia-canvas textTracking value was a signed int representing 1/1000 of an 'em'
            this.letterSpacing = (parseFloat(dr.tracking) || 0) / 1000 + 'em';
        else if (dr.letterSpacing != undefined)
            this.letterSpacing = dr.letterSpacing;
        this.style.loadFromDataRecord(ParseState.splitRecordKeys(dr, Act.IconStyle + Str.IdSep));
        // console.dir(this);
        return this;
    }

    /** Clears any cached text metrics. Typically the cache management is handled automatically when relevant properties are modified. */
    resetMetrics() {
        this.#tm = null;
    }

    protected applyCommonContextProperties(ctx: RenderContext2D) {
        ctx.font = this.#font;
        ctx.fontVariant = this.#variant + this.#smallCaps as any;  // FontVariantSetting
        ctx.direction = this.#direction;
        ctx.textWrap = this.#wrap;
        ctx.textAlign = !(this.textAlign & Alignment.H_MASK) ? this.halign : ALIGNMENT_ENUM_NAMES[this.textAlign & Alignment.H_MASK];
        ctx.fontHinting = this.#hinting;
        if (!!this.#letterSpacing.value)
            ctx.letterSpacing = this.letterSpacing;
        if (!!this.#wordSpacing.value)
            ctx.wordSpacing = this.wordSpacing;
        if (!!this.#decoration)
            ctx.textDecoration = this.#decoration;
        if (!!this.#stretch)
            ctx.fontStretch = this.#stretch;
    }

    /** Returns the current {@link text} outline as a `Path2D` object, taking into account all current typography settings (e.g., font, alignment, wrapping, etc.).
        The path is not scaled and has a 0,0 origin point, so typically it would need to be scaled and aligned separately within a container (eg. by {@link FreeformPath}).
        If a positive `maxWidth` is given and {@link wrap} property is `true` then the text will be word-wrapped to the given width if needed.
    */
    asPath(ctx: RenderContext2D, maxWidth?: number): Path2D {
        ctx.save();
        this.applyCommonContextProperties(ctx);
        ctx.textBaseline = this.valign;
        const path = ctx.outlineText(this.#text, maxWidth);
        ctx.restore();
        return path;
    }

    // IRenderable
    /** Draws the current {@link text} value with all styling and positioning options applied onto `ctx` using `rect` dimensions for scaling and alignment. */
    render(ctx: RenderContext2D, rect: Rectangle): void {
        // console.dir(this);
        if (!ctx || this.isEmpty)
            return;

        ctx.save();
        this.applyCommonContextProperties(ctx);

        // Calculate the stroke width first, if any.
        let penAdjust = 0;
        if (!this.style.stroke.isEmpty) {
            if (this.style.stroke.width.isRelative && this.style.stroke.widthScale == 1) {
                // stroke line width is percentage of half the font size; only calculate if we haven't already.
                const charMetric:any = ctx.measureText("W");
                this.style.stroke.widthScale = Math.max(charMetric.width, charMetric.fontBoundingBoxAscent + charMetric.fontBoundingBoxDescent) * .005;
            }
            // need to offset the draw origin by half of the line width, otherwise it may clip off an edge
            penAdjust = this.style.stroke.scaledWidth * .5;
            // save the current context shadow settings -- we may need to restore these before drawing the stroke (if we also have a fill).
            this.style.shadow.saveContext(ctx);
        }

        // Auto-wrap text to max. set width unless it is set to <= 0.
        const maxWidth = this.width.value > 0 ? this.actualWidth(rect.width) : undefined;

        // Set vertical default text alignment before getting text metrics. "middle" gets the right metrics for all our cases.
        ctx.textBaseline = 'middle';
        if (!this.#tm)
            this.#tm = ctx.measureText(this.#text, maxWidth);

        // Calculate the draw offset based on calculated text bounds, alignment settings and user-specified offset.
        // Add padding around actual text bounds for pen width plus 1.5% of drawing area to match how previous versions were padded.
        const
            padX = penAdjust + rect.width * .015,
            padY = penAdjust + rect.height * .015,
            bounds = new Rectangle(
                -this.#tm.actualBoundingBoxLeft - padX,
                -this.#tm.actualBoundingBoxAscent - padY,
                this.#tm.width + padX * 2,
                this.#tm.actualBoundingBoxAscent + this.#tm.actualBoundingBoxDescent + padY * 2
            ),
            offset = super.computeOffset(bounds, rect, true);
        // console.log(this.text, this.font, penAdjust, rect.size, bounds.toString(), offset, this.#tm);

        // move to position before drawing
        ctx.translate(offset.x, offset.y);
        // set canvas drawing style properties
        this.style.render(ctx);

        if (!this.style.fill.isEmpty) {
            ctx.fillText(this.#text, rect.x, rect.y, maxWidth);
            // prevent shadow from being drawn on the stroke as well
            if (penAdjust)
                this.style.shadow.restoreContext(ctx);
        }
        if (penAdjust) // will be non-zero if we have a stroke to draw
            ctx.strokeText(this.#text, rect.x, rect.y, maxWidth);

        ctx.restore();
    }
}

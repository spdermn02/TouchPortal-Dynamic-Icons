
import { Alignment, LayerRole, ParseState, Point, UnitValue, Vect2d } from '../';
import { DrawingStyle } from './';
import {
    ALIGNMENT_ENUM_NAMES,
    assignExistingProperties, evaluateValue, evaluateStringValue,
    parseAlignmentFromValue, parseAlignmentsFromString,
} from '../../utils'
import { Act, Str } from '../../utils/consts';

import type { IColorElement, ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type {
    CanvasTextAlign, CanvasTextBaseline, ColorUpdateType,
    Path2D, PointType, Rectangle, RenderContext2D, TextMetrics,
} from '../';

/** Draws text on a canvas context with various options. The text can be fully styled with the embedded {@link style} {@link DrawingStyle} property. */
export default class StyledText implements ILayerElement, IRenderable, IValuedElement, IColorElement
{
    /** The default font variant ensures ligature support, especially useful for named symbol fonts. */
    static readonly defaultFontVariant = 'common-ligatures discretionary-ligatures contextual';

    /** How to align the text within given drawing area. See also {@link align}, {@link valign}, {@link halign} properties. */
    alignment: Alignment = Alignment.CENTER;
    /** Extra position offset to apply after alignment. Expressed as a percentage of overall drawing area size. */
    readonly offset: Vect2d;
    /** All visual styling options to apply when drawing the text. */
    readonly style: DrawingStyle;

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

    constructor(init?: PartialDeep<StyledText> & { offset?: number|PointType }) {
        this.offset = new Vect2d(init?.offset);
        this.style = new DrawingStyle(init?.style);
        assignExistingProperties(this, init, 0);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    /** Returns `true` if there is nothing to draw: text is empty, colors are blank or transparent, or there is no fill and stroke width is zero */
    get isEmpty(): boolean {
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

    /** Alignment value as two string values, one for each direction. Eg. "left top" or "middle center".
    Setting the property can be done with either a single direction or both (separated by space or comma) in either order. */
    get align(): string {
         return ALIGNMENT_ENUM_NAMES[this.alignment & Alignment.H_MASK] + ' ' + ALIGNMENT_ENUM_NAMES[this.alignment & Alignment.V_MASK];
    }
    set align(value: string | Alignment) {
        if (typeof value == 'string')
            value = parseAlignmentsFromString(value);
        let mask = (value & Alignment.H_MASK) ? Alignment.H_MASK : Alignment.NONE;
        if (value & Alignment.V_MASK)
            mask |= Alignment.V_MASK;
        this.setAlignment(value, mask);
    }

    /** Horizontal alignment value as string. One of: 'left', 'center', 'right' */
    get halign(): CanvasTextAlign { return ALIGNMENT_ENUM_NAMES[this.alignment & Alignment.H_MASK]; }
    set halign(value: CanvasTextAlign | Alignment) {
        if (typeof value == 'string')
            value = parseAlignmentFromValue(value, Alignment.H_MASK);
        this.setAlignment(value, Alignment.H_MASK);
    }

    /** Vertical alignment value as string. One of: 'top', 'middle', 'bottom', 'baseline' */
    get valign(): CanvasTextBaseline { return ALIGNMENT_ENUM_NAMES[this.alignment & Alignment.V_MASK]; }
    set valign(value: CanvasTextBaseline | Alignment) {
        if (typeof value == 'string')
            value = parseAlignmentFromValue(value, Alignment.V_MASK);
        this.setAlignment(value, Alignment.V_MASK);
    }

    /** Returns true if alignment value was changed, false otherwise. Direction to set can be limited by `mask` argument. */
    setAlignment(value: Alignment, mask: Alignment = Alignment.H_MASK | Alignment.V_MASK): boolean {
        if ((this.alignment & mask) != value) {
            this.alignment &= ~mask;
            this.alignment |= value;
            return true;
        }
        return false;
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
        for (const [key, value] of Object.entries(dr)) {
            switch (key) {
                case 'str':
                    this.setValue(value);
                    break;
                case 'font':
                    this.font = value.trim();
                    break;
                case 'alignH':
                    this.halign = <CanvasTextAlign>value;
                    break;
                case 'alignV':
                    this.valign = <CanvasTextBaseline>value;
                    break;
                case 'ofsH':
                    this.offset.x = evaluateValue(value);
                    break;
                case 'ofsV':
                    this.offset.y = evaluateValue(value);
                    break;
                case 'tracking':
                    // the deprecated skia-canvas textTracking value was a signed int representing 1/1000 of an 'em'
                    this.letterSpacing = (parseFloat(value) || 0) / 1000 + 'em';
                    break;
                default:
                    continue;
            }
            delete dr[key];
        }
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
        ctx.textAlign = this.halign;
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

        // Set vertical default text alignment before getting text metrics (below, if we need them). "middle" gets the right metrics for all our cases.
        ctx.textBaseline = 'middle';

        // Calculate the draw offset based on alignment settings.
        const offset = Point.new();
        // horizontal
        switch (this.alignment & Alignment.H_MASK) {
            case Alignment.HCENTER:
            case Alignment.JUSTIFY:
                if (!this.#tm)
                    this.#tm = ctx.measureText(this.#text);
                offset.x = (rect.width * 0.5 - this.#tm.actualBoundingBoxLeft + this.#tm.actualBoundingBoxRight);
                break;
            case Alignment.LEFT:
                // add some left padding
                offset.x = rect.width * .015 + penAdjust;
                break;
            case Alignment.RIGHT:
                // add some right padding
                offset.x = rect.width - rect.width * .015 - penAdjust;
                break;
        }
        // vertical
        switch (this.alignment & Alignment.V_MASK) {
            case Alignment.VCENTER:
                if (!this.#tm)
                    this.#tm = ctx.measureText(this.#text);
                offset.y = (rect.height - this.#tm.actualBoundingBoxAscent - this.#tm.actualBoundingBoxDescent) * 0.5 + this.#tm.actualBoundingBoxAscent;
                break;
            case Alignment.TOP:
                // no extra padding needed here since using "top" as baseline adds some already
                ctx.textBaseline = 'top';
                offset.y = penAdjust;
                break;
            case Alignment.BOTTOM:
            case Alignment.BASELINE:
                if (!this.#tm)
                    this.#tm = ctx.measureText(this.#text);
                // needs a little bottom padding to match spacing of top aligned text
                offset.y = rect.height - this.#tm.actualBoundingBoxDescent - penAdjust - rect.height * .015;
                break;
        }
        // console.log(this.text, this.font, rect.size, offset, penAdjust, this.tm);

        // add any user-specified offset as percent of canvas size
        if (!Point.isNull(this.offset))
            Point.plus_eq(offset, Point.times(this.offset, rect.width * .01, rect.height * .01));
        // move to position before drawing
        ctx.translate(offset.x, offset.y);

        // set canvas drawing style properties
        this.style.render(ctx);

        if (!this.style.fill.isEmpty) {
            ctx.fillText(this.#text, rect.x, rect.y);
            // prevent shadow from being drawn on the stroke as well
            if (penAdjust)
                this.style.shadow.restoreContext(ctx);
        }
        if (penAdjust) // will be non-zero if we have a stroke to draw
            ctx.strokeText(this.#text, rect.x, rect.y);

        ctx.restore();
    }
}

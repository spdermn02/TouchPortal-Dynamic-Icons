
import { Transformation } from './';
import { globalImageCache, Image, LayerRole, Rectangle } from '../'
import { assignExistingProperties, evaluateStringValue } from '../../utils';
import type { ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type { DynamicIcon, ParseState } from '../'

/**
    This class hold an image source (file path or b64 string) and associated data like processing options and a transformation to apply.

    It makes use of a global image cache for storing & retrieving the actual images.

    The `render()` method will take care of any required scaling (according to the {@link resizeOptions.fit} property setting)
    and apply the {@link transform}, if needed.
*/
export default class DynamicImage implements ILayerElement, IRenderable, IValuedElement
{
    /** Path to image file or a base-64 encoded string containing image data.
        Relative paths are resolved against default file path configured in plugin settings, if any. */
    source: string = "";
    /** The icon name to which this image is assigned. This is required for image cache management. */
    iconName: string = "";
    /** Settings to determine how images are resized to fit into drawing area. */
    resizeOptions = {
        /** Defines how to resize image. Equivalent to the CSS {@link https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit | object-fit} property.
            One of: "contain", "cover", "fill", "scale-down", or "none" */
        fit: <ResizeFitOption> "contain"
    };
    /** Tranformation to apply to this image when drawn. See {@link Transformation} for details. */
    readonly transform: Transformation;

    /** Constructor argument requires an object with either `iconName: string` or `parentIcon: DynamicIcon` properties. */
    constructor(init: RequireAtLeastOne<PartialDeep<DynamicImage & {fit: ResizeFitOption}> & { parentIcon?: DynamicIcon }, 'iconName' | 'parentIcon'>) {
        if (!init?.iconName && !init?.parentIcon)
            throw new Error("'parentIcon' or 'iconName' properties are required in DynamicImage constructor's init object argument.");
        this.transform = new Transformation(init?.transform);
        if (init.parentIcon)
            this.iconName = init.parentIcon.name;
        if (init.resizeOptions)
            assignExistingProperties(this.resizeOptions, init?.resizeOptions, 0);
        else if (init.fit)
            this.resizeOptions.fit = init.fit;
        assignExistingProperties(this, init, 0);
    }

    // ILayerElement
    /** @internal */
    readonly layerRole: LayerRole = LayerRole.Drawable;

    /** Returns true if source string is empty */
    get isEmpty(): boolean { return !this.source; }

    // IValuedElement
    /** Sets/updates the image source using an evaluated string. */
    setValue(value: string) {
        // Fixup \ in Windows paths to \\, otherwise they're treated as escapes in the following eval.
        // Ignore any value that contains a / to preserve code (eg. regex), since that's not a legal Windows path character anyway.
        const isb64Data = value.startsWith("data:");
        if (!isb64Data && process.platform == "win32" && value.indexOf('/') < 0)
            value = value.replace(/\\/g, "\\\\");
        this.source = isb64Data ? value : evaluateStringValue(value.trim());
    }

    /** @internal Used by plugin action handler for tx update action. */
    loadTransform(dr: TpActionDataRecord) {
        this.transform.loadFromDataRecord(dr);
    }

    /** @internal */
    loadFromActionData(state: ParseState): DynamicImage {
        const dr = state.dr;
        if (dr.src != undefined)
            this.setValue(dr.src);
        if (dr.fit)
            this.resizeOptions.fit = <ResizeFitOption>dr.fit;
        this.loadTransform(dr);
        // console.dir(this);
        return this;
    }

    /** Scales `imgRect` to size of `intoRect` based on `fit` strategy. Also centers `imgRect` if it is smaller than `intoRect` in either dimension.

        Modifies `imgRect` input, returns undefined. */
    static scaleImageRect(imgRect: Rectangle, intoRect: Rectangle, fit: ResizeFitOption)  {
        let scale = 0;
        switch (fit) {
            case 'contain':
                scale = Math.min(intoRect.width / imgRect.width, intoRect.height / imgRect.height);
                break;
            case 'scale-down':
                scale = Math.min(1, intoRect.width / imgRect.width, intoRect.height / imgRect.height);
                break;
            case 'cover':
                scale = Math.max(intoRect.width / imgRect.width, intoRect.height / imgRect.height);
                break;
            case 'fill':
                imgRect.setSize(intoRect.size);
                // assumes imgRect.origin already == intoRect.origin
                return;
            // 'none'
            default:
                break;
        }
        if (scale != 0) {
            imgRect.setSize(
                Math.ceil(imgRect.width * scale),
                Math.ceil(imgRect.height * scale)
            );
        }
        // for legacy reasons we don't translate oversize images beyond (negatively) the top left boundary of drawing rectangle
        imgRect.translate(
            Math.max(0, (intoRect.width - imgRect.width) * .5),
            Math.max(0, (intoRect.height - imgRect.height) * .5)
        );
    }

    // IRenderable
    /** Loads and draws source image onto the given `ctx` using all current properties such as resize strategy and transformation steps. */
    async render(ctx: RenderContext2D, rect: Rectangle) : Promise<void> {
        if (!ctx || this.isEmpty)
            return;

        const img = await globalImageCache().getOrLoadImage(this.source, rect.size, this.resizeOptions, { iconName: this.iconName });
        if (!img)
            return;

        const imgRect = new Rectangle(rect.origin, img.width, img.height);
        // `Image` type instances are actually scalable vectors (SVG) so we need to resize & position them here
        if (img instanceof Image)
            DynamicImage.scaleImageRect(imgRect, rect, this.resizeOptions.fit);

        // check if any transformation steps are needed, otherwise just draw the image directly
        if (!this.transform.isEmpty) {
            const prevTx = ctx.getTransform();
            this.transform.render(ctx, imgRect);
            ctx.drawImage(img, imgRect.x, imgRect.y, imgRect.width, imgRect.height);
            ctx.setTransform(prevTx);
        }
        else {
            ctx.drawImage(img, imgRect.x, imgRect.y, imgRect.width, imgRect.height);
        }
    }
}

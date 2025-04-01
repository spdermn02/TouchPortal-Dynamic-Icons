
import { Transformation } from './';
import { globalImageCache, Image, Rectangle } from '../'
import { evaluateStringValue } from '../../utils';
import type { ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import type { ParseState, RenderContext2D } from '../'

type CssObjectFit = "contain" | "cover" | "fill" | "scale-down" | "none";

// This class hold an image source (path) and associated data like processing options or transformation to apply.
export default class DynamicImage implements ILayerElement, IRenderable, IValuedElement
{
    source: string = "";
    transform: Transformation | null = null;
    iconName: string = "";   // for icon cache meta data
    resizeOptions: any = {
        fit: <CssObjectFit> "contain"
    };

    constructor(init?: Partial<DynamicImage>) { Object.assign(this, init); }
    // ILayerElement
    readonly type: string = "DynamicImage";
    // returns true if source string is empty
    get isEmpty(): boolean { return !this.source; }

    loadTransform(state: ParseState) {
        if (this.transform)
            this.transform.loadFromActionData(state);
        else
            this.transform = new Transformation().loadFromActionData(state);
    }

    // IValuedElement
    // Sets/updates the image source.
    setValue(value: string) {
        // Fixup \ in Windows paths to \\, otherwise they're treated as escapes in the following eval.
        // Ignore any value that contains a / to preserve code (eg. regex), since that's not a legal Windows path character anyway.
        const isb64Data = value.startsWith("data:");
        if (!isb64Data && process.platform == "win32" && value.indexOf('/') < 0)
            value = value.replace(/\\/g, "\\\\");
        this.source = isb64Data ? value : evaluateStringValue(value.trim());
    }

    loadFromActionData(state: ParseState): DynamicImage {
        let atEnd = false;
        let txParsed = false;
        for (let e = state.data.length; state.pos < e && !atEnd;) {
            const data = state.data[state.pos];
            const dataType = data.id.split('image_').at(-1);  // last part of the data ID determines its meaning
            if (!dataType)
                break;
            switch (dataType) {
                case 'src':
                    this.setValue(data.value);
                    break;
                case 'fit':
                    this.resizeOptions.fit = data.value;
                    break;
                default:
                    // any following fields should be transform data
                    if (!txParsed && dataType.startsWith('tx_')) {
                        this.loadTransform(state);
                        txParsed = true;
                    }
                    else {
                        atEnd = true;
                    }
                    continue;  // do not increment position counter
            }
            ++state.pos;
        }
        // console.dir(this);
        return this;
    }

    // Scales `imgRect` to size of `intoRect` based on `fit` strategy. Also centers `imgRect` if it is smaller than `intoRect` in either dimension.
    // Modifies `imgRect` input.
    private static scaleImageRect(imgRect: Rectangle, intoRect: Rectangle, fit: CssObjectFit)  {
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
        // for legacy reasons we don't translate oversize images beyond the top left boundary of drawing rectangle
        imgRect.translate(
            Math.max(0, (intoRect.width - imgRect.width) * .5),
            Math.max(0, (intoRect.height - imgRect.height) * .5)
        );
    }

    // ILayerElement
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
        if (this.transform && !this.transform.isEmpty) {
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

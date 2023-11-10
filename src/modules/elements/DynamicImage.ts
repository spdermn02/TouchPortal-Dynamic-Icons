
import { ILayerElement, IRenderable, IValuedElement } from '../interfaces';
import { Transformation } from './';
import { globalImageCache, ImageDataType, ParseState, Rectangle, RenderContext2D } from '../'
import { evaluateStringValue } from '../../utils';

// This class hold an image source (path) and associated data like processing options or transformation to apply.

export default class DynamicImage implements ILayerElement, IRenderable, IValuedElement
{
    source: string = "";
    transform: Transformation | null = null;
    iconName: string = "";   // for icon cache meta data
    resizeOptions: any = {
        fit: "contain" // as per CSS object-fit property: contain, cover, fill, scale-down, none
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
        if (process.platform == "win32" && !value.startsWith("data:") && value.indexOf('/') < 0)
            value = value.replace(/\\/g, "\\\\");
        this.source = evaluateStringValue(value.trim());
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

    // ILayerElement
    async render(ctx: RenderContext2D, rect: Rectangle) : Promise<void> {
        if (!ctx || this.isEmpty)
            return;

        const img: ImageDataType = await globalImageCache().getOrLoadImage(this.source, rect.size, this.resizeOptions, { iconName: this.iconName });
        if (!img)
            return;
        // check if any transformation steps are needed, otherwise just draw the image directly
        if (this.transform && !this.transform.isEmpty) {
            const prevTx = ctx.getTransform();
            this.transform.render(ctx, rect);
            ctx.drawImage(img, rect.x, rect.y);
            ctx.setTransform(prevTx);
        }
        else {
            ctx.drawImage(img, rect.x, rect.y);
        }
    }
}


import { ILayerElement, RenderContext2D } from "../interfaces";
import { ParseState, Rectangle } from "../types";
import Transformation from "./Transformation";
import globalImageCache, { ImageDataType } from '../ImageCache'

// This class hold an image source (path) and associated data like processing options or transformation to apply.

export default class DynamicImage implements ILayerElement
{
    source: string = "";
    transform: Transformation | null = null;
    iconName: string = "";   // for icon cache meta data
    resizeOptions: any = {
        fit: "contain" // as per CSS object-fit property: contain, cover, fill, scale-down, none
    };

    constructor(init?: Partial<DynamicImage>) { Object.assign(this, init); }
    // ILayerElement
    get type() { return "DynamicImage"; }
    // returns true if source string is empty
    get isEmpty(): boolean { return !this.source; }

    loadTransform(state: ParseState) {
        if (this.transform)
            this.transform.loadFromActionData(state);
        else
            this.transform = new Transformation().loadFromActionData(state);
    }

    loadFromActionData(state: ParseState): DynamicImage {
        let txParsed = false;
        for (let i = state.pos, e = state.data.length; i < e; ++i) {
            const dataType = state.data[i].id.split('image_').at(-1);  // last part of the data ID determines its meaning
            switch (dataType) {
                case 'src': {
                    const value = state.data[i].value.trim();
                    if (value.length > 4)  // shortest possible valid image file name would be 5 chars.
                        this.source = value;
                    break;
                }
                case 'fit':
                    this.resizeOptions['fit'] = state.data[i].value;
                    break;
                default:
                    // any following fields should be transform data
                    if (txParsed || this.isEmpty || !dataType || !dataType.startsWith('tx_')) {
                        i = e;  // end loop
                        continue;
                    }
                    this.transform = new Transformation().loadFromActionData(state);
                    txParsed = true;
                    i = state.pos;
                    continue;
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

        const img: ImageDataType = await globalImageCache.getOrLoadImage(this.source, rect.size, this.resizeOptions, { iconName: this.iconName });
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

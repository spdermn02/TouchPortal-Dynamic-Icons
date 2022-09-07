import { Canvas } from 'skia-canvas'
import { TransformedOverlayImagesIcon, Transformation } from './interfaces'
import { globalImageCache, ImageDataType } from './ImageCache'
import { PI2 } from '../utils/consts'

export async function buildTransformedOverlayImagesIcon(gauge: TransformedOverlayImagesIcon) : Promise<Buffer>
{
    const w = gauge.size.width;
    const h = gauge.size.height;
    const canvas = new Canvas(w, h);
    const ctx = canvas.getContext("2d");
    const cx = w / 2;
    const cy = h / 2;
    // console.log("GPU support enabled: ", canvas.gpu);  // https://github.com/samizdatco/skia-canvas/issues/111

    // ctx.clearRect(0, 0, w, h)  // doesn't seem necessary
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    for (let i = 0; i < gauge.imageSources.length; ++i) {
        let imgSrc = gauge.imageSources[i];
        let img: ImageDataType = imgSrc ? await globalImageCache.getOrLoadImage(imgSrc, gauge.size) : null;  // returns scaled image
        if (!img)
            continue;
        let tx: Transformation | null;
        // check if any transformation steps are needed, otherwise just draw the image directly
        if (i < gauge.transformations.length && !(tx = gauge.transformations[i]).isEmpty) {
            // all operations from center of image
            ctx.translate(cx, cy);
            for (const op of tx.transformOrder) {
                if (op === 'R' && tx.rotate)
                    ctx.rotate(tx.rotate * 0.01 * PI2);
                else if (op === 'T' && !tx.translate.isEmpty)
                    ctx.translate(tx.translate.x * 0.01 * w, tx.translate.y * 0.01 * h);
                else if (op === 'S' && !tx.scale.isEmpty)
                    ctx.scale(tx.scale.x * 0.01 + 1, tx.scale.y * 0.01 + 1);
            }
            // translate image back to top left corner when drawing
            ctx.drawImage(img, -cx, -cy);
            ctx.resetTransform();
            // console.debug(imgSrc, gauge.size, tx.rotate, tx.translate, tx.scale);
        }
        else {
            ctx.drawImage(img, 0, 0);
        }
    }

    return await canvas.png;
}

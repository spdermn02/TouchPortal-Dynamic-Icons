import { Canvas } from 'skia-canvas'
import { TransformedOverlayImagesIcon, Transformation } from './interfaces'
import { globalImageCache, ImageDataType } from './ImageCache'
import { PI2 } from '../utils/consts'

export async function buildTransformedOverlayImagesIcon(gauge: TransformedOverlayImagesIcon) : Promise<Buffer>
{
    const canvas = new Canvas(gauge.size.width, gauge.size.height);
    const ctx = canvas.getContext("2d");
    // console.log("GPU support enabled: ", canvas.gpu);  // https://github.com/samizdatco/skia-canvas/issues/111

    // ctx.clearRect(0, 0, gauge.size.width, gauge.size.height)  // doesn't seem necessary
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // console.dir(gauge, {depth: 5, colors: true});

    for (const imgData of gauge.images) {
        if (!imgData || !imgData.source)
            continue;
        const img: ImageDataType = await globalImageCache.getOrLoadImage(imgData.source, gauge.size, imgData.resizeOptions);
        if (!img)
            continue;
        // check if any transformation steps are needed, otherwise just draw the image directly
        if (imgData.transform && !imgData.transform.isEmpty) {
            const tx: Transformation = imgData.transform;
            const cx = gauge.size.width * 0.5;
            const cy = gauge.size.height * 0.5;
            ctx.translate(cx, cy);
            for (const op of tx.transformOrder) {
                if (op === 'R' && tx.rotate)
                    ctx.rotate(tx.rotate * 0.01 * PI2);
                else if (op === 'O' && !tx.translate.isEmpty)
                    ctx.translate(tx.translate.x * 0.01 * gauge.size.width, tx.translate.y * 0.01 * gauge.size.height);
                else if (op === 'SC' && !tx.scale.isEmpty)
                    ctx.scale(tx.scale.x * 0.01, tx.scale.y * 0.01);
                else if (op === 'SK' && !tx.skew.isEmpty)
                    ctx.transform(1, tx.skew.y * 0.01, tx.skew.x * 0.01, 1, 0, 0);
            }
            // translate image back to top left corner when drawing
            ctx.drawImage(img, -cx, -cy);
            ctx.resetTransform();
        }
        else {
            ctx.drawImage(img, 0, 0);
        }
    }

    return await canvas.png;
}

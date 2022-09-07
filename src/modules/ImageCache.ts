
import sharp from 'sharp';
import { loadImage } from 'skia-canvas';
import { SizeType } from './interfaces';
import { Mutex } from 'async-mutex';

/** Central storage for various image processing options; Set via ImageCache.cacheOptions
Some of these could in theory be controlled via plugin settings or action data. */
export class ImageCacheOptions {
    /** Maximum number of cache records, zero to disable cache;
    actual cache size may grow a bit above this level to optimize the buffer trimming operations.
    Reducing this value at runtime will only take effect next time an image is added to the cache. */
    maxCachedImages: number = 250;
    // See https://sharp.pixelplumbing.com/api-constructor#sharp
    sourceLoadOptions: Object = { density: 72 };  // [dpi] only relevant for loading vector graphics. 72 is default;
    // See also https://sharp.pixelplumbing.com/api-resize#resize
    resizeOptions: Object = {
        fit: 'inside',               // how the image should be resized to fit both provided dimensions, one of: cover, contain, fill, inside or outside. (optional, default 'cover')
        kernel: 'mitchell',          // the kernel to use for image reduction. one of: nearest, cubic, mitchell, lanczos2, lanczos3 (optional, default 'lanczos3')
        withoutEnlargement: false,   // do not enlarge if the width or height are already less than the specified dimensions. (optional, default false)
        withoutReduction: false,     // do not reduce if the width or height are already greater than the specified dimensions. (optional, default false)
        background: { r: 0, g: 0, b: 0, alpha: 0 }  // background colour when fit is contain, parsed by the color module. (optional, default {r:0,g:0,b:0,alpha:1})
        // position String: position, gravity or strategy to use when fit is cover or contain. (optional, default 'centre')
        // fastShrinkOnLoad: take greater advantage of the JPEG and WebP shrink-on-load feature, which can lead to a slight moiré pattern on some images. (optional, default true)
    };
    // See also https://sharp.pixelplumbing.com/api-output#png
    cachedPngOptions: Object = {
        compressionLevel: 0,   // zlib compression level, 0 (fastest, largest) to 9 (slowest, smallest) (optional, default 6)
        effort: 1,             // CPU effort, between 1 (fastest) and 10 (slowest), sets palette to true (optional, default 7)
        palette: true,         // quantise to a palette-based image with alpha transparency support (optional, default false)
        // progressive: use progressive (interlace) scan (optional, default false)
        // adaptiveFiltering: use adaptive row filtering (optional, default false)
        // quality: use the lowest number of colours needed to achieve given quality, sets palette to true (optional, default 100)
        // colours: maximum number of palette entries, sets palette to true (optional, default 256)
        // dither:level of Floyd-Steinberg error diffusion, sets palette to true (optional, default 1.0)
    };  // low compression, high speed, quantise with transparency
}

export type ImageDataType = HTMLImageElement | null;

type ImageRecord = { image: ImageDataType }  // may want to add properties later
class ImageStorage extends Map<string, ImageRecord> {}  // just an alias

/**
Provides a cache for image data originally read from files or other sources, which may possibly be scaled or otherwise transformed before storage.
The cache key is based on a combination of the requested source file plus the desired size (as passed to the various methods).
Currently the images are stored as HTMLImageElement instance references, since that is what we use to draw and composite the images onto the resulting skia-canvas.
This class is designed to be used as a singleton static instance. The instance can be obtained with the globalImageCache export or ImageCache.Instance.
 */
export class ImageCache
{

    public static cacheOptions: ImageCacheOptions = new ImageCacheOptions();

    // private:

    private static instance: ImageCache;
    private static cacheHighTide = 25;  // cache can exceed maximum size by this many records before trimming
    private trimTimerId: ReturnType<typeof setTimeout> | null = null;
    private cache: ImageStorage = new ImageStorage();
    private mutex: Mutex = new Mutex();

    private constructor() {}  // singleton pattern, use ImageCache.Instance or globalImageCache

    private makeKey(src: string, size: SizeType): string {
        return src + ',' + size.width + ',' + size.height;
    }

    private async trimCache()
    {
        await this.mutex.runExclusive(async() =>
        {
            let deltaSz = this.count() - ImageCache.cacheOptions.maxCachedImages;
            if (deltaSz <= 0)
                return;
            const it = this.cache.keys();
            let key = it.next();
            while (!key.done && deltaSz > 0) {
                this.cache.delete(key.value);
                --deltaSz;
                key = it.next();
            }
        });
        console.debug("Trimmed cache to", this.count(), "records");
    }

    // The private methods provide actual implementation but w/out mutex locking.
    private getImage_impl(src: string, size: SizeType): ImageDataType {
        const record: ImageRecord | undefined = this.cache.get(this.makeKey(src, size));
        return record ? record.image : null;
    }

    // The private methods provide actual implementation but w/out mutex locking.
    private saveImage_impl(src: string, size: SizeType, image: ImageDataType) {
        if (!image)
            return;
        try {
            this.cache.set(this.makeKey(src, size), { image: image });

            // Check for cache overflow; schedule trim if needed.
            if (!this.trimTimerId && this.count() >= ImageCache.cacheOptions.maxCachedImages + ImageCache.cacheHighTide)
                this.trimTimerId = setTimeout(() => { this.trimCache(); this.trimTimerId = null; }, 1000);
        }
        catch (e) {
            console.error(e);
        }
    }

    // public:

    /** Get the static global instance of the cache object. See also `globalImageCache` export. */
    public static get Instance() {
        return this.instance || (this.instance = new ImageCache());
    }

    /** Returns an image from cache if it exists, otherwise loads the image, potentially scales it
    to fit the given size, and saves it to cache. Cache key is based on image source and requested size.
    If cache is disabled (cacheOptions.maxCachedImages == 0) then cache check is bypassed and this is effectively the same as calling LoadImage() directly.
     */
    public async getOrLoadImage(src: string, size: SizeType): Promise<ImageDataType>
    {
        if (ImageCache.cacheOptions.maxCachedImages <= 0)
            return this.loadImage(src, size);  // short-circuit for disabled cache

        let img:ImageDataType = null;
        await this.mutex.runExclusive(async() => {
            img = this.getImage_impl(src, size);
            if (!img) {
                img = await this.loadImage(src, size);
                if (img)
                    this.saveImage_impl(src, size, img);
                console.debug("Image cache miss for", src, "Returned", img);
            }
        });
        return img;
    }

    /** Returns an image from cache if it exists, otherwise returns null.
    Cache key is based on image source and requested size.  */
    public async getImage(src: string, size: SizeType): Promise<ImageDataType> {
        let image: ImageDataType = null;
        try {
            await this.mutex.runExclusive(async() => {
                image = await this.getImage_impl(src, size);
            });
        }
        catch (e) { console.error(e); }
        return image;
    }

    /** Saves an image to cache, possibly replacing any existing entry with the same key.
    Cache key is based on image source and requested size. */
    public async saveImage(src: string, size: SizeType, image: ImageDataType) {
        try {
            await this.mutex.runExclusive(async() => {
                this.saveImage_impl(src, size, image);
            });
        }
        catch (e) { console.error(e); }
    }

    /** Loads an image from source file and potentially scales it to fit the given size (keeping aspect ratio).
    Set size to {0,0} to avoid scaling. Returns null if image loading fails. */
    public async loadImage(src: string, size: SizeType): Promise<ImageDataType> {
        let imgBuffer: Buffer | null = null;
        try {
            const image = sharp(src, ImageCache.cacheOptions.sourceLoadOptions);
            if (image) {
                if (size.width || size.height)
                    image.resize(size.width || null, size.height || null, ImageCache.cacheOptions.resizeOptions);
                imgBuffer = await image.png(ImageCache.cacheOptions.cachedPngOptions).toBuffer();
            }
        }
        catch (e) {
            console.error(e);
        }
        return imgBuffer ? loadImage(imgBuffer) : null;
    }

    /** Returns number of records currently in cache. */
    public count(): number {
        return this.cache.size;
    }

    /** Removes all entries from the cache. */
    public async clear() {
        await this.mutex.runExclusive(async() => {
            this.cache.clear();
            console.info("Image cache cleared.")
        });
    }

}

export const globalImageCache = ImageCache.Instance;

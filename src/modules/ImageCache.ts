
import sharp from 'sharp';
import { Image, loadImage, loadImageData, type CanvasDrawable } from 'skia-canvas';
import { Mutex } from './Mutex';
import { elideLeft, qualifyFilepath } from '../utils';
import { Logger, logging } from './logging';
import type { SizeType } from './geometry';

/** Central storage for various image processing options; Set via ImageCache.cacheOptions
Some of these could in theory be controlled via plugin settings or action data. */
class ImageCacheOptions {
    /** Maximum number of cache records, zero to disable cache;
    actual cache size may grow a bit above this level to optimize the buffer trimming operations.
    Reducing this value at runtime will only take effect next time an image is added to the cache. */
    maxCachedImages: number = 250;
    // See https://sharp.pixelplumbing.com/api-constructor#sharp
    sourceLoadOptions: any = { density: 72 };  // [dpi] only relevant for loading vector graphics. 72 is default;
    // See also https://sharp.pixelplumbing.com/api-resize#resize
    resizeOptions: any = {
        fit: 'contain',              // how the image should be resized to fit both provided dimensions, one of: cover, contain, fill, inside or outside. (optional, default 'cover')
        kernel: 'mitchell',          // the kernel to use for image reduction. one of: nearest, cubic, mitchell, lanczos2, lanczos3 (optional, default 'lanczos3')
        withoutEnlargement: false,   // do not enlarge if the width or height are already less than the specified dimensions. (optional, default false)
        withoutReduction: false,     // do not reduce if the width or height are already greater than the specified dimensions. (optional, default false)
        background: { r: 0, g: 0, b: 0, alpha: 0 }  // background colour when fit is contain, parsed by the color module. (optional, default {r:0,g:0,b:0,alpha:1})
        // position String: position, gravity or strategy to use when fit is cover or contain. (optional, default 'centre')
        // fastShrinkOnLoad: take greater advantage of the JPEG and WebP shrink-on-load feature, which can lead to a slight moiré pattern on some images. (optional, default true)
    };
}

export type ImageDataType = CanvasDrawable | null;

type ImageRecord = {
    image: ImageDataType
    iconNames: Set<string>   // icon(s) using this cached image
}
class ImageStorage extends Map<string, ImageRecord> {}  // just an alias

/**
Provides a cache for image data originally read from files or other sources, which may possibly be scaled or otherwise transformed before storage.
The cache key is based on a combination of the requested source file plus the desired size and resize options (as passed to the various methods).
Currently the images are stored as HTMLImageElement instance references, since that is what we use to draw and composite the images onto the resulting skia-canvas.
This class is designed to be used as a singleton static instance. The instance can be obtained with the globalImageCache export or ImageCache.Instance.
 */
export class ImageCache
{

    public static cacheOptions: ImageCacheOptions = new ImageCacheOptions();

    // private:
    private static instance: ImageCache;
    private static cacheHighTide = 25;  // cache can exceed maximum size by this many records before trimming
    private trimTimerId: NodeJS.Timeout | null = null;
    private cache: ImageStorage = new ImageStorage();
    private mutex: Mutex = new Mutex();
    private log: Logger;

    // singleton pattern, use ImageCache.Instance or globalImageCache
    private constructor() {
        this.log = logging().getLogger('imgcache');
    }

    private makeKey(src: string, size: SizeType, resizeOptions:any = {}): string {
        // this could be more flexible by serializing resizeOptions object but that would be slower... this method will be hit often.
        return src + ',' + size.width + ',' + size.height + ',' + (resizeOptions.fit || ImageCache.cacheOptions.resizeOptions.fit);
    }

    private resolveSource(src: string) {
        const isB64Data = src.startsWith("data:");
        if (isB64Data)
            src = src.substring(5);
        else
            src = qualifyFilepath(src);
        return { src, isB64Data, isSvg: !isB64Data && ImageCache.isSvg(src) };
    }

    private async trimCache()
    {
        await this.mutex.runExclusive(() =>
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
        this.log.info("Trimmed cache to", this.count(), "records");
    }

    // The private methods provide actual implementation but w/out mutex locking.
    private getImage_impl(key: string, iconName?: string): ImageDataType {
        const record: ImageRecord | undefined = this.cache.get(key);
        if (!record)
            return null;
        if (!!iconName)
            record.iconNames.add(iconName);
        return record.image;
    }

    // The private methods provide actual implementation but w/out mutex locking.
    private saveImage_impl(key: string, image: ImageDataType, meta?: any) {
        if (!image)
            return;
        try {
            const rec: ImageRecord | undefined = this.cache.get(key);
            if (!!rec) {
                rec.image = image;
                if (meta?.iconName)
                    rec.iconNames.add(meta.iconName);
            }
            else {
                this.cache.set(key, { image, iconNames: new Set([ meta?.iconName ]) });
            }

            // Check for cache overflow; schedule trim if needed.
            if (!this.trimTimerId && this.count() >= ImageCache.cacheOptions.maxCachedImages + ImageCache.cacheHighTide)
                this.trimTimerId = setTimeout(() => { this.trimCache(); this.trimTimerId = null; }, 1000);
        }
        catch (e) {
            this.log.error(e);
        }
    }

    // public:

    /** Get the static global instance of the cache object. See also `globalImageCache` export. */
    public static Instance() {
        return ImageCache.instance || (ImageCache.instance = new ImageCache());
    }

    public static isSvg(path: string) {
        return path.slice(-4)?.toLowerCase() == '.svg';
    }

    /** Returns an image from cache if it exists, otherwise loads the image, potentially scales it
    to fit the given size, and saves it to cache. Cache key is based on image source and requested size and options.
    If cache is disabled (cacheOptions.maxCachedImages == 0) then cache check is bypassed and this is effectively the same as calling LoadImage() directly.
    See LoadImage() for argument details.
     */
    public async getOrLoadImage(src: string, size: SizeType, resizeOptions:any = {}, meta?: any): Promise<ImageDataType>
    {
        if (ImageCache.cacheOptions.maxCachedImages <= 0)
            return this.loadImage(src, size, resizeOptions);  // short-circuit for disabled cache

        let img: ImageDataType = null;
        let key: string;

        await this.mutex.acquire();
        if (ImageCache.isSvg(src)) {
            // SVG images loaded as vectors are cached purely by file path as key.
            img = this.getImage_impl(src, meta?.iconName);
        }
        // Hasn't been cached yet, or not an SVG, or could be an SVG which was cached as raster.
        if (!img) {
            key = this.makeKey(src, size, resizeOptions);
            img = this.getImage_impl(key, meta?.iconName);
        }
        if (!img) {
            // no image found in cache, load it now
            img = await this.loadImage(src, size, resizeOptions);
            // `Image` return type means an SVG was loaded as scaleable vector, cache key is just the file path.
            if (img instanceof Image)
                key = src;
            this.saveImage_impl(key!, img, meta);
            this.log.debug(
                "[%s] Image cache miss for '%s' size: %d x %d; options: %o; Returned type %s; size: %d x %d",
                meta?.iconName, elideLeft(src, 60), size.width, size.height, resizeOptions, img?.constructor.name, img?.width, img?.height);
        }
        this.mutex.release();
        return img;
    }

    /** Returns an image from cache if it exists, otherwise returns null.
    Cache key is based on image source and requested size and options.  */
    public async getImage(src: string, size: SizeType, resizeOptions:any = {}): Promise<ImageDataType> {
        let image: ImageDataType = null;
        await this.mutex.acquire();
        if (ImageCache.isSvg(src))
            image = this.getImage_impl(src);
        if (!image)
            image = this.getImage_impl(this.makeKey(src, size, resizeOptions));
        this.mutex.release();
        return image;
    }

    /** Saves an image to cache, possibly replacing any existing entry with the same key.
    Cache key is based on image source and requested size and options. */
    public async saveImage(src: string, size: SizeType, image: ImageDataType, resizeOptions:any = {}, meta?: any) {
        const key = (image instanceof Image) ? src : this.makeKey(src, size, resizeOptions);
        await this.mutex.acquire();
        this.saveImage_impl(key, image, meta);
        this.mutex.release();
    }

    /** Loads an image from source file and potentially scales it to fit the given size with optional resize options.
    Set size to {0,0} or resizeOptions.fit to "none" to avoid scaling. Resize options object properties are merged with and override `ImageCache.cacheOptions.resizeOptions` defaults.
    SVG images successfully loaded with Skia are returned as un-scaled skia-canvas `Image` types, while rasterized formats are returned as `ImageData`.
    Returns `null` or a `Promise<null>` if image loading fails.
    */
    public async loadImage(src: string, size: SizeType, resizeOptions:any = {}): Promise<ImageDataType> {
        const srcInfo = this.resolveSource(src);
        if (srcInfo.isSvg) {
            // First try loading SVG with Skia because that way we can keep it as vectors.
            // But Skia SVG parser is more picky than Sharp's, so it may fail, in which case we fall back to try loading it with Sharp and convert to raster.
            try {
                return await loadImage(srcInfo.src);
            }
            catch (e: any) {
                if (e?.message?.startsWith("ENOENT")) {
                    this.log.error(`Image file not found: ${srcInfo.src}`);
                    return null;
                }
                this.log.warn(`There was an error loading SVG image "${srcInfo.src}" as vectors (check that the SVG is fully valid). Will try loading it as raster image instead. The error was: ${e}`)
            }
        }
        try {
            let image: sharp.Sharp;
            if (srcInfo.isB64Data)
                image = sharp(Buffer.from(srcInfo.src, 'base64'), ImageCache.cacheOptions.sourceLoadOptions);
            else
                image = sharp(srcInfo.src, ImageCache.cacheOptions.sourceLoadOptions);
            if (image) {
                resizeOptions = { ...ImageCache.cacheOptions.resizeOptions, ...resizeOptions };
                if ((size.width || size.height) && resizeOptions.fit !== "none") {
                    if (resizeOptions.fit === "scale-down") {
                        resizeOptions.fit = "contain";
                        resizeOptions.withoutEnlargement = true;
                    }
                    image.resize(size.width || null, size.height || null, resizeOptions);
                }
                const {data, info} = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
                // const meta = await image.metadata();
                if (data)
                    return await loadImageData(data, info.width, info.height);
            }
        }
        catch (e) {
            this.log.error(`Error trying to load image from source "${elideLeft(srcInfo.src, 100)}": ${e}`);
        }
        return null;
    }

    /** Returns number of records currently in cache. */
    public count(): number {
        return this.cache.size;
    }

    /** Removes all entries from the cache. */
    public async clear() {
        await this.mutex.acquire();
        this.cache.clear();
        this.mutex.release();
        this.log.info("Image cache cleared.")
    }

    /** Removes all entries for a specific icon name from the cache. This will also affect any other icons using the same cached image. */
    public async clearIconName(name: string) {
        await this.mutex.acquire();
        try {
            for (const k of this.cache.keys()) {
                if (this.cache.get(k)?.iconNames.has(name)) {
                    this.cache.delete(k);
                    const src = k.split(',')[0];
                    this.log.info("Removed cached image '%s' for icon '%s'.", elideLeft(src, 60), name);
                }
            }
        }
        catch (e) { this.log.error(e); }
        finally { this.mutex.release(); }
    }

}

const globalImageCache = ImageCache.Instance;
export default globalImageCache;

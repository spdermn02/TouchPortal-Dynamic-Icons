export interface Gauge {
    value: number,
    capStyle: CanvasLineCap,
    indicatorColor: string | CanvasGradient | CanvasPattern,
    highlightOn: boolean,
    shadowColor: string | CanvasGradient | CanvasPattern,
    shadowOn: boolean,
    startingDegree: number,
    counterClockwise: boolean,
    backgroundColor: string | CanvasGradient | CanvasPattern,
}

export interface GradientGauge extends Gauge{
    gradientInfo: object
}

export class Gauge implements Gauge {}

export interface BarGraph {
    values: number[],
    barColor: string,
    barWidth: number,
    backgroundColorOn: boolean,
    backgroundColor: string | CanvasGradient | CanvasPattern
}

export class BarGraph implements BarGraph {}

export type SizeType = {
    width: number
    height: number
}

export class Vect2d {
    x: number = 0
    y: number = 0
    constructor(x: number = 0, y: number = 0) { this.x = x; this.y = y; }
    set(x: number, y: number) { this.x = x; this.y = y; }
    get isEmpty():boolean { return !this.x && !this.y; }
}

export type TransformOp = 'O' | 'R' | 'SC' | 'SK';   // offset (translate) | rotate | scale | skew

export class Transformation {
    // all values are percentages coming from TP actions, not actual matrix values
    rotate: number = 0                // percent of 360 degrees
    scale: Vect2d = new Vect2d()      // percent of requested image size (not the original source image), negative for reduction; eg: 100 is double size, -50 is half size.
    translate: Vect2d = new Vect2d()  // percentage of relevant dimension of requested image size
                                      // eg: x = 100 translates one full image width to the right (completely out of frame for an unscaled source image)
    skew: Vect2d = new Vect2d()       // percent of requested image size (not the original source image)
    transformOrder: TransformOp[] = ['O', 'R', 'SC', 'SK']
    constructor(init?:Partial<Transformation>) { Object.assign(this, init); }
    get isEmpty():boolean { return !this.rotate && this.scale.isEmpty && this.translate.isEmpty && this.skew.isEmpty }
}

// This class hold an image source (path) and associated data like processing options or transformation to apply.
export class DynamicImage {
    source: string = ""
    resizeOptions: any = {
        fit: "contain"   // as per CSS object-fit property: contain, cover, fill, scale-down, none
    }
    transform: Transformation | null = null
    constructor(init?:Partial<DynamicImage>) { Object.assign(this, init); }
}

// Base class for a dynamically generated icon image, holds meta data like name and size, and possibly a background rectangle.
export class DynamicIcon {
    name: string = ""
    size: SizeType = { width: 256, height: 256 }
    constructor(init?:Partial<DynamicIcon>) { Object.assign(this, init); }
}

// An icon representing a "stack" of one ore more image sources which get composited together.
export class TransformedOverlayImagesIcon extends DynamicIcon {
    images: (DynamicImage | null)[] = new Array<DynamicImage | null>()
}

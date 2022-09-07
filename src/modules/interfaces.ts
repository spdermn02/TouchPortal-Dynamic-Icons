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

export interface OverlayImagesIcon {
    size: SizeType,
    imageSources: string[]
}

export class Vect2d {
    x: number = 0
    y: number = 0
    get isEmpty():boolean { return !(this.x + this.y); }
    constructor(init?:Partial<Vect2d>) { Object.assign(this, init); }
}

export type TransformOp = 'T' | 'R' | 'S';   // translate | rotate | scale

export class Transformation {
    // all values are percentages coming from TP actions, not actual matrix values
    rotate: number = 0                // percent of 360 degrees
    scale: Vect2d = new Vect2d()      // percent of requested image size (not the original source image), negative for reduction; eg: 100 is double size, -50 is half size.
    translate: Vect2d = new Vect2d()  // percentage of relevant dimension of requested image size
                                       // eg: x = 100 translates one full image width to the right (completely out of frame for an unscaled source image)
    transformOrder: TransformOp[] = ['T', 'R', 'S']
    get isEmpty():boolean { return !this.rotate && this.scale.isEmpty && this.translate.isEmpty }
    constructor(init?:Partial<Transformation>) { Object.assign(this, init); }
}

export class OverlayImagesIcon implements OverlayImagesIcon {
    size = { width: 256, height: 256 }
    imageSources = new Array<string>()
}

export class TransformedOverlayImagesIcon extends OverlayImagesIcon {
    transformations: Transformation[] = new Array<Transformation>()
}

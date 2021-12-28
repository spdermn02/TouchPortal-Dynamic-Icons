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



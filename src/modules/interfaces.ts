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
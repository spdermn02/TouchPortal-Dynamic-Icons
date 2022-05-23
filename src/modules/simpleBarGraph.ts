import {Canvas} from 'skia-canvas'
import {BarGraph} from './interfaces'

function getCanvas(width: number, height: number ) {
  return  new Canvas(width, height)
}
function getCanvasContext(canvas: Canvas) {
  return canvas.getContext("2d");
}

export async function buildBarGraph(width: number = 256, height: number = 256, barGraph: BarGraph ) {
    const canvas = getCanvas(width, height)
    const ctx = getCanvasContext(canvas)

    if( barGraph.backgroundColorOn ) {
        ctx.fillStyle = barGraph.backgroundColor
        ctx.fillRect(0, 0, width, height)
    }
    let barWidth = barGraph.barWidth
    let cur = barGraph.values.length
    let x1 = width - (cur * barWidth)
    barGraph.values.forEach((value) => {
        let percentage = value / 100;
        let length = Math.floor(height * percentage)
        let y1 = height - length

        ctx.beginPath()
        ctx.fillStyle = barGraph.barColor
        ctx.fillRect(x1,y1,barWidth,length)
        ctx.fill();
        x1+=barWidth
    })
    const buffer = await canvas.toBuffer('image/png')
    return buffer.toString("base64");
}
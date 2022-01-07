import {Canvas} from 'skia-canvas'
import {Gauge} from './interfaces'
import {PI, PI2, radius} from '../utils/consts'

function getCanvas(width: number, height: number ) {
  return  new Canvas(width, height)
}
function getCanvasContext(canvas: Canvas) {
  return canvas.getContext("2d");
}

export async function buildRoundGague(width: number = 256, height: number = 256, gauge: Gauge ) {
  const canvas = getCanvas(width, height)
  const ctx = getCanvasContext(canvas)
  const cx = width/2
  const cy = cx
  const min = PI
  const max = PI2 + PI
  const percent = gauge.value
  ctx.lineCap = gauge.capStyle

  ctx.clearRect(0,0,width,height)

  if( gauge.shadowOn ) {
    //Shadow
    ctx.beginPath()
    ctx.arc(cx,cy,radius+5,PI,PI+PI2, gauge.counterClockwise)
    ctx.fillStyle = gauge.shadowColor
    ctx.filter = 'blur(5px)'
    ctx.fill()
  }

  if( gauge.highlightOn ) {
    ctx.beginPath();
    ctx.arc(cx,cy,radius,min,(min+(max-min)*percent/100),gauge.counterClockwise)
    ctx.strokeStyle = gauge.indicatorColor
    ctx.lineWidth = 3
    ctx.filter = 'blur(5px)'
    ctx.stroke()
  }

  // Reset blur to 0
  ctx.filter = 'blur(0px)';

  ctx.beginPath();
  ctx.arc(cx,cy,radius,min,max,gauge.counterClockwise)
  ctx.fillStyle=gauge.backgroundColor
  ctx.strokeStyle=gauge.backgroundColor
  ctx.lineWidth=25
  ctx.fill()


  ctx.beginPath();
  ctx.arc(cx,cy,radius-10,min,min+(max-min)*percent/100)
  ctx.strokeStyle= gauge.indicatorColor
  ctx.lineWidth=15
  ctx.stroke();

  const buffer = await canvas.toBuffer('image/png')
  return buffer.toString("base64");

}

// export function buildRoundGradientGague(width: number = 256, height: number = 256, gauge: GradientGauge) {

// }
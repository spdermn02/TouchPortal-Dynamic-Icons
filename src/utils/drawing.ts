
import { M, normalizeAngle, round4p } from './';
import { DOMMatrix, Path2D, Rectangle } from '../modules';
import type { PointType, RenderContext2D, SizeType } from '../modules';

/**
Returns a Path2D object containing a full or partial circle of tick marks, like a compass or speedometer.
Each segment of the resulting path consists of a separate line for each "tick."
@param x Horizontal center coordinate
@param y Vertical center coordinate
@param rx Horizontal radius in pixels
@param ry Vertical radius in pixels
@param from Degrees to start from; 0° points north. Can be negative.
@param to Degrees to end at (eg. 0, 360 to draw a full circle, 0, 180 for half circle, etc). 0° points north. Can be negative.
@param count Number of tick marks to draw; First tick is drawn at start position (`from`) and the rest are spread out evenly between start and end angles.
@param len Length of tick marks. Negative value draws a line (tick mark) of that length from outer point towards center of circle. Positive values draw outward.
    Length can also be an array of lengths, in which case it will use the line lengths from array for each consecutive line, modulo the array's length.
    eg. drawing any even number of ticks with alternating sizes: `l = [10, 5]`
    A line length of zero in the array can be used to skip drawing a tick at that position.
@param ctr Set to `true` to center the tick marks along the circumference, dividing the given length(s) by 2 so that half the tick points to the outside and half to the inside.
*/
export function cirularGaugeTicksPath(x: number, y: number, rx: number, ry: number, from: number, to: number, count: number, len: number|Array<number>, ctr = false): Path2D
{
    // const lines: Array<PointType[]> = [];
    const p = new Path2D(),
        n = round4p((to - from) / (count - (!normalizeAngle(to - from) ? 0 : 1)));
    // console.log({x,y,rx,ry,from, to, count, n})
    from -= 90;
    // p.ellipse(x, y, rx, ry, 0, from * M.D2R, (to - 90) * M.D2R, false);  // debug baseline path
    if (!Array.isArray(len))
        len = [len];
    let i=0, a = from,
        px: number, py: number, lx: number, ly: number,
        ar: number, c: number, s: number, ll: number;
    for (; i < count; a += n, ++i) {
        ll = len[i % len.length]
        if (!ll)
            continue;
        ar = a * M.D2R;
        c = Math.cos(ar);
        s = Math.sin(ar);
        if (ctr) {
            ll = Math.abs(ll) * .5;
            px = round4p(x + (rx - ll) * c);
            py = round4p(y + (ry - ll) * s);
        }
        else if (ll > 0) {
            px = round4p(x + (rx + ll) * c);
            py = round4p(y + (ry + ll) * s);
            ll = 0;
        }
        else {
            px = round4p(x + rx * c);
            py = round4p(y + ry * s);
        }
        lx = round4p(x + (rx + ll) * c);
        ly = round4p(y + (ry + ll) * s);
        p.moveTo(px, py);
        p.lineTo(lx, ly);
        // lines.push([{x: px, y: py}, {x:lx, y:ly}]);
    }
    return p;
    // return lines;
}

/**
Returns a Path2D object containing a full or partial circle of labels, like the markings for a compass or speedometer.
@param ctx An instance of CanvasRenderContext2D to use for creation of paths for individual labels. It should already have all desired typography properties applied (font, etc).
@param x Horizontal center coordinate
@param y Vertical center coordinate
@param rx Horizontal radius in pixels
@param ry Vertical radius in pixels
@param from Degrees to start from; 0° points north. Can be negative.
@param to Degrees to end at (eg. 0, 360 to draw a full circle, 0, 180 for half circle, etc). 0° points north. Can be negative.
@param labels The array of label strings to use; First label is drawn at start position (`from`), and the rest are spread out evenly between start and end angles.
@param position Set to `-1` to position the labels towards the inside of the arc, or `1` towards the outside.
@param rotate Degrees of rotation to apply to labels. If `rotateToAngle` == 0 then the angle is an offset from horizontal, otherwise it is the offset from the rotated label angle.
@param rotateToAngle Set to `1` to rotate the labels so they face inward towards the center of the arc, `-1` to rotate so they face away from center, or `0` (default) to keep the labels horizontal.
*/
export function circularLabelsPath(ctx: RenderContext2D, x: number, y: number, rx: number, ry: number, from: number, to: number, labels: Array<string>, position: 1|-1, rotate = 0, rotateToAngle = 0)
{
    const p = new Path2D(),
        count = labels.length,
        n = round4p((to - from) / (count - (!normalizeAngle(to - from) ? 0 : 1)));
    // console.log({x,y,rx,ry,from,to,position,rotate,angled,n});
    from -= 90;
    rotate += 90 * rotateToAngle;
    let i = 0, a = from,
        c: number, s: number, ar: number, tX: number, tY: number, d: number,
        str: string, lbl: Path2D, bounds: Rectangle, pt: PointType;
    for (; i < count; a += n, ++i) {
        str = labels[i];
        if (!str)
            continue;
        lbl = ctx.outlineText(str);
        bounds = Rectangle.fromBounds(lbl.bounds);
        // translate label path so bounds rectangle center point is always at 0,0
        pt = bounds.center;
        lbl = lbl.offset(-pt.x, -pt.y);
        // bounds.translate(-pt.x, -pt.y);
        // figure out offset for final label position
        ar = a * M.D2R;
        c = Math.cos(ar);
        s = Math.sin(ar);
        if (rotate) {
            // if text is rotated then we need to offset by a common delta value based on the Y axis offset
            pt = vectorToEdge(bounds.size, rotate * M.D2R);
            d = Math.abs(pt.y) * position;
            tX = round4p(x + (rx + d) * c);
            tY = round4p(y + (ry + d) * s);
            // console.log(str, {a, d, tX, tY}, '\n', b.toString());
            p.addPath(lbl.transform(new DOMMatrix([1, 0, 0, 1, tX, tY]).rotateZSelf(rotate + (rotateToAngle ? a : 0))));
        }
        else {
            // For horizontal labels, figure out offset based on vector from center of label bounds to closest edge at current drawing angle;
            // The angle to use depends on label's `position` -- if drawing towards inside (position == -1) then we need the opposite of current angle.
            pt = vectorToEdge(bounds.size, (position < 0 ? ar : ar - M.PI), c * -position, s * -position);
            tX = round4p(x + rx * c - pt.x);
            tY = round4p(y + ry * s - pt.y);
            // console.log(str, v, {a, ba:(position < 0 ? ar : ar - M.PI) * M.R2D, c, s, tX, tY}, '\n', b.toString());
            p.addPath(lbl.offset(tX, tY));
        }
    }
    return p;
}

/**
Returns a Path2D object containing tick marks arranged along a straight line, like on a linear thermometer.
Each segment of the resulting path consists of a separate line for each "tick."
@param x Horizontal starting coordinate
@param y Vertical starting coordinate
@param size Total length of path for ticks. The ticks will be spaced to fit within this size.
@param vertical The line will be drawn vertically if `true`, horizontally otherwise.
@param count Number of tick marks to draw; These will be spaced out evenly between the relevant starting coordinate and the given `size`.
@param len Length of tick marks. Negative value draws a tick mark of that length from the line towards top/left. Positive values draw towards bottom/right.
    Length can also be an array of lengths, in which case it will use the line lengths from array for each consecutive line, modulo the array's length.
    eg. drawing any even number of ticks with alternating sizes: `l = [10, 5]`
    A line length of zero in the array can be used to skip drawing a tick at that position.
@param ctr Set to `true` to center the tick marks along the line, dividing the given length(s) by 2 so that half the tick points to the top/left and half to the bottom/right.
*/
export function linearGaugeTicksPath(x: number, y: number, size: number, vertical: boolean, count: number, len: number|Array<number>, ctr = false): Path2D
{
    const p = new Path2D(),
        n = round4p(size / (count - 1));
    if (!Array.isArray(len))
        len = [len];
    let pos = vertical ? y : x, i = 0, ll: number;
    for (; i < count; ++i, pos += n) {
        ll = len[i % len.length]
        if (!ll)
            continue;
        if (ctr) {
            ll = round4p(Math.abs(ll) * .5);
            vertical ? p.moveTo(x - ll, pos) : p.moveTo(pos, y - ll);
        }
        else {
            vertical ? p.moveTo(x, pos) : p.moveTo(pos, y);
        }
        vertical ? p.lineTo(x + ll, pos) : p.lineTo(pos, y + ll);
    }
    return p;
}

/**
Returns a Path2D object containing text labels arranged along a straight line, like the markings on a linear thermometer.
@param ctx An instance of CanvasRenderContext2D to use for creation of paths for individual labels. It should already have all desired typography properties applied (font, etc).
@param x Horizontal starting coordinate
@param y Vertical starting coordinate
@param size Total length of path for labels. The labels will be spaced to fit within this size.
@param vertical The line of labels will be drawn vertically if `true`, horizontally otherwise.
@param labels The array of label strings to use; These will be spaced out evenly between the relevant starting coordinate and the given `size`.
@param position Set to `-1` to position the labels towards the top/left of the line, or `1` towards the bottom/right.
@param rotate Degrees of rotation to apply to labels.
@param alignAuto `true` will automatically align the text based on line position and orientation. If `false`, assumes horizontal text alignment has already been set as desired.
*/
export function linearLabelsPath(ctx: RenderContext2D, x: number, y: number, size: number, vertical: boolean, labels: Array<string>, position: 1|-1, rotate = 0, alignAuto = true): Path2D
{
    const p = new Path2D(),
        count = labels.length,
        n = round4p(size / (count - 1)),
        angleToLbl = rotate ? ((vertical ? (position < 0 ? -M.PI : 0) : M.PI_2 * -position) + -rotate * M.D2R) : 0,
        atlCos = Math.cos(angleToLbl),
        atlSin = Math.sin(angleToLbl);
    // console.log({ x, y, size, vertical, position, rotate, alignAuto, ctxAlign: ctx.textAlign, angleToLbl: angleToLbl * M.R2D });
    let pos = vertical ? y : x, i = 0,
        tX: number, tY: number, d: number,
        lbl: Path2D, str: string, bounds: Rectangle, pt: PointType;
    for (; i < count; ++i, pos += n) {
        str = labels[i];
        if (!str)
            continue;

        lbl = ctx.outlineText(str);
        bounds = Rectangle.fromBounds(lbl.bounds);
        // translate label path so it is centered on Y axis, and on X axis if auto-aligning
        pt = bounds.center;
        if (!alignAuto)
            pt.x = 0;
        lbl = lbl.offset(-pt.x, -pt.y);
        // bounds.translate(-pt.x, -pt.y);
        // console.log(str, {pt, }, '\n  '+bounds.toString());

        if (rotate) {
            pt = vectorToEdge(bounds.size, angleToLbl, atlCos, atlSin);
            d = Math.abs(vertical ? pt.x : pt.y) * position;
            // console.log(str, {pt, d});
        }
        else if (alignAuto) {
            d = round4p((vertical ? bounds.width : bounds.height) * .5) * position;
        }
        else {
            d = 0;
        }

        if (vertical) {
            tX = x + d;
            tY = pos;
        }
        else {
            tX = pos;
            tY = y + d;
        }
        // console.log(pos, tX, tY, str, lbl.bounds);
        if (rotate)
            p.addPath(lbl.transform(new DOMMatrix([1, 0, 0, 1, tX, tY]).rotateZSelf(rotate)));
        else
            p.addPath(lbl.offset(tX, tY));
    }
    return p;
}

// Returns x,y coordinates from center of given size bounds to the closest edge at given angle;
// pass cosine and sine of angle if already known
function vectorToEdge(bounds: SizeType, radians: number, c?: number, s?: number) {
    if (c == undefined || s == undefined) {
        c = Math.cos(radians);
        s = Math.sin(radians);
    }

    let x: number, y: number;
    if (bounds.width * Math.abs(s) < bounds.height * Math.abs(c)) {
        x = Math.sign(c) * bounds.width * .5;
        y = Math.tan(radians) * x;
    }
    else {
        y = Math.sign(s) * bounds.height * .5;
        x = (1 / Math.tan(radians)) * y;
    }
    return { x:round4p(x), y:round4p(y) };
}


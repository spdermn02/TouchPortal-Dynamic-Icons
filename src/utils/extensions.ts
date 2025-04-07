
const { CanvasRenderingContext2D } = require('skia-canvas');  // for some reason get a "CanvasRenderingContext2D is not defined" error if using "import" instead
import { DOMMatrix } from 'skia-canvas';
import { M } from './consts';
import type { PointType, CanvasRenderingContext2D } from '../modules';

// Extends `DOMMatrix` and `CanvasRenderingContext2D` with `rotate*()` method
// overloads which accept an optional origin point around which to rotate.
// Also adds `CanvasRenderingContext2D.scale(x, y, origin)` overload.
// Adds more efficient `DOMMatrix.rotateZ[Self]()` methods which skip a couple useless multiplication steps of the original.

declare module 'skia-canvas' {

    export interface CanvasTransform {
        rotate(radians: number, origin?: PointType): void;
        rotate(radians: number, origin?: [number,number]): void;
        rotate(radians: number, originX?: number, originY?: number): void;

        scale(x: number, y: number, origin?: PointType): void;
        scale(x: number, y: number, origin?: [number,number]): void;
        scale(x: number, y: number, originX?: number, originY?: number): void;
    }

    export interface DOMMatrix {
        rotate(degX?: number, degY?: number, degZ?: number, origin?: PointType): DOMMatrix;
        rotate(degX?: number, degY?: number, degZ?: number, origin?: [number,number]): DOMMatrix;
        rotate(degX?: number, degY?: number, degZ?: number, originX?: number, originY?: number): DOMMatrix;
        rotateSelf(degX?: number, degY?: number, degZ?: number, origin?: PointType): DOMMatrix;
        rotateSelf(degX?: number, degY?: number, degZ?: number, origin?: [number,number]): DOMMatrix;
        rotateSelf(degX?: number, degY?: number, degZ?: number, originX?: number, originY?: number): DOMMatrix;

        rotateZ(degrees: number, origin?: PointType): DOMMatrix;
        rotateZ(degrees: number, origin?: [number,number]): DOMMatrix;
        rotateZ(degrees: number, originX?: number, originY?: number): DOMMatrix;
        rotateZSelf(degrees: number, origin?: PointType): DOMMatrix;
        rotateZSelf(degrees: number, origin?: [number,number]): DOMMatrix;
        rotateZSelf(degrees: number, originX?: number, originY?: number): DOMMatrix;
    }

}

type Origin = PointType | [number,number] | number;

const txOriginFromArgs = function(origin?: Origin, originY?: number): [number,number] {
    return Array.isArray(origin) ? origin : typeof origin == 'object' ? [origin.x, origin. y] : [origin ?? 0, originY ?? 0];
}

const NATIVE_METHODS = {
    contextRotate: CanvasRenderingContext2D.prototype.rotate,
    contextScale: CanvasRenderingContext2D.prototype.scale,
    matrixRotateSelf: DOMMatrix.prototype.rotateSelf,
} as const;

// export function extendCanvasContext() {
    CanvasRenderingContext2D.prototype.rotate = function(this: CanvasRenderingContext2D, radians: number, origin?: Origin, originY?: number) {
        if (!origin && !originY)
            return NATIVE_METHODS.contextRotate.call(this, radians);
        const [tx,ty] = txOriginFromArgs(origin, originY);
        this.translate(tx, ty);
        NATIVE_METHODS.contextRotate.call(this, radians);
        this.translate(-tx, -ty);
    }
    CanvasRenderingContext2D.prototype.scale = function(this: CanvasRenderingContext2D, x: number, y: number, origin?: Origin, originY?: number) {
        if (!origin && !originY)
            return NATIVE_METHODS.contextScale.call(this, x, y);
        const [tx, ty] = txOriginFromArgs(origin, originY);
        this.translate(tx, ty);
        NATIVE_METHODS.contextScale.call(this, x, y);
        this.translate(-tx, -ty);
    }
// }


// export function extendDOMMatrix() {
    DOMMatrix.prototype.rotateSelf = function(this: DOMMatrix, degX?: number, degY?: number, degZ?: number, origin?: Origin, originY?: number): DOMMatrix {
        if (arguments.length == 1)
            return this.rotateZSelf(degX!);
        if (arguments.length <= 3)
            return NATIVE_METHODS.matrixRotateSelf.call(this, degX, degY, degZ);
        if (!degX && !degY)
            return this.rotateZSelf(degZ!, <number>origin, originY);

        const [tx,ty] = txOriginFromArgs(origin, originY);
        this.translateSelf(tx, ty);
        NATIVE_METHODS.matrixRotateSelf.call(this, degX, degY, degZ);
        return this.translateSelf(-tx, -ty);
    }

    // A more efficient 2D rotation with only 1 multiplication step vs. 3 of the original.
    DOMMatrix.prototype.rotateZSelf = function(this: DOMMatrix, angle: number, origin?: Origin, originY?: number): DOMMatrix {
        angle *= M.D2R;
        const c = Math.cos(angle),
            s = Math.sin(angle),
            m = new DOMMatrix([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        if (!origin && !originY)
            return this.multiplySelf(m);

        const [tx,ty] = txOriginFromArgs(origin, originY);
        this.translateSelf(tx, ty);
        this.multiplySelf(m);
        return this.translateSelf(-tx, -ty);
    }

    DOMMatrix.prototype.rotate = function(this: DOMMatrix, degX?: number, degY?: number, degZ?: number, origin?: Origin, originY?: number): DOMMatrix {
        return this.clone().rotateSelf(degX, degY, degZ, <number>origin, originY);
    }
    DOMMatrix.prototype.rotateZ = function(this: DOMMatrix, degrees: number, origin?: Origin, originY?: number): DOMMatrix {
        return this.clone().rotateZSelf(degrees, <number>origin, originY);
    }
// }


import { LayerRole } from './enums';
import { Rectangle } from './geometry';
import { Path2D, RenderContext2D } from './types';

// DynamicIcon uses this type for its layers array members.
export interface ILayerElement {
    readonly type: string;
    readonly layerRole?: LayerRole;
 }

// Represents an abstract item which can be drawn onto, or otherwise affect (eg. style, transform), a canvas context.
export interface IRenderable extends ILayerElement {
    render(context: RenderContext2D, rect?:Rectangle): Promise<void> | void;
}

// An interface with a "setValue()" method. Elements which can reflect value(s) can implement this to update data w/out re-creating the element.
// Really this is just to make TypeScript compiler happy... to check if an element "implements the interface" we have to check for existence/type of "setValue" property anyway.
export interface IValuedElement extends ILayerElement {
    setValue(value: string): void;
}

export interface IPathProducer extends ILayerElement {
    getPath(rect?: Rectangle, pathStack?: Array<Path2D>) : Path2D;
}

export interface IPathHandler extends ILayerElement {
    renderPaths(paths: Array<Path2D>, context?: RenderContext2D, rect?: Rectangle) : void;
}

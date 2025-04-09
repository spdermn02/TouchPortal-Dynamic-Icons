
import type { ColorUpdateType, LayerRole, ParseState, Path2D, Rectangle, RenderContext2D } from './';

/** Represents an element of a dynamic image. `DynamicIcon` uses this type for its layers array members. */
export interface ILayerElement {
    /** @internal */
    readonly layerRole?: LayerRole;
    /** @internal */
    loadFromActionData(state: ParseState) : ILayerElement
 }

/** Represents an abstract item which can be drawn onto, or otherwise affect (eg. style, transform), a canvas context. */
export interface IRenderable extends ILayerElement {
    render(context: RenderContext2D, rect?:Rectangle): Promise<void> | void;
}

/** An element interface which produces a Path2D type object which can then be used for styling, clipping, etc. */
export interface IPathProducer extends ILayerElement {
    getPath(rect?: Rectangle, pathStack?: Array<Path2D>) : Path2D;
}

/** An element interface which "consumes" Path2D objects, for example to apply a drawing style or use as a clipping mask. */
export interface IPathHandler extends ILayerElement {
    renderPaths(paths: Array<Path2D>, context?: RenderContext2D, rect?: Rectangle) : void;
}

/** An interface with a "setValue()" method. Elements which can reflect value(s) can implement this to update data w/out re-parsing other action data.
    Really this is just to make TypeScript compiler happy... to check if an element "implements the interface" we have to check for existence/type of "setValue" property anyway. */
export interface IValuedElement extends ILayerElement {
    setValue(value: string): void;
}

/** An interface with a "setColor()" method. Elements which use colors can implement this to update color values w/out re-parsing other action data. */
export interface IColorElement extends ILayerElement {
    setColor(value: string, type: ColorUpdateType): void;
}

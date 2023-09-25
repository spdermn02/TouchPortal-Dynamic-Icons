
import { Rectangle } from './geometry';
import { Path2D, RenderContext2D } from './types';
export { RenderContext2D };  // to be removed once all element imports are updated

// Represents an abstract item which can be drawn onto, or otherwise affect (eg. style, transform), a canvas context.
export interface IRenderable {
    get type(): string;  // because apparently runtime introspection is unreliable... <sigh/>
    render(context: RenderContext2D, rect?:Rectangle): Promise<void> | void;
}

// This is just an alias for now, but likely we'll need some shared attributes in the future.
// DynamicIcon uses this type for its layers array members.
export interface ILayerElement extends IRenderable { }

// An interface with a "setValue()" method. Elements which can reflect value(s) can implement this to update data w/out re-creating the element.
// Really this is just to make TypeScript compiler happy... to check if an element "implements the interface" we have to check for existence/type of "setValue" property anyway.
export interface IValuedElement {
    setValue(value: string): void;
}

import { IRenderable, RenderContext2D } from '../interfaces';

// just a convenience string alias class for now, maybe extended later for gradients.
// TODO: Gradients!

export default class BrushStyle extends String implements IRenderable {
    get type(): string { return "BrushStyle"; }
    // returns true if color string is empty or represents a transparent color
    get isEmpty(): boolean {
        const len = this.length;
        return !len || (len == 9 && this.endsWith("00")) || (len == 4 && this.endsWith("0"));
    }
    render(ctx: RenderContext2D): void {
        if (!this.isEmpty)
            ctx.fillStyle = this;
    }
}

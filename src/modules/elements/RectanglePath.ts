
import { IPathProducer } from '../interfaces';
import { ParseState, Path2D, Rectangle, UnitValue } from '../';
import { arraysMatchExactly, parseNumericArrayString, round3p } from '../../utils';
import { Act, Str } from '../../utils/consts'
import Path from './Path';

/** Creates a rectangle path with optional radii applied to any/all of the 4 corners (like CSS). */
export default class RectanglePath extends Path implements IPathProducer
{
    /** `radii` value is like css border-radius, 1-4 numbers starting at top left corner, etc; empty array for no radius;
        individual values can be in either percent of overall size (like CSS border-radius %) or in absolute pixels.
        See `radii` param at https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect#syntax  */
    radii: number[] = [];
    radiusIsRelative: boolean = true;

    protected haveRadius: boolean = false;

    // constructor(init?: Partial<RectanglePath> | any) { super(init); assignExistingProperties(this, init, 0); }

    // ILayerElement
    readonly type: string = "RectanglePath";

    /** Returns true if the rectangle is empty (width or height are zero) */
    get isEmpty(): boolean {
        return !this.width.value || !this.height.value;
    }

    // returns true if radius array value has changed from saved version
    protected parseRadius(value: string) {
        const radii = [];
        this.haveRadius = parseNumericArrayString(value, radii, 4, 0);
        if (!arraysMatchExactly(this.radii, radii)) {
            this.radii = radii;
            return true;
        }
        return false;
    }

    loadFromActionData(state: ParseState, statePrefix: string = Act.IconRectPath): RectanglePath {
        const dr = state.asRecord(state.pos, statePrefix + Str.IdSep);
        let dirty = super.loadFromDataRecord(dr);
        if (dr.radius) {
            dirty = this.parseRadius(dr.radius) || dirty;
            delete dr.radius;
        }

        if (dr.radius_unit && UnitValue.isRelativeUnit(dr.radius_unit) != this.radiusIsRelative) {
            this.radiusIsRelative = !this.radiusIsRelative;
            delete dr.radius_unit;
            dirty = true;
        }
        if (dirty)
            this.cache.clear();
        // console.dir(this);
        return this;
    }

    // IPathProducer
    getPath(rect: Rectangle, pathStack?: Array<Path2D>): Path2D
    {
        if (rect.isEmpty)
            return new Path2D();

        if (this.cache.isDirtyForSize(rect.size)) {
            this.cache.path = new Path2D();
            this.cache.size = rect.size;
            const bounds: Rectangle = super.computeBounds(rect);
            if (this.haveRadius) {
                if (this.radiusIsRelative) {
                    const ratio = Math.max((bounds.width + bounds.height) * .005, 0);  // this is a bit simplistic really
                    const radii = this.radii.map(r => round3p(r * ratio));
                    this.cache.path.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, radii);
                }
                else {
                    this.cache.path.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, this.radii);
                }
            }
            else {
                this.cache.path.rect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }

        return super.getCombinedPath(this.cache.path!, pathStack);
    }
}

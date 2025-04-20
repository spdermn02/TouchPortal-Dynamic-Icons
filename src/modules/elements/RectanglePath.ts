
import { IPathProducer } from '../interfaces';
import { ParseState, Path2D, Point, Rectangle, UnitValue } from '../';
import { assignExistingProperties, parseNumericArrayString } from '../../utils';
import { Act, Str } from '../../utils/consts'
import Path from './Path';
import type { PointType, TpActionDataRecord } from '../';

/** Creates a rectangle path with optional radii applied to any/all of the 4 corners (like CSS). */
export default class RectanglePath extends Path implements IPathProducer
{
    /** `true` if radius values in `radii` array are given in percentages, or `false` if they represent absolute pixels. Default is `true`. */
    radiusIsRelative: boolean = true;

    /** This property indicates if any positive radius values have been set. Can be used to determine if a faster `rect()` can be drawn instead of `roundRect()`. */
    protected haveRadius: boolean = false;
    #radii: Array<PointType> = [];

    constructor(init?: Partial<RectanglePath>) {
        super();
        assignExistingProperties(this, init, 1);
    }

    /** Validates the value types in given array and that none of the values are `< 0`;
        Turns all single numeric values into `{x,y}` PointType objects. **Modifies the input array** if needed.
        Any array members which are neither numeric nor `{x,y}` objects are replaced with a zero value. */
    static cleanRadiusArray(radii: Array<PointType|number>): asserts radii is Array<PointType> {
        if (radii.length > 4)
            radii.length = 4;
        radii.forEach((v:any, i, a) => {
            if (typeof v == 'number') {
                a[i] = Point.new(Math.max(0, v));
            }
            else if (Number.isFinite(v.x) && Number.isFinite(v.y)) {
                if (v.y < 0) v.y = 0;
                if (v.x < 0) v.x = 0;
            }
            else {
                a[i] = Point.new();
            }
        });
    }

    /** Returns true if the rectangle is empty (width or height are zero) */
    get isEmpty(): boolean {
        return !this.width.value || !this.height.value;
    }

    /** `radii` value is like css border-radius, an array of 1-4 "point-like" objects (`{x,y}`) starting at top left corner, etc.
        Empty array for no radius. Values can be in either percent of overall size (like CSS border-radius %) or in absolute pixels,
        depending on the {@link radiusIsRelative} property. Radius values cannot be negative.

        See `radii` param at https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect#syntax
    */
    get radii(): Array<PointType> { return this.#radii; }
    /** The radii can be set using an array of 1-4 numbers or `PointType` `{x,y}` objects, or a single numeric value (for all 4 corners). */
    set radii(radii: Array<number|PointType> | number) {
        if (typeof radii == 'number')
            radii = [radii];
        RectanglePath.cleanRadiusArray(radii);
        if (!this.compareRadii(radii)) {
            this.#radii = radii;
            this.haveRadius = radii.some((v) => v.x > 0 || v.y > 0);
            this.clearCache();
        }
    }

    /** Returns `true` if `radii` argument array equals current `radii` property. */
    protected compareRadii(radii: Array<PointType>) {
        return (radii.length == this.#radii.length && !radii.some((v, i) => !Point.equals(v, this.#radii[i])))
    }

    /** Parses string value to radii array and returns `true` if radius array has changed from saved version. */
    protected parseRadius(value: string) {
        const radii = [];
        this.haveRadius = parseNumericArrayString(value, radii, 4, 0);
        RectanglePath.cleanRadiusArray(radii);
        if (!this.compareRadii(radii)) {
            this.#radii = radii;
            return true;
        }
        return false;
    }

    /** @internal  Returns true if any properties were changed. */
    loadFromDataRecord(dr: TpActionDataRecord): boolean | any
    {
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
            this.clearCache();
        // console.dir(this);
        return dirty;
    }

    /** @internal */
    loadFromActionData(state: ParseState, statePrefix: string = Act.IconRectPath): RectanglePath {
        this.loadFromDataRecord(state.asRecord(state.pos, statePrefix + Str.IdSep));
        return this;
    }

    /** Returns a copy of the current {@link radii} property with each member scaled by `ratio` amount. */
    scaledRadii(ratio: number): Array<number|PointType> {
        return this.#radii.map(r => Point.times(r, ratio));
    }

    // IPathProducer
    /** Returns the rectangle as a `Path2D` object, scaled to fit into `rect` bounds (if size units are relative), and combined
        with any paths in the `pathStack` according to value of the {@link operation} property. */
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
                    this.cache.path.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, this.scaledRadii(ratio));
                }
                else {
                    this.cache.path.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, this.#radii);
                }
            }
            else {
                this.cache.path.rect(bounds.x, bounds.y, bounds.width, bounds.height);
            }
        }

        return super.getCombinedPath(this.cache.path!, pathStack);
    }
}

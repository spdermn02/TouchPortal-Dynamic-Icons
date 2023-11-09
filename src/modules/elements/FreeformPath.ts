import { ILayerElement, IPathProducer, IValuedElement } from '../interfaces';
import { Alignment, logging, ParseState, Path2D, Point, PointType, Rectangle, Size, UnitValue } from '..';
import { assignExistingProperties, evaluateStringValue, evaluateValueAsArray, parseBoolFromValue, round4p } from '../../utils';
import { Str } from '../../utils/consts';
import Path from './Path';

/**
    An element for drawing paths/shapes, eg. for styled drawing or for clipping.
    A path can be specified with either an array of points or an SVG syntax path.
    When using arrays of points, multiple line segments can be specified by wrapping
    each segment in its own array.

    Path syntax:
        "x,y" || "[x,y]" - single point (<pt>), y is optional (defaults to x)
        "<pt>, <pt>, ..." - Multiple points on one path; at least 2 points are required
        "[  <pt>, <pt>, ...], [ <pt>, <pt>, ...], ..." - Multiple paths
        "M..." or "m..." - An SVG path; The action data is evaluated as an interpolated string for embedded JS ('${...}')
        "() => {...}" - A function returning either a points array or SVG path string.
 */
export default class FreeformPath extends Path implements ILayerElement, IPathProducer, IValuedElement
{
    relativeUnits: boolean = false;  // when true, path is scaled to drawing rectangle
    closePath: boolean = false;      // if a `closePath()` should be used at the of each line segment (ignored for SVG paths, use 'Z'/'z')

    private lines: Array<PointType[]> = [];
    private svgPath: string | null = null;
    private lastInput: string = "";  // cache to avoid reparsing path if input unchanged

    constructor(init?: Partial<FreeformPath> | any) {
        super(Object.assign({}, { alignment: Alignment.TOP | Alignment.LEFT }, init));
        assignExistingProperties(this, init, 0);
    }

    // ILayerElement
    readonly type: string = "FreeformPath";

    /** Returns true if there are fewer than 2 points to draw and has no SVG path. */
    get isEmpty(): boolean {
        return !this.svgPath && (!this.lines?.length || this.lines[0].length < 2);
    }

    // IValuedElement
    // Parses and sets the path value from action data, with minimal validation.
    // First checks value against the cached last value. Returns false if the path hasn't changed or couldn't be loaded.
    setValue(value: string): boolean
    {
        if (value == this.lastInput)
            return false;
        this.lastInput = value;
        this.lines.length = 0;

        if (value.trimStart()[0].toUpperCase() == "M" ) {
            this.svgPath = evaluateStringValue(value);
            return true;
        }

        this.svgPath = null;
        let result: Array<any> = evaluateValueAsArray(value);
        if (typeof result[0] == 'function') {
            result = [result[0]()];
            if (Array.isArray(result[0]))
                result = result[0];
        }

        if (!result.length)
            return true;

        const first = result[0];
        if (typeof first == 'number' || Array.isArray(first)) {
            this.parsePoints(result);
            // logging().getLogger('plugin').debug("result: %O, lines %O", result, this.lines);
            return true;
        }
        if (typeof first == 'string' && first.trimStart()[0].toUpperCase() == "M") {
            this.svgPath = first;
            return true;
        }
        logging().getLogger('plugin').warn("Path value '%s' must be numeric, an array, or a string starting with 'M'.", first);
        return false;
    }

    loadFromActionData(state: ParseState, statePrefix: string = "path"): FreeformPath
    {
        const dr = state.asRecord(state.pos, statePrefix + Str.IdSep);
        let dirty = super.loadFromDataRecord(dr);

        if (dr.path)
            dirty = this.setValue(dr.path) || dirty;

        if (dr.unit && UnitValue.isRelativeUnit(dr.unit) != this.relativeUnits) {
            this.relativeUnits = !this.relativeUnits;
            dirty = true;
        }
        if (dr.close && parseBoolFromValue(dr.close) != this.closePath) {
            this.closePath = !this.closePath;
            dirty = !this.svgPath || dirty; // closePath is ignored for SVG paths anyway
        }

        if (dirty)
            this.cache.clear();
        return this;
    }

    private parsePoints(line: Array<number | number[]>, lineIdx = 0)
    {
        if (lineIdx >= this.lines.length)
            this.lines[lineIdx] = [];
        for (let i = 0; i < line.length; ++i) {
            let val = line[i];
            // logging().getLogger('plugin').debug(`Value ${val} @ ${i} line ${lineIdx} type ${typeof val}`);
            if (Array.isArray(val)) {
                this.parsePoints(val, lineIdx);
                if (val.length > 2 /* && i */ )
                    ++lineIdx;
            }
            else if (typeof val == 'number') {
                val = round4p(val);
                const y = typeof line[i + 1] == 'number' ? round4p(line[++i] as number) : val;
                this.lines[lineIdx].push(Point.new(val, y));
            }
            else {
                logging().getLogger('plugin').warn("Value %s at position %d of line %d must be numeric or an array but it is: %s", val, i+1, lineIdx+1, typeof val);
            }
        }
    }

    private drawPath()
    {
        if (this.svgPath) {
            this.cache.path = new Path2D(this.svgPath);
        }
        else {
            this.cache.path = new Path2D();
            for (const line of this.lines) {
                if (!Array.isArray(line) || line.length < 2)
                    continue;
                let pt = line[0];
                this.cache.path.moveTo(pt.x, pt.y);
                for (let i = 1; i < line.length; ++i) {
                    pt = line[i];
                    this.cache.path.lineTo(pt.x, pt.y);
                }
                if (this.closePath)
                    this.cache.path.closePath();
            }
        }
    }

    // IPathProducer
    getPath(rect: Rectangle, pathStack?: Array<Path2D>): Path2D
    {
        if (!this.cache.path)
            this.drawPath();

        if (this.cache.isDirtyForSize(rect.size)) {
            // Scale the complete path if using relative unit size. Recompute and cache the result when 'rect' dimentions change.
            if (this.relativeUnits) {
                const sclX = round4p(this.cache.size ? rect.width / this.cache.size.width : rect.width * 0.01),
                    sclY = round4p(this.cache.size ? rect.height / this.cache.size.height : rect.height * 0.01);
                this.cache.path = this.cache.path!.transform(sclX, 0, 0, sclY, 0, 0);
            }
            const b = this.cache.path!.bounds;
            const offset = super.computeOffset(Size.new(b.width, b.height), rect);
            if (!Point.isNull(offset))
                this.cache.path = this.cache.path!.offset(offset.x, offset.y);
            this.cache.size = rect.size;
            // logging().getLogger('plugin').debug('size:\n%O\ncacheSize:\n%O\npath:\n%O', rect.size, this.cache.size, this.cache.path!.edges);
        }

        return super.getCombinedPath(this.cache.path!, pathStack);
    }

}

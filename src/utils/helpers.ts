import { logIt } from '../common'
import { PointType } from '../modules/geometry';

const USE_DYNAMIC_VALUE_EVAL:number = 1;  // 0 = none; 1 = Function;

/** Evaluates a numeric expression within an arbitrary string. Returns zero if evaluation fails or value string was empty.
    Note that the number formats must be "language neutral," meaning always period for decimal separator and no thousands separators. */
export function evaluateValue(value: string): number {
    if (!value)
        return 0
    try {
        if (USE_DYNAMIC_VALUE_EVAL == 1)
            return (new Function( `"use strict"; return (${value})`))() || 0;
        else
            return parseFloat(value) || 0;
    }
    catch (e) {
        logIt("WARN", "Error evaluating the expression '" + value + "':", e)
        return 0
    }
}

/** Decodes/converts/evaluates a text string sent from TP action data.
    TP sends all '\' escape sequences with '\\' so they no longer work automatically (\n, \t, \uNNNN). The Function trick with backticks resolves all that.
    This also allows embedding interpolated values into a string!  Eg. user can send: "2 + 2 = ${2+2}" which will run the calculation in brackets.
    It even works with TP values embedded inside the {...} part, eg. "Half of a global TP Value = ${${value:dynamic_icon_value_2} / 2}"
*/
export function evaluateStringValue(value: string): string {
    if (!USE_DYNAMIC_VALUE_EVAL)
        return value
    try {
        return (new Function('return `' + value + '`')());
    }
    catch (e) {
        logIt("WARN", "Error evaluating the expression '" + value + "':", e)
        return value
    }
}

/** Parses a string of CSV numbers and inserts them into given `dest` array. Destination array is _not_ cleared first.
    Each individual value in the list is run through `evaluateValue()` function, allowing math, etc.
    Commas inside parenthesis are ignored as separators, allowing use of functions which take multiple arguments.
    e.g. "(45 * Math.PI / 2), 20, Math.pow(8, 10)" would result in an array of three values.
    If evaluation fails for a value then a zero is used instead (see also `evaluateValue()`).
    If `maxCount` is not zero then only up to this many values will be parsed.
    Values can be optionally filtered by min/max range. Invalid values are silently skipped.
    Returns `true` if any _non-zero_ members were added, `false` otherwise.
*/
export function parseNumericArrayString(
    value: string,
    dest: Array<number>,
    maxCount: number = 0,
    minValue: number = -Number.MAX_VALUE,
    maxValue: number = Number.MAX_VALUE
) : boolean
{
    let ret: boolean = false,
        i: number = 0,
        v: string;
    for (v of value.split(/,(?<!\([^)]*)/g)) {
        const val = evaluateValue(v);
        if (!Number.isNaN(val) && val >= minValue && val <= maxValue) {
            dest.push(val);
            if (!ret && val)
                ret = true;
        }
        if (maxCount && ++i == maxCount)
            break;
    }
    return ret;
}

/** Parses and evaluates up to two values out of a string. e.g. "(45 * Math.PI / 2), 20"
    Results are assigned to the returned Vect2d's `x` and `y` members respectively.
    If only one value is found in the string then it is assigned to the result's `y` member as well as to `x`.
    An empty value string produces a default zero-length vector.
    See also `parseNumericArrayFromValue()`
*/
export function parsePointFromValue(value: string): PointType {
    const ret: PointType = {x: 0, y: 0},
        valPr = [];
    if (parseNumericArrayString(value, valPr, 2)) {
        ret.x = valPr[0];
        ret.y = valPr.length > 1 ? valPr[1] : ret.x;
    }
    return ret;
}

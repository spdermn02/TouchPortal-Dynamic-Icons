import { logIt } from '../common'
import { Vect2d } from '../modules/types';

const USE_DYNAMIC_VALUE_EVAL:number = 1;  // 0 = none; 1 = Function;

// Evaluates a numeric expression within an arbitrary string. Returns zero if evaluation fails or value string was empty.
// Note that the number formats must be "language neutral," meaning always period for decimal separator and no thousands separators.
export function evaluateValue(value: string): number {
    value = value.trim()
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

// Decodes/converts/evaluates a text string sent from TP action data.
// TP sends all '\' escape sequences with '\\' so they no longer work automatically (\n, \t, \uNNNN). The Function trick with backticks resolves all that.
// This also allows embedding interpolated values into a string!  Eg. user can send: "2 + 2 = ${2+2}" which will run the calculation in brackets.
// It even works with TP values embedded inside the {...} part, eg. "Half of a global TP Value = ${${value:dynamic_icon_value_2} / 2}"
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

// Parses and evaluates up to two values out of a string. e.g. "(45 * Math.PI / 2), 20 + 400"
// The values may be separated by colon, semicolon, single quote, or back(tick|quote) [:;'`]; leading and trailing spaces around the separator are ignored.
// Results are assigned to the returned Vect2d's `x` and `y` members respectively.
// If only one value is found in the string then it is assigned to the result's `y` member as well as to `x`.
// If evaluation fails for either value then a zero is used instead (see also `evaluateValue()`); A empty value string produces a default zero-length vector.
export function parseVect2dFromValue(value: string): Vect2d {
    let vec: Vect2d = new Vect2d();
    value = value.trim()
    if (!value)
        return vec;
    const valPr: string[] = value.split(/\s*(?:;|:|'|`)\s*/, 2)
    vec.x = evaluateValue(valPr[0]);
    vec.y = valPr.length > 1 && valPr[1].trim() ? evaluateValue(valPr[1]) : vec.x;
    return vec;
}

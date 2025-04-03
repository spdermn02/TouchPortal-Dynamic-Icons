import { Str } from './consts'
import { Alignment, logging, PointType } from '../modules';
import { PluginSettings } from '../common';
import { isAbsolute as pathIsAbs, join as pathJoin } from 'path';

// Used to validate if a string is a single numeric value. Accepts leading sign, base prefix (0x/0b/0o), decimals, and exponential notation.
const NUMBER_VALIDATION_REGEX = new RegExp(/^[+-]?(?:0[xbo])?\d+(?:\.\d*)?(?:e[+-]?\d+)?$/);
// To test if a text string is "truthy."
const BOOL_TEST_REGEX = new RegExp(/\b(?:yes|on|true|enabled?|\d*[1-9]\d*)\b/i);
// Global match anything not a \d(igit): \D
const RE_NOT_DIGIT_G = new RegExp(/\D/g);

// ------------------------
// Math utils.

/** Constrain a numeric `value` between `min` and `max`, inclusive. */
export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

/** Rounds to 2 decimal places. */
export function round2p(value: number): number { return Math.round(value * 100) * .01; }
/** Rounds to 3 decimal places. */
export function round3p(value: number): number { return Math.round(value * 1_000) * .001; }
/** Rounds to 4 decimal places. */
export function round4p(value: number): number { return Math.round(value * 10_000) * .000_1; }
/** Rounds to 5 decimal places. */
export function round5p(value: number): number { return Math.round(value * 100_000) * .000_01; }
/** Rounds to 6 decimal places. */
export function round6p(value: number): number { return Math.round(value * 1_000_000) * .000_001; }

/** Compare 2 floating point values up to a maximum decimal precision represented by `epsilon` (a small decimal, eg. 0.0001 for 4 decimals). */
export function fuzzyEquals(value1: number, value2: number, epsilon: number): boolean {
    return Math.abs(value1 - value2) < epsilon;
}
/** Returns true if 2 numbers are equal within 3 decimal places of precision. */
export function fuzzyEquals3p(value1: number, value2: number): boolean { return fuzzyEquals(value1, value2, 0.001); }
/** Returns true if 2 numbers are equal within 4 decimal places of precision. */
export function fuzzyEquals4p(value1: number, value2: number): boolean { return fuzzyEquals(value1, value2, 0.000_1); }
/** Returns true if 2 numbers are equal within 5 decimal places of precision. */
export function fuzzyEquals5p(value1: number, value2: number): boolean { return fuzzyEquals(value1, value2, 0.000_01); }
/** Returns true if 2 numbers are equal within 6 decimal places of precision. */
export function fuzzyEquals6p(value1: number, value2: number): boolean { return fuzzyEquals(value1, value2, 0.000_001); }


// ------------------------
// String utils.

/** Left-trims `str` to `maxLen` characters and adds an ellipsis at the start if the input string was shortened. */
export function elideLeft(str: string, maxLen: number): string {
    if (str.length <= maxLen)
        return str;
    return "…" + str.slice(-maxLen);
}

/** Right-trims `str` to `maxLen` characters and adds an ellipsis to the end if the input string was shortened. */
export function elideRight(str: string, maxLen: number): string {
    if (str.length <= maxLen)
        return str;
    return str.slice(0, maxLen+1) + "…";
}

export function qualifyFilepath(path: string): string {
    if (PluginSettings.imageFilesBasePath && !pathIsAbs(path))
        return pathJoin(PluginSettings.imageFilesBasePath, path);
    return path;
}

// ------------------------
// Object helpers

/** Assigns property values in `from` object to values in the `to` object, but _only_ if they already exist in `to` _and_ have a matching `typeof` type.
    Recurses up to `recurseLevel` nested objects, and skips assigning object-type properties beyond the recursion level.
*/
export function assignExistingProperties(to: {}, from: {}, recurseLevel = 0) {
    if (!to || !from)
        return;
    for (const key in from) {
        if (key in to && typeof to[key] == typeof from[key]) {
            if (typeof to[key] == 'object') {
                if (recurseLevel > 0)
                    assignExistingProperties(to[key], from[key], --recurseLevel);
            }
            else {
                to[key] = from[key];
            }
        }
    }
}

/** Compares two arrays for strict match on length and each member's value at the same index. */
export function arraysMatchExactly(array1: any[], array2: any[]) {
    return array1.length == array2.length && array1.every((v, i) => v === array2[i]);
}

// ------------------------
// Action data parsing utilities.

/** Evaluates a numeric expression within an arbitrary string. Returns zero if evaluation fails or value string was empty.
    Note that the number formats must be "language neutral," meaning always period for decimal separator and no thousands separators. */
export function evaluateValue(value: string): number {
    if (!value)
        return 0
    try {
        // First try parsing the string as a single number. Even using a regex check this is still ~6x faster overall for single numeric values.
        // For expressions there's a little unnecessary overhead but it's fractions of a percent difference since the regex is fast.
        // Unfortunately we can't just call Number() or parseFloat() first, and check for NaN return,
        // because they'll return any number at the start of a string and ignore the rest (eg from "2 + 2" they return 2).
        // Use Number() c'tor vs. parseFloat() because it also handles base prefixes (0x/0b/0o).
        if (NUMBER_VALIDATION_REGEX.test(value))
            return Number(value) || 0;

        // If it's not just a plain number then evaluate it as an expression.
        return (new Function( `"use strict"; return (${value})`))() || 0;
    }
    catch (e) {
        logging().getLogger('plugin').warn("Error evaluating the numeric expression '" + value + "':", e)
        return 0
    }
}

/** Decodes/converts/evaluates a text string sent from TP action data.
    TP sends all '\' escape sequences with '\\' so they no longer work automatically (\n, \t, \uNNNN). The Function trick with backticks resolves all that.
    This also allows embedding interpolated values into a string!  Eg. user can send: "2 + 2 = ${2+2}" which will run the calculation in brackets.
    It even works with TP values embedded inside the {...} part, eg. "Half of a global TP Value = ${${value:dynamic_icon_value_2} / 2}"
*/
export function evaluateStringValue(value: string): string {
    try {
        return (new Function('return `' + value + '`')());
    }
    catch (e) {
        logging().getLogger('plugin').warn("Error evaluating the string expression '" + value + "':", e)
        return value
    }
}

/** Evaluates a string as an array (of any type). Returns an empty array if evaluation fails.
    The input string is wrapped in an array before evaluation, so it must be valid JS array content,
    otherwise evaluation fails. Any expressions within the array content are evaluated as well.
    For example: "1, 2, 3+2" returns `[1,2,5]`.
*/
export function evaluateValueAsArray(value: string): any[] {
    if (!value)
        return [];
    try {
        return (new Function( `"use strict"; return [${value}]`))();
    }
    catch (e) {
        logging().getLogger('plugin').warn("Error evaluating the array expression '" + value + "':", e)
        return [];
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

/** Parses a string value into an Alignment enum type result and returns it.
    Accepted string values (brackets indicate the minimum # of characters required):
        Horizontal: "[l]eft", "[c]enter", "[r]ight", "[j]ustify"
        Vertical:   "[t]op", "[m]iddle", "[b]ottom", "[ba]seline"
    Which direction(s) to evaluate can be specified in the `atype` parameter as one of the alignment type masks.
 */
export function parseAlignmentFromValue(value: string, atype: Alignment = Alignment.H_MASK | Alignment.V_MASK): Alignment {
    let ret: Alignment = Alignment.NONE;

    if (atype & Alignment.H_MASK) {
        // "left", "center", "right", "justify"
        switch (value[0]) {
            case 'c':
                ret |= Alignment.HCENTER;
                break;
            case 'l':
                ret |= Alignment.LEFT;
                break;
            case 'r':
                ret |= Alignment.RIGHT;
                break;
            case 'j':
                ret |= Alignment.JUSTIFY;
                break;
        }
    }
    if (atype & Alignment.V_MASK) {
        // "top", "middle", "bottom", "baseline"
        switch (value[0]) {
            case 'm':
                ret |= Alignment.VCENTER;
                break;
            case 't':
                ret |= Alignment.TOP;
                break;
            case 'b':
                ret |= (value[1] == 'a' ? Alignment.BASELINE : Alignment.BOTTOM);
                break;
        }
    }
    return ret;
}

/** Returns true/false based on if a string value looks "truthy", meaning it contains "yes", "on", "true", "enable[d]", or any digit > 0. */
export function parseBoolFromValue(value: string) {
    return BOOL_TEST_REGEX.test(value);
}

/** Returns an integer value contained in string `value`, or the provded `dflt` default if `value` is blank/NaN or is "default". */
export function parseIntOrDefault(value: string, dflt: number): number {
    if (!value || value[0] == Str.DefaultChar)
        return dflt;
    const iv = parseInt(value.replace(RE_NOT_DIGIT_G, ''));
    return iv == Number.NaN ? dflt : iv;
}

/** Returns `true` if the string `value` is "truthy," or the provded default if `value` is blank or is "default". @see parseBoolFromValue() */
export function parseBoolOrDefault(value: string, dflt: boolean): boolean {
    return !value || value[0] == Str.DefaultChar ? dflt : parseBoolFromValue(value);
}

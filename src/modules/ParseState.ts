import { Str } from "../utils/consts";
import type { TpActionDataArrayType, TpActionDataRecord } from "./types";

/** A struct to pass meta data as reference to chained action data parsing methods (eg. the various elements' loadFromActionData() methods).
@internal
*/
export default class ParseState {
    readonly data: TpActionDataArrayType; // [in] data array to parse
    pos: number;                          // [in/out] index into data array of current parsing position; incremented for every data field "consumed" by a parser

    /** Get the whole data array as a flat object with data IDs as keys. Key names are only the last part after '_' separator in ID. */
    get dr(): TpActionDataRecord {
        if (!this.record)
            this.record = this.asRecord();
        return this.record;
    }

    private record: TpActionDataRecord | null = null;

    constructor(data: TpActionDataArrayType, pos: number = 1) {
        this.data = data;
        this.pos = pos;
    }

    setPos(pos: number): ParseState { this.pos = pos; return this; }

    /** Transform data array to a flat object with data IDs as keys, starting at array index `start` (default 0).
     * Key names are only the last part after '_' separator in ID. */
    asRecord(start: number = 0, separator: string = Str.IdSep): TpActionDataRecord {
        let ret: TpActionDataRecord = {};
        for (const e = this.data.length; start < e; ++start) {
            const d = this.data[start];
            const newKey = d.id.split(separator);
            if (newKey.length > 1)
                ret[newKey.at(-1)!] = d.value;
        }
        return ret;
    }

    /** Removes everything up to `separator` from key names of `dr` object and returns a new object with new key names and values copied from `dr`.
        if `removeFromSource` is `true` then the original key is deleted from `dr`. Otherwise `dr` is not modified. */
    static splitRecordKeys(dr: TpActionDataRecord, separator: string, removeFromSource: boolean = false): TpActionDataRecord {
        let ret: TpActionDataRecord = {};
        for (const [key,val] of Object.entries(dr)) {
            const newKey = key.split(separator, 2);
            if (newKey.length > 1) {
                ret[newKey.at(-1)!] = val;
                if (removeFromSource)
                    delete dr[key];
            }
        }
        return ret;
    }
}

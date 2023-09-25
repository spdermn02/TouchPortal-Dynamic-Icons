import { Str } from "../utils/consts";
import { TpActionDataArrayType, TpActionDataRecord, TpActionDataType } from "./types";

/** A struct to pass meta data as reference to chained action data parsing methods (eg. the various elements' loadFromActionData() methods) */
export default class ParseState {
    data: TpActionDataArrayType; // [in] data array to parse
    pos: number;                 // [in/out] index into data array of current parsing position; incremented for every data field "consumed" by a parser

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
        return Object.assign({}, ...this.data.map(
            (d: TpActionDataType, i: number) => {
                return i >= start ? { [d.id.split(separator).at(-1) as string]: d.value } : {};
            }
        ));
    }
}

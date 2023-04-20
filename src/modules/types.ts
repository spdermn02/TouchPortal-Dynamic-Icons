export type TpActionDataArrayType = { id:string, value:string }[];

// struct to pass meta data as reference to chained action data parsing methods (eg. the various elements' loadFromActionData() methods)
export class ParseState
{
    data: TpActionDataArrayType = [];  // [in] data array to parse
    pos: number = 1;    // [in/out] index into data array of current parsing position; incremented for every data field "consumed" by a parser
    // consumed: number = 0;                      // [out] number of consecutive fields parsed from the data array

    constructor(init?: Partial<ParseState>) { Object.assign(this, init); }
    setPos(pos: number): ParseState { this.pos = pos; return this; }
}

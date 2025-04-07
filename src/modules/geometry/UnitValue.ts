/** A numeric value with an associated unit type. Sort-of like CSSUnitValue.
    For now unit types are only "%" or "px", and this object just stores
    a flag indicating if the value is relative (%) or absolute (px).
*/
export default class UnitValue extends Object {
    value: number = 0;
    isRelative: boolean = false;
    protected _unit!: string;

    constructor(value?: number);
    constructor(value: string);
    constructor(value: number, unit: string);
    constructor(value: number, isRelative: boolean);
    constructor(value: number | string = 0, unit: any = false) {
        super();
        if (typeof value == 'number') {
            this.value = value;
            if (unit.length)
                this.setUnit(unit);
            else
                this.setRelative(unit);
            return;
        }
        if (typeof value == 'string')
            this.setFromString(value);
    }

    static isRelativeUnit(unit: string) {
        return unit === "%";
    }

    static fromString(value: string): UnitValue {
        return new UnitValue().setFromString(value);
    }

    get unit() { return this._unit; }
    set unit(unit: string) { this.setUnit(unit); }

    setUnit(unit: string): boolean {
        this.isRelative = UnitValue.isRelativeUnit(unit);
        this._unit = unit;
        return this.isRelative;
    }

    setRelative(relative: boolean) {
        this.isRelative = relative;
        this._unit = relative ? "%" : "px";
    }

    setFromString(value: string) {
        let v:any = parseFloat(value);
        if (v != Number.NaN)
            this.value = v;
        v = value.replace(/\W/g, '');
        if (v)
            this.setUnit(v);
        return this;
    }

    override toString(): string {
        return this.value + this._unit;
    }

}

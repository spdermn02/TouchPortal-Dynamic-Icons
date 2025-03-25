/** A numeric value with an associated unit type. Sort-of like CSSUnitValue.
    For now unit types are only "%" or "px", and this object just stores
    a flag indicating if the value is relative (%) or absolute (px).
*/
export default class UnitValue extends Object {
    value: number;
    isRelative!: boolean;
    unit!: string;

    constructor(value?: number);
    constructor(value: number, unit: string);
    constructor(value: number, isRelative: boolean);
    constructor(value: number = 0, unit: any = false) {
        super();
        this.value = value;
        if (unit.length)
            this.setUnit(unit);
        else
            this.setRelative(unit);
    }

    static isRelativeUnit(unit: string) {
        return unit === "%";
    }

    setUnit(unit: string): boolean {
        this.isRelative = UnitValue.isRelativeUnit(unit);
        this.unit = unit;
        return this.isRelative;
    }

    setRelative(relative: boolean) {
        this.isRelative = relative;
        this.unit = relative ? "%" : "px";
    }

    override toString(): string {
        return this.value + this.unit;
    }

}

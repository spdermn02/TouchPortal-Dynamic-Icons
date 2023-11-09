
export const enum LayerRole {
    None         = 0,
    Drawable     = 0x01,
    Transform    = 0x02,
    PathProducer = 0x04,
    PathConsumer = 0x08,
}

export const enum Orientation { H, V };

export const enum Alignment {
    NONE     = 0,
    LEFT     = 0x01,
    RIGHT    = 0x02,
    HCENTER  = 0x04,
    JUSTIFY  = 0x08,
    TOP      = 0x10,
    BOTTOM   = 0x20,
    VCENTER  = 0x40,
    BASELINE = 0x80,
    CENTER   = VCENTER | HCENTER,
    H_MASK   = LEFT | RIGHT | HCENTER | JUSTIFY,
    V_MASK   = TOP | BOTTOM | VCENTER | BASELINE,
};

export const enum PathBoolOperation {
    None       = "none",
    Add        = "add",  // actually `addPath()`
    Complement = "complement",
    Difference = "difference",
    Intersect  = "intersect",
    Union      = "union",
    Xor        = "xor"
}

export const enum TransformOpType {
    Offset = 'O',
    Rotate = 'R',
    Scale = 'SC',
    Skew = 'SK',
}

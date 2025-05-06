
/** @internal */
export const enum LayerRole {
    None         = 0,
    Drawable     = 0x01,
    Transform    = 0x02,
    PathProducer = 0x04,
    PathConsumer = 0x08,
}

/** Describes the orientation of a linear element. */
export const enum Orientation { H, V };

/** Describes the drawing direction for a circular path (arc, ellipse, etc). `Auto` value meaning depends on implementation. */
export const enum ArcDrawDirection { CW, CCW, Auto }

/** Describes the location of an element in relation to another. */
export const enum Placement {
    NoPlace, Inside, Outside, Center,
    TopLeft = Inside,
    BottomRight = Outside,
}

/** Describes horizontal and vertical alignment values. */
export const enum Alignment {
    NONE     = 0,
    // horizontal
    LEFT     = 0x01,
    RIGHT    = 0x02,
    HCENTER  = 0x04,
    JUSTIFY  = 0x08,
    H_MASK   = 0x0F,  // mask
    // vertical
    TOP      = 0x10,
    BOTTOM   = 0x20,
    VCENTER  = 0x40,
    BASELINE = 0x80,
    V_MASK   = 0xF0,  // mask
    // aliases
    CENTER    = VCENTER | HCENTER,
    TopLeft   = TOP | LEFT,
    TopCenter = TOP | HCENTER,
    TopCtr    = TopCenter,
    TopRight  = TOP | RIGHT,
    MidLeft   = VCENTER | LEFT,
    MidCenter = VCENTER | HCENTER,
    MidCtr    = MidCenter,
    MidRight  = VCENTER | RIGHT,
    BotLeft   = BOTTOM | LEFT,
    BotCenter = BOTTOM | HCENTER,
    BotCtr    = BotCenter,
    BotRight  = BOTTOM | RIGHT,
};

/** Path combining operations for {@link Path} type and subclasses. */
export const enum PathBoolOperation {
    None       = "none",
    Add        = "add",  // actually `addPath()`
    Complement = "complement",
    Difference = "difference",
    Intersect  = "intersect",
    Union      = "union",
    Xor        = "xor"
}

/** Transformation operation type, used by {@link Transformation }. */
export const enum TransformOpType {
    Offset = 'O',
    Rotate = 'R',
    Scale = 'SC',
    Skew = 'SK',
}

/** Used by elements supporting the `setColor(value: string, type: ColorUpdateType)` method (`IColorElement` interface).
    @internal
*/
export const enum ColorUpdateType {
    None      = 0,
    Stroke    = 0x01,
    Fill      = 0x02,
    Shadow    = 0x04,
    Primary   = 0x10,
    Secondary = 0x20,
    // aliases
    Foreground = Stroke,
    Background = Fill,
}

import { PathBoolOperation, TransformOpType } from "../modules/enums";

// Note: Const enums get replaced with actual values in the final "compiled" JS code.
// They are _also_ exported for use in entry.tp generator (due to 'preserveConstEnums' setting in tsconfig).

// Misc. strings we don't want to repeat.
export const enum Str {
    PluginId = "Touch Portal Dynamic Icons",
    PluginName = PluginId,
    PluginShortName = "Dynamic Icons",
    IconCategoryName = PluginShortName,  // Name of TP Category for dynamically created icon States.
    IdPrefix = "dynamic_icons_",         // prefix used in TP IDs for actions/data/states/etc
    IdSep = "_",          // action/data ID separator character
    Default = "default",  // used in action fields TP UI to indicate a default value
    DefaultChar = 'd',    // must match first char of `Default`, used in code for quick value comparisons
};

// Constant TP state IDs
export const enum StateId {
    IconsList = Str.IdPrefix + "createdIconsList",
}

// Action "handlers" are first stage or routing an action type to a function which handles it.
// In action IDs this is the next part after the IdPrefix.
export const enum ActHandler {
    Icon = "icon",
    Control = "control",
}

// Action IDs which handler functions expect. Next part after handler in action IDs.
export const enum Act {
    ControlCommand = "command",
    IconDeclare = "declare",
    IconGenerate = "generate",
    IconSaveFile = "saveFile",
    IconProgGauge = "progGauge",
    IconProgBar = "progBar",
    IconBarGraph = "barGraph",
    IconRect = "rect",
    IconText = "text",
    IconImage = "image",
    IconFilter = "filter",
    IconCompMode = "compMode",
    IconTx = "tx",
    IconRectPath = "rectpath",
    IconEllipse = "ellipse",
    IconPath = "path",
    IconStyle = "style",
    IconClip = "clip",
    IconSetTx = "set_tx",
    IconSetValue = "set_value",
    IconSetColor = "set_color",
}

// Individual data IDs for various actions. These are the last, most relevant, part(s) if each ID.
export const enum ActData {
    CommandAction = "action",
    CommandIcon = "icon",
}

// Convenience strings with full data IDs for `choiceUpdate` messages.
export const enum ChoiceDataId {
    ControlIconsList = Str.IdPrefix + ActHandler.Control + Str.IdSep + Act.ControlCommand + Str.IdSep + ActData.CommandIcon,
}

// Strings for misc. data values where the UI and processing code must match.
export const enum DataValue {
    // Choices for ControlCommand action
    ClearImageCache = "Clear the Source Image Cache",
    DelIconState = "Delete Icon State",
    // Mapped to ClippingMask.ClipAction enum types
    ClipMaskNormal  = "Create Normal",
    ClipMaskInverse = "Create Inverse",
    ClipMaskRelease = "Release",
    // Mapped to ColorUpdateType enum types
    ColorTypeStroke = "Stroke/Foreground",
    ColorTypeFill   = "Fill/Background",
    ColorTypeShadow = "Shadow",
    // Mapped to Transformation.TransformScope enum types
    TxScopePreviousOne = "previous layer",
    TxScopeCumulative  = "all previous",
    TxScopeUntilReset  = "all following",
    TxScopeReset       = "reset following",
    // Mapped to ArcDrawDirection enum types
    ArcDrawCW          = "Clockwise",
    ArcDrawCCW         = "Counter CW",
    ArcDrawAuto        = "Automatic",
    // Yes/No options on various actions
    YesValue           = "Yes",
    NoValue            = "No",
}

// Full names of plugin settings used in TP UI and messages.
export const enum SettingName {
    IconSize = "Default Icon Size",
    ImageFilesPath = "Default Image Files Path",
    GPU = "Use GPU Rendering by Default",
    PngCompressLevel = "Default Output Image Compression Level (0-9)",
    PngQualityLevel = "Default Output Image Quality (1-100)",
    MaxImageProcThreads = "Maximum Image Compression Threads",
    MaxImageGenThreads = "Maximum Image Generator Threads",
};

// Math constants
export const enum M {
    PI = 3.141592653589793,
    PI2 = PI * 2,
    PI_2 = PI / 2,
    D2R = PI / 180,
    R2D = 180 / PI,
}

// The exports not used in the core source code are for the entry.tp generator script.
export const CTRL_CMD_ACTION_CHOICES = [ DataValue.ClearImageCache, DataValue.DelIconState ];
export const DEFAULT_TRANSFORM_OP_ORDER = [TransformOpType.Offset, TransformOpType.Rotate, TransformOpType.Scale, TransformOpType.Skew];
export const STYLE_FILL_RULE_CHOICES = ["nonzero", "evenodd"];
export const PATH_BOOL_OPERATION_CHOICES = [
    PathBoolOperation.None, PathBoolOperation.Add, PathBoolOperation.Complement,
    PathBoolOperation.Difference, PathBoolOperation.Intersect, PathBoolOperation.Union, PathBoolOperation.Xor
];
export const COLOR_UPDATE_TYPE_CHOICES = [DataValue.ColorTypeStroke, DataValue.ColorTypeFill, DataValue.ColorTypeShadow];
export const ARC_DIRECTION_CHOICES = [ DataValue.ArcDrawCW, DataValue.ArcDrawCCW, DataValue.ArcDrawAuto ]

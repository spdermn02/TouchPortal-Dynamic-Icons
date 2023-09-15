import { TransformOpType } from "../modules/enums";

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
    IconProgGauge = "progGauge",
    IconProgBar = "progBar",
    IconBarGraph = "barGraph",
    IconRect = "rect",
    IconText = "text",
    IconImage = "image",
    IconFilter = "filter",
    IconCompMode = "compMode",
    IconTx = "tx",
    IconSetTx = "set_tx",
    IconSetValue = "set_value",
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
    ClearImageCache = "Clear the Source Image Cache",
    DelIconState = "Delete Icon State",
}

// Full names of plugin settings used in TP UI and messages.
export const enum SettingName {
    IconSize = "Default Icon Size",
    ImageFilesPath = "Default Image Files Path",
    GPU = "Enable GPU Rendering by Default",  // unused for now
    PngCompressLevel = "Default Output Image Compression Level (0-9)",
};


export const PI=Math.PI
export const PI2=PI*2

export const CTRL_CMD_ACTION_CHOICES = [ DataValue.ClearImageCache, DataValue.DelIconState ];
export const DEFAULT_TRANSFORM_OP_ORDER = [TransformOpType.Offset, TransformOpType.Rotate, TransformOpType.Scale, TransformOpType.Skew];

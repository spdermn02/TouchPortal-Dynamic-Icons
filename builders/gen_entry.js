#!/usr/bin/env node

// Generates entry.tp JSON file.
// usage: node builders/gen_entry.js [-v <plugin.version.numbers>] [-b <build-number>] [-o <output/path or - for stdout>] [-d]
// or via npm: npm run gen-entry [-- <options to pass through to this script>]
// Default version and build numbers will be from the current package.json (as well as some other constants).
// -d (dev mode) switch will exclude the plugin_start commands in the TP file, for running the binary separately.


///  ***  NOTE  NOTE  NOTE   ***
//  The action and action data IDs generated here follow a fairly strict naming convention which is used by various bits in the plugin to do their thing.
//  A convention is followed to allow efficient validation and "trickle down" parsing of data by relevant components w/out (hopefully) a spaghetti mess of ifs/cases.
//  It is meant to be extensible -- the name parts (between "_") go from general to more specific, so new handlers could be inserted at any level.
//  On the plugin side the action handlers parse these parts and can hand the data down the component tree as needed.
//

const path = require("path");
const { writeFileSync, statSync } = require("fs");
const pkgConfig = require("../package.json");

if ((statSync("./dist/common.js", {throwIfNoEntry: false})?.mtimeMs || 0) < statSync("./src/common.ts").mtimeMs ||
    (statSync("./dist/utils/consts.js", {throwIfNoEntry: false})?.mtimeMs || 0) < statSync("./src/utils/consts.ts").mtimeMs)
{
    console.error(`'./dist/common.js' and/or './dist/utils/consts.js' files not found or are older than source version, please run 'npm run tsc' first or 'npm run gen-entry'`);
    process.exit(1);
}

const { PluginSettings } = require("../dist/common.js");
const C = require("../dist/utils/consts.js");

// Defaults
var VERSION = pkgConfig.version;
var BUILD_NUM = pkgConfig.config.build;
var OUTPUT_PATH = "base"
var DOCS_URL_BASE = pkgConfig.homepage + "/wiki/Documentation";
var DEV_MODE = false;

// Handle CLI arguments
for (let i=2; i < process.argv.length; ++i) {
    const arg = process.argv[i];
    if      (arg == "-v") VERSION = process.argv[++i];
    else if (arg == "-b") BUILD_NUM = process.argv[++i];
    else if (arg == "-o") OUTPUT_PATH = process.argv[++i];
    else if (arg == "-d") DEV_MODE = true;
}

// Create integer version number from dotted notation in form of ( (MAJ << 24) | (MIN << 16) | (PATCH << 8) | BUILD )
// When printed in base 16 this comes out as, eg. for 1.23.4+b5 as "01230405". Each version part is limited to the range of 0-99.
var iVersion = 0;
for (const part of [...VERSION.split('-', 1)[0].split('.', 3), BUILD_NUM])
    iVersion = iVersion << 8 | (parseInt(part) & 0xFF);

// Other constants
const ID_PREFIX = C.Str.IdPrefix;
const PLUG_PATH = `%TP_PLUGIN_FOLDER%${pkgConfig.name}`;
const ICON_PATH = `${PLUG_PATH}/icons/`;
const ACTION_NAME_PREFIX = "Dynamic Icons: ";  // prepended to action descriptions to identify the plugin they belong to

// some useful characters for forcing spacing in action texts
const NBSP = " ";   // non-breaking narrow space U+202F (TP ignores "no-break space" U+00AD)
const SP_EN = " ";  // en quad space U+2000  (.5em wide)
const SP_EM = " "; // em quad space U+2001  (1em wide)


// --------------------------------------
// Define the sub-categories to sort actions into (TP v4+)
const ACTION_CATS = {
    basic: { name: "Basic Elements",   id: ID_PREFIX + "cat_basic", imagepath: ICON_PATH + "cat_basic.png" },
    gauge: { name: "Gauges & Graphs",  id: ID_PREFIX + "cat_gauge", imagepath: ICON_PATH + "cat_gauge.png" },
    layer: { name: "Layer Actions",    id: ID_PREFIX + "cat_layer", imagepath: ICON_PATH + "cat_layer.png" },
    paths: { name: "Path Operations",  id: ID_PREFIX + "cat_paths", imagepath: ICON_PATH + "cat_paths.png" },
    anim8: { name: "Animate & Update", id: ID_PREFIX + "cat_anim8", imagepath: ICON_PATH + "cat_anim8.png" },
};

// --------------------------------------
// Define the base entry.tp object here

const entry_base =
{
    // "$schema": "https://pjiesco.com/touch-portal/entry.tp/schema",  // not supporting API v7 yet.
    sdk: 6,  // keep for BC with TPv3
    api: 7,
    version: parseInt(iVersion.toString(16)),
    name: C.Str.PluginName,
    id: C.Str.PluginId,
    [pkgConfig.name]: VERSION,
    plugin_start_cmd:         DEV_MODE ? undefined : `sh ${PLUG_PATH}/start.sh ${pkgConfig.name}`,
    plugin_start_cmd_windows: DEV_MODE ? undefined : `"${PLUG_PATH}\\${pkgConfig.name}.exe"`,
    configuration: {
        colorDark:  "#23272A",
        colorLight: "#7289DA",
        parentCategory: "misc",
    },
    settingsDescription: pkgConfig.description + "\n" +
        "For more details, documentation, and examples please visit the plugin's home page at: " + pkgConfig.homepage + "\n" +
        "Installed plugin version: " + VERSION,
    settings: [
        {
            name: C.SettingName.IconSize,
            type: "text",
            default: `${PluginSettings.defaultIconSize.width} x ${PluginSettings.defaultIconSize.height}`,
            readOnly: false,
            tooltip: {
                title: cleanSettingTitle(C.SettingName.IconSize),
                body: "Image size produced when using standalone 'Draw' actions for producing icons, without any layering.\n\n" +
                    "This can be set to a single value for both width and height (eg. 128) or separate values using <width> x <height> or <width>, <height> format (eg. 128 x 256 or 128, 256).",
                docUrl: `${DOCS_URL_BASE}#plugin-settings`
            }
        },
        {
            name: C.SettingName.ImageFilesPath,
            type: "text",
            default: "",
            readOnly: false,
            tooltip: {
                title: cleanSettingTitle(C.SettingName.ImageFilesPath),
                body: "Base directory to use when loading image files specified using a relative path. " +
                    "When left empty, the default is Touch Portal's configuration directory for the current user (this path is shown in TP's Settings -> Info window).",
                docUrl: `${DOCS_URL_BASE}#plugin-settings`
            }
        },
        /* Disable GPU option for now, revisit later if GPU usage becomes stable.
        {
            name: C.SettingName.GPU,
            type: "switch",
            default: PluginSettings.defaultGpuRendering ? "on" : "off",
            readOnly: false,
            tooltip: {
                title: cleanSettingTitle(C.SettingName.GPU),
                body: "Enables using hardware acceleration (GPU) for generating icon images (on supporrted hardware). " +
                    "When disabled, all image processing happens on the CPU. Using GPU may provide speed or efficiency benefits in some cases and may produce slightly different visual results.\n\n" +
                    "This setting can be also be overridden per icon when using layers.\n" +
                    "GPU rendering is only supported on some hardware/OS/drivers, and is disabled on others regardless of this setting. " +
                    "Note that at least some CPU will be used when generating icons in any case, most notably for image file loading and final output PNG compression. " +
                    "Changing this setting will not affect any created icon instances until they're cleared (with \"Delete Icon State\" action) or the plugin is restarted.",
                docUrl: `${DOCS_URL_BASE}#plugin-settings`
            }
        },
        */
        {
            name: C.SettingName.PngCompressLevel,
            type: "number",
            default: PluginSettings.defaultOutputCompressionLevel.toString(),
            minValue: 0,
            maxValue: 9,
            readOnly: false,
            tooltip: {
                title: cleanSettingTitle(C.SettingName.PngCompressLevel),
                body: "Sets or disables the default image compression level of generated icons. This can be set to a number between 1 (low compression) and 9 (high compression), or 0 (zero) to disable compression entirely.\n\n" +
                    "This option can be also be overridden per icon. Changing this setting does not affect any icons already generated since the plugin was started.\n\n" +
                    "Compression affects the final image data size which will be sent to the TP device for display. The higher the compression level, the smaller the final size. " +
                    "However, compression uses CPU resources, proportional to the compression level (higher level means more CPU use) and may produce lower quality images.\n\n" +
                    "Large image data sizes may impact the performance of the connected TP device to the point that it becomes unusable due to the lag. " +
                    "This setting can be adjusted to fine-tune the impact of dynamic icon generation on your computer vs. efficient delivery of images to the TP device.",
                docUrl: `${DOCS_URL_BASE}#plugin-settings`
            }
        },
        {
            name: C.SettingName.PngQualityLevel,
            type: "number",
            default: PluginSettings.defaultOutputQuality.toString(),
            minValue: 0,
            maxValue: 100,
            readOnly: false,
            tooltip: {
                title: cleanSettingTitle(C.SettingName.PngQualityLevel),
                body: "Sets the default image color quality of generated and compressed icons. The final image will have the lowest number of colors needed to achieve the specified quality.\n" +
                    "The number of colors affects the final image data size which will be sent to the TP device for display. Using fewer colors produces smaller images, but possibly at the expense of image quality.\n" +
                    "This option can be also be overridden per icon when using layers. It has no effect on icons generated with compression disabled entirely.",
                docUrl: `${DOCS_URL_BASE}#plugin-settings`
            }
        },
        {
            name: C.SettingName.MaxImageProcThreads,
            type: "text",
            default: C.Str.Default,
            readOnly: false,
            tooltip: {
                title: cleanSettingTitle(C.SettingName.MaxImageProcThreads),
                body: "Sets the maximum number of parallel CPU threads used for image compression. A value of \""+C.Str.Default+"\" (or zero) will use half the available CPU threads (modern CPUs can typically run 2 threads per physical CPU core).\n" +
                    "When specifying a setting, this should be a number between 1 and the maximum number of threads a CPU can process in parallel.",
                docUrl: `${DOCS_URL_BASE}#plugin-settings`
            }
        },
        {
            name: C.SettingName.MaxImageGenThreads,
            type: "text",
            default: C.Str.Default,
            readOnly: false,
            tooltip: {
                title: cleanSettingTitle(C.SettingName.MaxImageGenThreads),
                body: "Sets the maximum number of parallel threads used for image generation (rendering). A value of \""+C.Str.Default+"\" (or zero) will use half the available CPU threads (modern CPUs can typically run 2 threads per physical CPU core).\n" +
                    "When specifying a setting, this should be a number between 1 and the maximum number of threads a CPU can process in parallel.",
                docUrl: `${DOCS_URL_BASE}#plugin-settings`
            }
        },
    ],
    categories: [
        {
            id: "TP Dynamic Icons",
            name: C.Str.IconCategoryName,
            imagepath: ICON_PATH + "plugin_icon.png",
            subCategories: Object.values(ACTION_CATS),
            states: [
                {
                    id: C.StateId.IconsList,
                    type: "text",
                    desc: "Dynamic Icons: List of created icons",
                    default: ""
                }
            ],
            actions: [],
            connectors: [],
            events: []
        }
    ]
};

// --------------------------------------
// Helper functions

// Replaces {N} placeholders with N value from args array/tuple.
String.prototype.format = function (args) {
    if (!Array.isArray(args))
        args = new Array(args);
    return this.replace(/{([0-9]+)}/g, function (match, index) {
        return typeof args[index] == 'undefined' ? match : args[index];
    });
};

// Remove any trailing range info like " (0-9)" from settings name for use in tooltip window.
function cleanSettingTitle(title) {
    return title.replace(/ \(.+\)$/, "");
}

/** "join ID" - join parts of an action/data/etc ID string using the common separator character. */
function jid(...args) {
    return args.join(C.Str.IdSep);
}

// Action and action data creation helpers

function addAction(id, name, descript, format, data, subcat = null, hold = false) {
    const action = {
        id: ID_PREFIX + id,
        prefix: ACTION_NAME_PREFIX,
        name: name,
        subCategoryId: subcat?.id,
        type: "communicate",
        tryInline: true,
        description: descript,
        format: String(format).format(data.map(d => `{$${d.id}$}`)),
        hasHoldFunctionality: hold,
        data: data
    }
    entry_base.categories[0].actions.push(action);
}

function makeActionLinesObj(lines, hold = false) {
  const key = hold ? "onhold" : "action";
  return {
    [key]: [
      {
        language: "default",
        data: lines.map(l => ({ lineFormat: l })),
        // suggestions: { lineIndentation: 20, firstLineItemLabelWidth: 0 }
      },
    ]
  };
}

/** Adds an action using the TP v7 API `lines` property for the text formatting layout. These actions only work with TP v4+.
`descript`, if not empty, gets used as the first line, followed by a line for each member of `format`,
which can be an array (or null for no format, or a single format string which gets converted to a one-member array).
Data ID placeholders ("{N}") in `format` string(s) get replaced with corresponding member IDs of `data` array.
*/
function addActionV7(id, name, descript, format = null, data = null, subcat = null, hold = false)
{
    if (format != null && !Array.isArray(format))
        format = [format];
    const dataMapArry = data?.map(d => `{$${d.id}$}`) ?? [];
    const lines = format?.map(f => String(f).format(dataMapArry)) ?? [];
    if (descript)
        lines.unshift(ACTION_NAME_PREFIX + descript);
    const linesObj = makeActionLinesObj(lines);

    // NOTE: As of TP 4.4 the documented `lines.onhold` specific formatting doesn't actually work to enable use in "on hold" setup.
    // `hasHoldFunctionality` still has to be `true` and the contents of `lines.action` will be used even if `lines.onhold` exists.
    // Undocumented `formatOnHold` can be set for an action to use separate format spec in "on hold" setup area, but this is limited
    // to a single line. Currently none of our actions need different layout/data for holdable actions, so this is a moot point.
    // Anyway, we'll still add the `lines.onhold` property here so the output complies with API spec... in case it gets "fixed" later, I guess.
    if (hold)
        Object.assign(linesObj, makeActionLinesObj(lines, true));

    const action = {
        id: ID_PREFIX + id,
        name: name,
        subCategoryId: subcat?.id,
        type: "communicate",
        lines: linesObj,
        hasHoldFunctionality: hold,
        data: data ?? []
    }
    entry_base.categories[0].actions.push(action);
}

function makeActionData(id, type, label = "", deflt = "") {
    return {
        id: ID_PREFIX + id,
        type: type,
        label:  label,
        default: deflt
    };
}

function makeTextData(id, label = "", dflt = "") {
    return makeActionData(id, "text", label, dflt + '');
}

function makeColorData(id, label = "", dflt = "#00000000") {
    return makeActionData(id, "color", label + (label ? " " : "") + "Color", dflt + '');
}

function makeChoiceData(id, label, choices, dflt) {
    dflt = dflt || 0;
    const d = makeActionData(id, "choice", label, typeof dflt === "number" ? choices[dflt] : dflt);
    d.valueChoices = choices;
    return d;
}

function makeNumericData(id, label, dflt, min, max, allowDec = true) {
    const d = makeActionData(id, "number", label, dflt + '');
    d.allowDecimals = allowDec;
    d.minValue = min;
    d.maxValue = max;
    return d;
}

function makeFileData(id, extensions = [], dflt = "") {
    const d = makeActionData(id, "file", "", dflt);
    d.extensions = extensions;
    return d;
}

function makeOnOffSwitchData(id, dflt = true) {
    return makeChoiceData(id, "", [C.DataValue.OnValue, C.DataValue.OffValue], dflt ? 0 : 1);
}

function makeYesNoSwitchData(id, dflt = true) {
    return makeChoiceData(id, "", [C.DataValue.YesValue, C.DataValue.NoValue], dflt ? 0 : 1);
}

// Specific action data types

function makeSizeTypeData(id, dflt = undefined) {
    return makeChoiceData(jid(id, "unit"), "Unit", ["%", "px"], dflt);
}

function makeRenderChoiceData(id) {
    return makeYesNoSwitchData(jid(id, "render"), false);
}

// Shared functions which create both a format string and data array.
// They accept an array (reference) as argument to store the data parameters into, and return the related format string.

function makeIconLayerCommonData(id, withIndex = false) {
    let format = "Icon\nName {0}";
    const data = [ makeTextData(jid(id, "name"), "Icon Name") ];
    if (withIndex) {
        format += "Element\n@ Position{1}";
        data.push(makeTextData(jid(id, "layer_index"), "Layer Position", "1"));
    }
    return [ format, data ];
}

function makeTransformOpData(type, id , /* out */ data, splitXY = true) {
    const i = data.length;
    let f = splitXY ? `{0}\n (%) X{${i}}${NBSP}\nY{${i+1}}` : `{0}\n${SP_EN}X : Y {${i}}`;
    switch (type) {
        case "R":
            f = `Rotate\n${SP_EM}${SP_EN}(%){${i}}`;
            data.push(makeActionData(jid(id, "rot"), "text", "Rotation %", "0"));
            break;
        case "O":
            f = f.format("Offset");
            if (splitXY) {
                data.push(makeActionData(jid(id, "trsX"), "text", "Offset X", "0"));
                data.push(makeActionData(jid(id, "trsY"), "text", "Offset Y", "0"));
            }
            else {
                data.push(makeActionData(jid(id, "trs"), "text", "Offset X : Y", "0 : 0"));
            }
            break;
        case "SC":
            f = f.format("Scale");
            if (splitXY) {
                data.push(makeActionData(jid(id, "sclX"), "text", "Scale X", "100"));
                data.push(makeActionData(jid(id, "sclY"), "text", "Scale Y", "100"));
            }
            else {
                data.push(makeActionData(jid(id, "scl"), "text", "Scale X : Y", "100 : 100"));
            }
            break;
        case "SK":
            f = f.format("Skew");
            if (splitXY) {
                data.push(makeActionData(jid(id, "skwX"), "text", "Skew X", "0"));
                data.push(makeActionData(jid(id, "skwY"), "text", "Skew Y", "0"));
            }
            else {
                data.push(makeActionData(jid(id, "skw"), "text", "Skew X : Y", "0 : 0"));
            }
            break;
        default:
            return;
    }
    return f;
}

function makeTransformOrderData(opsList, id, /* out */ data) {
    if (!opsList.length)
        return;
    const f = opsList.length > 1 ? `Order {${data.length}}` : "";
    let d = makeActionData(jid(id, "order"), opsList.length > 1 ? "choice" : "text", `Transform Order`);
    if (opsList.length == 2)
        d.valueChoices = [
            `${opsList[0]}, ${opsList[1]}`,
            `${opsList[1]}, ${opsList[0]}`,
        ];
    else if (opsList.length == 3)
        d.valueChoices = [
            `${opsList[0]}, ${opsList[1]}, ${opsList[2]}`,
            `${opsList[0]}, ${opsList[2]}, ${opsList[1]}`,
            `${opsList[1]}, ${opsList[0]}, ${opsList[2]}`,
            `${opsList[1]}, ${opsList[2]}, ${opsList[0]}`,
            `${opsList[2]}, ${opsList[0]}, ${opsList[1]}`,
            `${opsList[2]}, ${opsList[1]}, ${opsList[0]}`,
        ];
    else  // 4
        d.valueChoices = [
            `${opsList[0]}, ${opsList[1]}, ${opsList[2]}, ${opsList[3]}`,  //
            `${opsList[0]}, ${opsList[1]}, ${opsList[3]}, ${opsList[2]}`,
            `${opsList[0]}, ${opsList[2]}, ${opsList[1]}, ${opsList[3]}`,
            `${opsList[0]}, ${opsList[2]}, ${opsList[3]}, ${opsList[1]}`,
            `${opsList[0]}, ${opsList[3]}, ${opsList[1]}, ${opsList[2]}`,
            `${opsList[0]}, ${opsList[3]}, ${opsList[2]}, ${opsList[1]}`,
            `${opsList[1]}, ${opsList[0]}, ${opsList[2]}, ${opsList[3]}`,  //
            `${opsList[1]}, ${opsList[0]}, ${opsList[3]}, ${opsList[2]}`,
            `${opsList[1]}, ${opsList[2]}, ${opsList[0]}, ${opsList[3]}`,
            `${opsList[1]}, ${opsList[2]}, ${opsList[3]}, ${opsList[0]}`,
            `${opsList[1]}, ${opsList[3]}, ${opsList[0]}, ${opsList[2]}`,
            `${opsList[1]}, ${opsList[3]}, ${opsList[2]}, ${opsList[0]}`,
            `${opsList[2]}, ${opsList[1]}, ${opsList[0]}, ${opsList[3]}`,  //
            `${opsList[2]}, ${opsList[1]}, ${opsList[3]}, ${opsList[0]}`,
            `${opsList[2]}, ${opsList[0]}, ${opsList[1]}, ${opsList[3]}`,
            `${opsList[2]}, ${opsList[0]}, ${opsList[3]}, ${opsList[1]}`,
            `${opsList[2]}, ${opsList[3]}, ${opsList[1]}, ${opsList[0]}`,
            `${opsList[2]}, ${opsList[3]}, ${opsList[0]}, ${opsList[1]}`,
            `${opsList[3]}, ${opsList[1]}, ${opsList[2]}, ${opsList[0]}`,  //
            `${opsList[3]}, ${opsList[1]}, ${opsList[0]}, ${opsList[2]}`,
            `${opsList[3]}, ${opsList[2]}, ${opsList[1]}, ${opsList[0]}`,
            `${opsList[3]}, ${opsList[2]}, ${opsList[0]}, ${opsList[1]}`,
            `${opsList[3]}, ${opsList[0]}, ${opsList[1]}, ${opsList[2]}`,
            `${opsList[3]}, ${opsList[0]}, ${opsList[2]}, ${opsList[1]}`,
        ];
    d.default = opsList.length > 1 ? d.valueChoices[0] : opsList[0];
    data.push(d);
    return f;
}

function makeTransformData(opsList, id, /* out */ data) {
    let f = "";
    for (const op of opsList)
        f += makeTransformOpData(op, id, data, true);
    f += makeTransformOrderData(opsList, id, data);
    return f;
}

function makeStrokeStyleData(id, /* out */ data, { withUnitType=true, width=0, color="#00000000", withCap, withJoin, withMiterLimit, withLineDash, all } = {}) {
    let i = data.length;
    let format = `Stroke\nWidth {${i++}}`;
    data.push(makeTextData(jid(id, "line_width"), "Stroke Width", width.toString()));

    if (all || withUnitType) {
        format += `{${i++}}`;
        data.push(makeSizeTypeData(jid(id, "line_width")));
    }

    format += ` Stroke\nColor {${i++}}`;
    data.push(makeColorData(jid(id, "line_color"), "Stroke", color));

    if (all || withCap) {
        format += ` Cap\nStyle {${i++}}`;
        data.push(makeChoiceData(jid(id, "line_cap"), "Line Cap Style", ["butt", "round", "square"]));
    }
    if (all || withJoin) {
        format += ` Join\nStyle {${i++}}`;
        data.push(makeChoiceData(jid(id, "line_join"), "Line Join Style", ["bevel", "miter", "round"], "miter"));
    }
    if (all || withMiterLimit) {
        format += ` Miter\nLimit {${i++}}`;
        data.push(makeNumericData(jid(id, "line_miterLimit"), "Join Miter Limit", 10, 0));
    }
    if (all || withLineDash) {
        format += ` Dash\nPattern {${i++}} Dash\nOffset {${i++}}`;
        data.push(
            makeTextData(jid(id, "line_dash"), "Line Dash Array"),
            makeTextData(jid(id, "line_dashOffset"), "Line Dash Offset", "0")
        );
    }
    return format;
}

function makeDrawStyleData(id, /* out */ data, { withShadow=true, fillColor="#00000000", withDrawOrder, withFillRule, all } = {}) {
    id = jid(id, "style");
    i = data.length;
    let format = `Fill\nColor {${i++}} `;
    data.push(makeColorData(jid(id, "fillColor"), "Fill", fillColor));
    if (all || withFillRule) {
        format += ` Fill\nRule {${i++}}`
        data.push(makeChoiceData(jid(id, "fillRule"), "Fill Rule", C.STYLE_FILL_RULE_CHOICES));
    }
    format += makeStrokeStyleData(id, data, arguments[2]);
    i = data.length;
    if (all || withDrawOrder) {
        format += ` Draw\nOrder {${i++}}`;
        data.push(makeChoiceData(jid(id, "strokeOver"), "Draw Order", ["Stroke over", "Stroke under"]));
    }
    if (all || withShadow) {
        format += ` Shadow Size\n${SP_EM}(blur, X, Y) {${i++}} Shadow\n${SP_EM}Color {${i++}}`;
        data.push(
            makeTextData(jid(id, "shadow"), "Shadow Coordinates", "0, 0, 0"),
            makeColorData(jid(id, "shadowColor"), "Shadow", "#000000FF"),
        );
    }
    return format;
}

function makeRectSizeData(id, /* out */ data, w = 100, h = 100, label = "Size", wLabel = "W", hLabel = "H") {
    let i = data.length;
    const format = `${label}\n${SP_EM}${wLabel} {${i++}}{${i++}}${NBSP}\n${hLabel} {${i++}}{${i++}}`;
    data.push(
        makeTextData(jid(id, "size_w"), "Width", w.toString()),
        makeSizeTypeData(jid(id, "size_w")),
        makeTextData(jid(id, "size_h"), "Height", h.toString()),
        makeSizeTypeData(jid(id, "size_h")),
    );
    return format;
}

function makeBorderRadiusData(id, /* out */ data, r = 0) {
    let i = data.length;
    const format = `Border\nRadius {${i++}}{${i++}}`;
    data.push(
        makeTextData(jid(id, "radius"), "Radius", r.toString()),
        makeSizeTypeData(jid(id, "radius")),
    );
    return format;
}

function makeAlignmentData(id, /* out */ data) {
    let i = data.length;
    const format = `Align\n${SP_EM}${SP_EN}H {${i++}} ${NBSP}\nV {${i++}}`;
    data.push(
        makeChoiceData(jid(id, "alignH"), "Horizontal Alignment", ["left", "center", "right"], "center"),
        makeChoiceData(jid(id, "alignV"), "Vertical Alignment", ["top", "middle", "bottom"], "middle"),
    );
    return format;
}

function makeOffsetData(id, /* out */ data) {
    let i = data.length;
    const format = `Offset\n(±%) H {${i++}}${NBSP}\n V{${i++}}`;
    data.push(
        makeTextData(jid(id, "ofsH"), "Horizontal Offset", "0"),
        makeTextData(jid(id, "ofsV"), "Vertical Offset", "0"),
    );
    return format;
}

function makePathOperation(id, /* out */ data) {
    let i = data.length;
    const format = `Operation with\nPrevious Path {${i++}}`;
    data.push(
        makeChoiceData(jid(id, "operation"), "Combine With Previous Path", C.PATH_BOOL_OPERATION_CHOICES)
    );
    return format;
}


// --------------------------------------
// Action creation functions

// Some shared description texts
function layerInfoText(what = "", layerOnly = true) {
    return (what ? `To add this ${what} as a layer, an ` : "") + "Icon with same Name must first have been created" + (layerOnly ? " with a 'New' action" : "") + ". "
}
function numericValueInfoText(what = "Values") {
    return what + " can include math operators and JavaScript functions.";
}
function txInfoText(wrapLine = 0) {
    return "" +
        "Transform values are percentages where 100% is one full rotation or icon dimension, positive for CW/right/down, negative for CCW/left/up." + (wrapLine == 1 ? "\n" : " ") +
        "Negative scaling flips images. " + numericValueInfoText() + (wrapLine == 2 ? "\n" : " ") +
        "To use same value for both X and Y axes, fill out X and leave Y blank/empty.";
}

// Standalone/layer elements

function addRectangleAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        `Generate or layer a styled square/rounded shape. ${layerInfoText('shape')}\n` +
        "Size/radius/stroke width can be specified in percent of icon size or fixed pixels. Up to 4 radii can be specified, separated by commas, for each corner starting at top left.";
    let [format, data] = makeIconLayerCommonData(id);
    format += makeRectSizeData("rect", data) + " ";
    format += makeBorderRadiusData("rect", data) + " ";
    format += makeDrawStyleData("rect", data);
    addAction(id, name, descript, format, data, subcat);
}

function addTextAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        `Generate or layer styled text. ${layerInfoText('text')}\n` +
        "Font is specified like the CSS 'font' shorthand property. Offset is percent of icon size, positive for right/down, negative for left/up. Stroke width in % is based on half the font size.";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `Text {${i++}} Font {${i++}} `;  // Baseline {${i++}}
    data.push(
        makeActionData("text_str", "text", "Text", ""),
        makeActionData("text_font", "text", "Font", "1.5em sans-serif"),
        // makeChoiceData("text_baseline", "Baseline", ["alphabetic", "top", "middle", "bottom", "hanging", "ideographic"]),
    );
    format += makeAlignmentData("text", data)
    format += makeOffsetData("text", data)
    format += ` Tracking {${data.length}}`;  // Baseline{${i++}}
    data.push(makeNumericData("text_tracking", "Tracking", 0, -999999, 999999, true))
    format += makeDrawStyleData("text", data);
    addAction(id, name, descript, format, data, subcat);
}

function addImageAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        `Generate or layer an image. ${layerInfoText('image')} ` +
        "File paths are relative to this plugin's \"Default Image Files Path\" setting, or use absolute paths. Base64-encoded image data can be loaded using a \"data:\" prefix.\n"
        + txInfoText();
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `Image\nFile {${i++}}Resize\nFit {${i++}}`;
    data.push(
        makeFileData(jid(id, "src"), ["*.avif", "*.gif", "*.jpg", "*.jpeg", "*.png", "*.svg", "*.tif", "*.tiff", "*.webp"]),
        makeChoiceData(jid(id, "fit"), "Resize Fit", ["contain", "cover", "fill", "scale-down", "none"]),
    );
    format += makeTransformData(C.DEFAULT_TRANSFORM_OP_ORDER.slice(0, 3), jid(id, C.Act.IconTx), data);  // don't include skew op
    addAction(id, name, descript, format, data, subcat);
}

function addProgressGaugeAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Generate or layer a round progress-bar style gauge reflecting a data value. " + layerInfoText('gauge') + "\n" +
        "Gauge values are in percent where 100% is one complete circle. 'Automatic' direction draws clockwise for positive number, CCW for negative. " +
        numericValueInfoText("All numeric fields") + " Note that zero starting degrees points East.";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format +=
        `draw using\nindicator color {${i++}} with\nhighlight {${i++}} starting\nat degree {${i++}} ` +
        `to value\n${SP_EM}${SP_EM}(%) {${i++}} with\nline width {${i++}}{${i++}} cap\nstyle {${i++}} diameter\n${SP_EM}${SP_EM}${SP_EN}(%) {${i++}} direction {${i++}}` +
        `background\n${SP_EM}${SP_EM}${SP_EM}color {${i++}} shadow\n${SP_EM}color {${i++}}`;
    data.push(
        makeActionData("gauge_color", "color", "Gauge Color", "#FFA500FF"),
        makeOnOffSwitchData("gauge_highlight"),
        makeTextData("gauge_start_degree", "Gauge Start Degree", "180"),
        makeActionData("gauge_value", "text", "Gauge Value", "0"),
        makeTextData("gauge_line_width", "Line Width", "12"),
        makeSizeTypeData("gauge_line_width"),
        makeChoiceData("gauge_line_cap", "Gauge Icon Cap Type", ["round", "butt", "square"]),
        makeTextData("gauge_radius", "Diameter", "78"),
        makeChoiceData("gauge_counterclockwise", "Gauge Direction", C.ARC_DIRECTION_CHOICES),
        makeActionData("gauge_background_color", "color", "Gauge Background Color", "#000000FF"),
        makeActionData("gauge_shadow_color", "color", "Gauge Shadow Color", "#282828FF"),
    );
    addAction(id, name, descript, format, data, subcat, true);
}

function addBarGraphAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Generate or layer a simple bar graph reflecting series data.\n" + layerInfoText('graph') + " " + numericValueInfoText();
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `with background {${i++}} of color {${i++}} using bar color {${i++}} add value {${i++}} with bar width {${i++}}`;
    data.push(
        makeOnOffSwitchData("bar_graph_backround"),
        makeActionData("bar_graph_backround_color", "color", "Bar Graph Background Color", "#FFFFFFFF"),
        makeActionData("bar_graph_color", "color", "Bar Graph Color", "#FFA500FF"),
        makeActionData("bar_graph_value", "text", "Bar Graph Value", "0"),
        makeNumericData("bar_graph_width", "Bar Graph Width", 10, 1, 256, false),
    );
    addAction(id, name, descript, format, data, subcat, true);
}

function addProgressBarAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Generate or layer a linear progress bar reflecting a data value between 0 and 100. " + layerInfoText('bar') + "\n" +
        "Side padding means top & bottom for horizontal bars and left & right for vertical. Padding/radius/stroke width can be specified in percent of icon size or fixed pixels. " +
        "Up to 4 radii can be specified, separated by commas, for each corner starting at top left. Values must be in the 0 - 100 range, decimals are OK.";
    let [format, data] = makeIconLayerCommonData(id);
    format += `Direction {${data.length}} `;
    data.push(
        makeChoiceData("pbar_dir", "Direction", ["➡\tL to R", "⬅\tR to L", "⟺\tL & R", "⬆\tB to T", "⬇\tT to B", "↕\tT & B"]),
    );
    format += makeRectSizeData("pbar", data, 25, 0, "Padding", "Sides", "Ends") + " ";
    format += makeBorderRadiusData("pbar", data);
    format += " Container:\n" + makeDrawStyleData("pbar_ctr", data).replace("Fill\n", "");
    format += " Value:\n" + makeDrawStyleData("pbar_val", data, { withShadow: false }).replace("Fill\n", "");
    format += ` Set\nValue {${data.length}}`;
    data.push(
        makeActionData("pbar_value", "text", "Progress Value", "0"),
    )
    addAction(id, name, descript, format, data, subcat, true);
}

function addGaugeTicksAction(id, name, subcat, linear = false) {
    let descript = "Draw " + (linear ? "Linear" : "Circular") + " Gauge Tick Marks. " + layerInfoText("element", false);
    if (linear)
        descript += " Length is the total area from first to last tick/label. ";
    else
        descript += " Start and End angles are in ± degrees with 0° pointing north. Width and Height determine the curve radius.";
    descript += "\nMinor Tick Count is how many to draw between each major tick (not total). Tick Placement determines direction the ticks are drawn in relative to baseline. " +
        "Label Values can be a numeric range and count, a comma-separated list, or empty.";

    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;

    // Dimensions/orientation, alignment and offset line
    if (linear) {
        format += ` Orientation {${i++}} Length {${i++}}{${i++}} `;
        data.push(
            makeChoiceData(jid(id, "orientation"), "Orientation", ["Horizontal", "Vertical"]),
            makeTextData(jid(id, "size_w"), "Length", "100"),
            makeSizeTypeData(jid(id, "size_w")),
        );
    }
    else {
        format += ` Start\nAngle {${i++}} End\nAngle {${i++}} `;
        data.push(
            makeTextData(jid(id, "start"), "Start Angle", "0"),
            makeTextData(jid(id, "end"), "End Angle", "360"),
        );
        format += makeRectSizeData(id, data) + " ";
    }
    format += makeAlignmentData(id, data) + " ";
    format += makeOffsetData(id, data) + " ";
    format = [format];

    const placeOpts = linear ? [C.DataValue.PlaceTopLeft, C.DataValue.PlaceBotRight] : [C.DataValue.PlaceInside, C.DataValue.PlaceOutside];
    i = data.length;

    // Major and minor tick mark lines
    const makeTickFields = (n, pfx, {cnt = 8, len = 8, w = 3, place = []} = {}) => {
        format.push(`${n} Ticks:${SP_EN} Count {${i++}} Length {${i++}}{${i++}} Placement {${i++}} Line\nWidth {${i++}}{${i++}} Color {${i++}} Cap {${i++}}`);
        data.push(
            makeTextData(jid(id, pfx, "count"), "Tick Count", `${cnt}`),
            makeTextData(jid(id, pfx, "len"), "Tick Length", `${len}`),
            makeSizeTypeData(jid(id, pfx, "len")),
            makeChoiceData(jid(id, pfx, "place"), "Placement", [...place, ...placeOpts, C.DataValue.PlaceCenter]),
        );
        makeStrokeStyleData(jid(id, pfx), data, { width: w, color: "#FFFFFF", withCap: true });
    }
    makeTickFields("Major", "maj");
    makeTickFields("Minor", "min", {cnt: 1, len: 4, w: 2, place: ["Same"]});

    // Labels line
    let labelFmt = `Labels:${SP_EN} First-Last/Count\n ${SP_EM}${SP_EM}${SP_EM}${SP_EN} or List of Values {${i++}} Placement {${i++}} `;
    const labelDeflt = linear ? "0 - 3 / 4 or 0,1,2,3" : "0 - 270 / 4 or N,E,S,W";
    data.push(
        makeTextData(jid(id, "label_value"), "Label Values", labelDeflt),
        makeChoiceData(jid(id, "label_place"), "Placement", placeOpts),
    );

    if (linear) {
        labelFmt += `Rotate\n${SP_EN}${SP_EN}(±°) {${i++}} Align {${i++}} `;
        data.push(
            makeTextData(jid(id, "label_rotate"), "Rotate", "0"),
            makeChoiceData(jid(id, "label_align"), "Alignment", ["auto", "left", "center", "right"]),
        );
    }
    else {
        labelFmt += `Rotation {${i++}} ±° {${i++}} `;
        data.push(
            makeChoiceData(jid(id, "label_angled"), "Angled", ["None", C.DataValue.PlaceInward, C.DataValue.PlaceOutward]),
            makeTextData(jid(id, "label_rotate"), "Rotate", "0"),
        );
    }
    labelFmt += `Offset\n${SP_EN} (±%) {${i++}} Font\n(CSS) {${i++}} Letter\nSpacing {${i++}} Color {${i++}}`;
    format.push(labelFmt);
    data.push(
        makeTextData(jid(id, "label_padding"), "Padding", "0"),
        makeTextData(jid(id, "label_font"), "Font", "10vmin monospace"),
        makeTextData(jid(id, "label_spacing"), "Spacing", "0px"),
        makeColorData(jid(id, "label_color"), "Color", "#FFFFFF"),
    );

    addActionV7(id, name, descript, format, data, subcat);
}

function addScriptAction(id, name, subcat) {
    const descript = "Run a Custom Script for drawing. Use JavaScript with standard Canvas API & additions. See plugin documentation for details.\n" +
        "When Cache is On, Script File is only loaded & parsed once, improving efficiency. Arguments will be available in the script as a global 'scriptArgs' string variable.";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `Load Script from File {${i++}} with Cache {${i++}} and run with Arguments {${i++}}`;
    data.push(
        makeFileData(jid(id, "src"), ["*.js,*.*"]),
        makeOnOffSwitchData(jid(id, "cache")),
        makeTextData(jid(id, "args")),
    );
    addAction(id, name, descript, format, data, subcat, true);
}

// Paths and path handlers

function addRectanglePathAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        `Create rectangle and rounded shapes which can then be styled or used as a clip area. An ${layerInfoText('')}\n` +
        "Size and radius can be specified in percent of icon size or fixed pixels. Up to 4 radii can be specified, separated by commas, for each corner starting at top left.";
    let [format, data] = makeIconLayerCommonData(id);
    format += makeRectSizeData(id, data) + " ";
    format += makeBorderRadiusData(id, data) + " ";
    format += makeAlignmentData(id, data) + " ";
    format += makeOffsetData(id, data) + " ";
    format += makePathOperation(id, data);
    addAction(id, name, descript, format, data, subcat);
}

function addEllipsePathAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        `Create an full or partial elliptical shape which can then be styled or used as a clip area. An ${layerInfoText('')}\n` +
        "With and Height control the radius of the arc and can be specified as percent of icon size or fixed pixels. Angles are in degrees, with 0° pointing north. " +
        "Use a 0 - 360 degree range for a complete circle. Rotation is applied to the final shape, from center. " +
        "Alignment & Offset adjust the shape's position within the overall drawing area.";
    let [format, data] = makeIconLayerCommonData(id);
    format += makeRectSizeData(id, data) + " ";
    let i = data.length;
    format += ` Start\nAngle {${i++}} End\nAngle {${i++}} Drawing\nDirection {${i++}} Rotation\n${SP_EM}${SP_EN}Angle {${i++}} `;
    data.push(
        makeTextData(jid(id, "start"), "Start Angle", "0"),
        makeTextData(jid(id, "end"), "End Angle", "360"),
        makeChoiceData(jid(id, "dir"), "Draw Direction", C.ARC_DIRECTION_CHOICES),
        makeTextData(jid(id, "rotate"), "rotation Angle", "0"),
    );
    format += makeAlignmentData(id, data) + " ";
    format += makeOffsetData(id, data) + " ";
    format += makePathOperation(id, data);
    addAction(id, name, descript, format, data, subcat);
}

function addFreeformPathAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "This action creates one or more drawing paths to define lines or shapes which can then be styled or used as a clip area. An " + layerInfoText('') +
        "Coordinates are \"X, Y\" points with \"0, 0\" at top left and can be absolute (px) or relative (%) to overall icon size.\n" +
        "Coordinate(s) are specified as one or more '[X, Y]' sets separated by commas (brackets are optional). " +
        "Multiple un-connected segments can be added by wrapping a set of at least 2 coordinates with '[...]' brackets. " +
        "Alternately, provide an SVG Path string starting with 'M' ('Close Path' option is ignored for these).";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += ` Coordinates\nor SVG Path {${i++}} Coord.\n${SP_EN}Units {${i++}} Close\n${SP_EN}Path {${i++}} `;
    data.push(
        makeTextData(jid(id, "path"), "Coordinate List", "[0, 0] [50, 50], [100, 0]"),
        makeSizeTypeData(id),
        makeYesNoSwitchData(jid(id, "close"), false),
    );
    format += makeAlignmentData(id, data) + " ";
    format += makeOffsetData(id, data) + " ";
    format += makePathOperation(id, data);
    addAction(id, name, descript, format, data, subcat);
}

function addStyleAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Apply a Style to preceding Path layer(s). An Icon with same Name and at least one unused Path drawing layer must already be defined.\n" +
        "Items which can be styled are the Rectangle, Ellipse, and Freeform Path actions (only non-linear paths can have a fill color applied). " +
        "The style will be applied to any preceding Path layer(s) which have not already had a style applied or used as a clip mask.";
    let [format, data] = makeIconLayerCommonData(id);
    format += makeDrawStyleData(id, data, {all: true});
    addAction(id, name, descript, format, data, subcat);
}

function addClipAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Use preceding Path layer(s) to create a clipping mask area on the current drawing. " +
        "The full area will include all preceding Path layer(s) which have not already had a style applied or been used as another mask. " +
        "At least one unused Path drawing type layer must be added first for this action to have any effect.\n" +
        "A clip mask defines a shape outside of which nothing is drawn, like a window which hides anything outside the frame. It will hide parts of anything drawn afterwards which fall outside of it." +
        "'Inverse' will create a mask hiding everything inside of the given path(s). The 'Release' action will restore the drawing area back to the full icon's size.";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += ` {${i++}} Clipping Mask from preceding Path layer(s) | Create with Fill Rule {${i++}}`;
    data.push(
        makeChoiceData(jid(id, "action"), "Action", [C.DataValue.ClipMaskNormal, C.DataValue.ClipMaskInverse, C.DataValue.ClipMaskRelease]),
        makeChoiceData(jid(id, "fillRule"), "Fill Rule", C.STYLE_FILL_RULE_CHOICES)
    );
    addAction(id, name, descript, format, data, subcat);
}

// Layered icon actions

function addStartLayersAction(id, name, subcat) {
    const descript = "Dynamic Icons: " + name + "\n" +
        "Start a new Layered Icon. Add elements(s) in following 'Draw' and 'Layer' action(s) and then use the 'Generate' action to produce the icon.";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `of size {${i++}} wide by {${i++}} high (pixels), tiled to {${i++}} column(s) wide and {${i++}} row(s) high.`;
    const tileChoices = Array.from({length: 15}, (x, i) => (i+1).toString());  // ["1"..."15"]
    data.push(
        makeTextData("icon_size", "Icon Width", PluginSettings.defaultIconSize.width),
        makeTextData("icon_size_h", "Icon Height", PluginSettings.defaultIconSize.height),
        makeChoiceData("icon_tile_x", "Tile Columns", tileChoices),
        makeChoiceData("icon_tile_y", "Tile Rows", tileChoices),
    );
    addAction(id, name, descript, format, data, subcat);
}

function addFilterAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Set or clear a CSS-style filter on a layered icon. " + layerInfoText() + "\n" +
        "The filter specification is a string as per CSS 'filter' property, like `blur(5px)' or 'sepia(60%)'. Separate multiple filters with spaces." +
        "Filters affect all following layer(s) until they are reset (eg. 'blur(0)').";
    let [format, data] = makeIconLayerCommonData(id);
    format += `set filter to{${data.length}}`;
    data.push(makeActionData("canvFilter_filter", "text", "Filter", "https://developer.mozilla.org/en-US/docs/Web/CSS/filter"));
    addAction(id, name, descript, format, data, subcat);
}

function addCompositeModeAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Set the composition/blending operation mode on a layered icon. " + layerInfoText() + "\n" +
        "Composition type determines how the layers are combined color-wise when drawing them on top of each other." +
        "The selected type affects all following layer(s) until the end or a different one is specified.";
    let [format, data] = makeIconLayerCommonData(id);
    format += `set Composite/Blend Mode to {${data.length}} for all following layer(s)`
    data.push(makeChoiceData("compMode_mode", "Composition Mode", [
        "source-over",  "source-in",  "source-out",  "source-atop",  "destination-over",  "destination-in",  "destination-out",  "destination-atop",  "lighter",  "copy",  "xor",
        "multiply",  "screen",  "overlay",  "darken",  "lighten",  "color-dodge",  "color-burn",  "hard-light",  "soft-light",  "difference",  "exclusion",  "hue", "saturation",  "color",  "luminosity",
    ]));
    addAction(id, name, descript, format, data, subcat);
}

function addGenerateLayersAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Finalize and/or Render a dynamic image icon which has been created using preceding 'New' and 'Draw/Layer' actions using the same Icon Name.\n" +
        "'Finalize' marks the icon as finished, removing any extra layers which may have been added previously. 'Render' produces the actual icon in its current state and sends it to TP.";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `{${i++}} with Compression Level {${i++}} and Quality {${i++}} (defaults are set in plugin Settings)`;
    // Disable GPU option for now, revisit later if GPU usage becomes stable.
    // format += `{${i++}} with Compression Level {${i++}} Quality {${i++}} and GPU Rendering {${i++}} (defaults are set in plugin Settings)`;
    data.push(
        makeChoiceData(jid(id, "action"), "Action", ["Finalize & Render", "Finalize Only", "Render Only"]),
        makeChoiceData(jid(id, "cl"), "Compression Level", [C.Str.Default, "None", "1 (low)", "2", "3", "4", "5", "6", "7", "8", "9 (high)"]),
        makeChoiceData(jid(id, "quality"), "Quality", [C.Str.Default, ...Array.from( {length: 100}, (_, i) => (i+1).toString()).reverse() ]),
        // makeChoiceData(jid(id, "gpu"), "GPU Rendering", [C.Str.Default, "Enabled", "Disabled"]),
    );
    addAction(id, name, descript, format, data, subcat);
}

function addSaveToFileAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Save the generated image to a file (or multiple files for tiled images). File paths are relative to this plugin's \"Default Image Files Path\" setting, or use absolute paths.\n" +
        "Extension of the given file name determines the format. Supported: AVIF, GIF, JPEG, PNG, TIFF, & WEBP. Each format accepts different options, see plugin documentation wiki for details.";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `save to file {${i++}} with options {${i++}} (name=value, name2=value, ...)`;
    data.push(
        makeFileData(jid(id, "file"), ["*.avif", "*.gif", "*.jpg", "*.jpeg", "*.png", "*.tif", "*.tiff", "*.webp"]),
        makeTextData(jid(id, "options")),
    );
    addAction(id, name, descript, format, data, subcat);
}

// Shared actions for updating existing icons/layers.

function addTransformAction(id, name, subcat, withIndex = false) {
    // Transforms can be inserted as a layer or updated like an "animation"; the former version is more terse.
    let descript;
    if (withIndex) {
        descript =
            "Update transform operation(s) on a dynamic icon." + layerInfoText("", false) +
            "Position indexes start at 1 (non-layered icons have only one position). Specify a negative index to count from the bottom of a layer stack.\n"
            + txInfoText(0);
    }
    else {
        descript = "Add transform operation(s) to a dynamic icon." + layerInfoText("", true) + txInfoText(1);
    }

    let [format, data] = makeIconLayerCommonData(id, withIndex);
    format += makeTransformData(C.DEFAULT_TRANSFORM_OP_ORDER, id, data);
    if (withIndex) {
        format += `Render\nIcon?{${data.length}}`;
        data.push(makeRenderChoiceData(id));
    }
    else {
        format += `Scope {${data.length}}`
        data.push(
            makeChoiceData(jid(id, "scope"), "Scope", [C.DataValue.TxScopePreviousOne, C.DataValue.TxScopeCumulative, C.DataValue.TxScopeUntilReset, C.DataValue.TxScopeReset])
        );
    }
    addAction(id, name, descript, format, data, subcat, withIndex);
}

function addTransformUpdtAction(id, name, subcat) { addTransformAction(id, name, subcat, true); }

function addValueUpdateAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Update a value on an element in an existing icon. " +
        "Elements which can be updated: Gauge, Graph and Bar values, Text content, Image source, Effect Filter and Script arguments. " +
        "Value type must match the element type (numeric/string), and may contain math and other JS expressions.\n" +
        "Icon with same Name must already exist and contain a supported element type at the specified position. " +
        "Position indexes start at 1 (non-layered icons have only one position). Specify a negative index to count from the bottom of a layer stack.";
    let [format, data] = makeIconLayerCommonData(id, true);
    format += `set value to{${data.length}}and render icon? {${data.length+1}}`;
    data.push(
        makeActionData(jid(id, "value"), "text", "Value", ""),
        makeRenderChoiceData(id),
    );
    addAction(id, name, descript, format, data, subcat, true);
}

function addColorUpdateAction(id, name, subcat) {
    const descript = "Dynamic Icons: " +
        "Update a color on an element in an existing icon. " +
        "Elements which can be updated: Round Gauge and Bar Graph forground/background, Progress Bar value/container fill, and fill/stroke on Text, Styled Rectangle, and Path Style actions.\n" +
        "Icon with same Name must already exist and contain a supported element type at the specified position. " +
        "Position indexes start at 1 (non-layered icons have only one position). Specify a negative index to count from the bottom of a layer stack.";
    let [format, data] = makeIconLayerCommonData(id, true);
    let i = data.length;
    format += ` set {${i++}} color to {${i++}} and render icon? {${i++}}`;
    data.push(
        makeChoiceData(jid(id, "type"), "Type", C.COLOR_UPDATE_TYPE_CHOICES),
        makeColorData(jid(id, "color"), "Color", "#00000000"),
        makeRenderChoiceData(id),
    );
    addAction(id, name, descript, format, data, subcat);
}

// System utility action

function addSystemActions() {
    const id = jid(C.ActHandler.Control, C.Act.ControlCommand);
    addAction(id, "Plugin Actions", "", "Perform Action: {0} for Icon(s): {1}",
    [
        makeChoiceData(jid(id, C.ActData.CommandAction), "Action to Perform", C.CTRL_CMD_ACTION_CHOICES, ""),
        makeChoiceData(jid(id, C.ActData.CommandIcon),   "Icon for Action", [ "[ no icons created ]" ], "")
    ]);
}


// ------------------------
// Build the full entry.tp object for JSON dump

const iid = C.ActHandler.Icon;

addProgressGaugeAction(  jid(iid, C.Act.IconProgGauge), "Draw - Simple Round Gauge",          ACTION_CATS.gauge );
addBarGraphAction(       jid(iid, C.Act.IconBarGraph),  "Draw - Simple Bar Graph",            ACTION_CATS.gauge );
addProgressBarAction(    jid(iid, C.Act.IconProgBar),   "Draw - Linear Progress Bar",         ACTION_CATS.gauge );
addGaugeTicksAction(     jid(iid, C.Act.IconCircularTicks), "Draw - Circular Tick Marks",     ACTION_CATS.gauge, false );
addGaugeTicksAction(     jid(iid, C.Act.IconLinearTicks),   "Draw - Linear Tick Marks",       ACTION_CATS.gauge, true );
addTextAction(           jid(iid, C.Act.IconText),      "Draw - Text",                        ACTION_CATS.basic );
addImageAction(          jid(iid, C.Act.IconImage),     "Draw - Image",                       ACTION_CATS.basic );
addRectangleAction(      jid(iid, C.Act.IconRect),      "Draw - Styled Rectangle",            ACTION_CATS.basic );
addScriptAction(         jid(iid, C.Act.IconScript),    "Draw - Run Custom Script",           ACTION_CATS.basic );
addStartLayersAction(    jid(iid, C.Act.IconDeclare),   "Layer - New Layered Icon",           ACTION_CATS.layer );
addTransformAction(      jid(iid, C.Act.IconTx),        "Layer - Add Transformation",         ACTION_CATS.layer );
addFilterAction(         jid(iid, C.Act.IconFilter),    "Layer - Set Effect Filter",          ACTION_CATS.layer );
addCompositeModeAction(  jid(iid, C.Act.IconCompMode),  "Layer - Set Composite Mode",         ACTION_CATS.layer );
addGenerateLayersAction( jid(iid, C.Act.IconGenerate),  "Layer - Generate Layered Icon",      ACTION_CATS.layer );
addSaveToFileAction(     jid(iid, C.Act.IconSaveFile),  "Layer - Save Icon To File",          ACTION_CATS.layer );
addRectanglePathAction(  jid(iid, C.Act.IconRectPath),  "Paths - Add Rounded Rectangle",      ACTION_CATS.paths );
addEllipsePathAction(    jid(iid, C.Act.IconEllipse),   "Paths - Add Ellipse / Arc",          ACTION_CATS.paths );
addFreeformPathAction(   jid(iid, C.Act.IconPath),      "Paths - Add Freeform Path",          ACTION_CATS.paths );
addStyleAction(          jid(iid, C.Act.IconStyle),     "Paths - Apply Style to Path(s)",     ACTION_CATS.paths );
addClipAction(           jid(iid, C.Act.IconClip),      "Paths - Clipping Mask from Path(s)", ACTION_CATS.paths );
addTransformUpdtAction(  jid(iid, C.Act.IconSetTx),     "Animate - Transformation",           ACTION_CATS.anim8 );
addValueUpdateAction(    jid(iid, C.Act.IconSetValue),  "Animate - Update a Value",           ACTION_CATS.anim8 );
addColorUpdateAction(    jid(iid, C.Act.IconSetColor),  "Animate - Update a Color",           ACTION_CATS.anim8 );

// Misc actions
addSystemActions();

// Don't forget to actually add the corresponding action handlers to the plugin code...  ;-)


// Output

const output = JSON.stringify(entry_base, null, 4);
if (OUTPUT_PATH === '-') {
    console.log(output);
    process.exit(0);
}

const outfile = path.join(OUTPUT_PATH, "entry.tp");
writeFileSync(outfile, output);
console.log("Wrote output to file:", outfile);
if (DEV_MODE) {
    console.warn("!!!=== Generated DEV MODE entry.tp file ===!!!");
    process.exit(1);  // exit with error to prevent accidental usage with build scripts.
}
process.exit(0);

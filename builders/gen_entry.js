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
var DOCS_URL_BASE = "https://github.com/spdermn02/TouchPortal-Dynamic-Icons/wiki/Documentation";
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
    plugin_start_cmd:         DEV_MODE ? undefined : `sh %TP_PLUGIN_FOLDER%${pkgConfig.name}/start.sh ${pkgConfig.name}`,
    plugin_start_cmd_windows: DEV_MODE ? undefined : `"%TP_PLUGIN_FOLDER%${pkgConfig.name}\\${pkgConfig.name}.exe"`,
    configuration: {
        colorDark:  "#23272A",
        colorLight: "#7289DA",
        parentCategory: "misc",
    },
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
        /*  Do not use GPU setting for now, possibly revisit if skia-canvas is fixed. **
        {
            name: C.SettingName.GPU,
            type: "text",
            default: PluginSettings.defaultGpuRendering ? "Yes" : "No",
            readOnly: false,
            tooltip: {
                title: cleanSettingTitle(C.SettingName.GPU),
                body: "Enables or disables using hardware acceleration (GPU), when available, for generating icon images. One of: \"yes, true, 1, or enable\" to enable, anything else to disable.\n" +
                    "This setting can be also be overridden per icon. Changing this setting does not affect any icons already generated since the plugin was started.\n\n" +
                    "When disabled, all image processing happens on the CPU, which may be slower and/or produce slightly different results in some cases.\n\n" +
                    "GPU rendering is only supported on some hardware/OS/drivers, and is disabled on others regardless of this setting.\n\n" +
                    "Note that at least some CPU will be used when generating icons in any case, most notably for image file loading and final output PNG compression.",
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
    ],
    categories: [
        {
            id: "TP Dynamic Icons",
            name: C.Str.IconCategoryName,
            imagepath: `%TP_PLUGIN_FOLDER%${pkgConfig.name}/${pkgConfig.name}.png`,
            actions: [],
            connectors: [],
            states: [
                {
                    id: C.StateId.IconsList,
                    type: "text",
                    desc: "Dynamic Icons: List of created icons",
                    default: ""
                }
            ],
            events: []
        }
    ]
};

// Other constants
const ID_PREFIX = C.Str.IdPrefix;
const TRANSFORM_OPERATIONS = C.DEFAULT_TRANSFORM_OP_ORDER;

// some useful characters for forcing spacing in action texts
const NBSP = " ";   // non-breaking narrow space U+202F (TP ignores "no-break space" U+00AD)
const SP_EN = " ";  // en quad space U+2000  (.5em wide)
const SP_EM = " "; // em quad space U+2001  (1em wide)

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

// Wraps a string _once_ at the given width, so at most it creates 2 lines of text, one <= the given width and one (possibly longer) with the remainder.
String.prototype.wrap = function(width = 280) {
    const re = new RegExp(`(?![^\\n]{1,${width}}$)([^\\n]{1,${width}})\\s`, 'm');  // replace 'm' flag with 'g' for wrap to multiple lines
    return this.replace(re, '$1\n').trim();
}

// Remove any trailing range info like " (0-9)" from settings name for use in tooltip window.
function cleanSettingTitle(title) {
    return title.replace(/ \(.+\)$/, "");
}

/** "join ID" - join parts of an action/data/etc ID string using the common separator character. */
function jid(...args) {
    return args.join(C.Str.IdSep);
}

function addAction(id, name, descript, format, data, hold = false) {
    const action = {
        "id": ID_PREFIX + id,
        "prefix": "Dynamic Icons:",
        "name": name,
        "type": "communicate",
        "tryInline": true,
        "description": descript,
        "format": String(format).format(data.map(d => `{$${d.id}$}`)),
        "hasHoldFunctionality": hold,
        "data": data
    }
    entry_base.categories[0].actions.push(action);
}

function makeActionData(id, type, label = "", deflt = "") {
    return {
        "id": ID_PREFIX + id,
        "type": type,
        "label":  label,
        "default": deflt
    };
}

function makeTextData(id, label, dflt = "") {
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

function makeIconNameData(id, label = "Icon Name") {
    return makeTextData(jid(id, "name"), label);
}

function makeSizeTypeData(id, dflt = undefined) {
    return makeChoiceData(jid(id, "unit"), "Unit", ["%", "px"], dflt);
}

// Shared functions which create both a format string and data array.
// They accept an array (reference) as argument to store the data parameters into, and return the related format string.

function makeIconLayerCommonData(id, withIndex = false) {
    let format = "Icon\nName {0}";
    const data = [ makeIconNameData(id) ];
    if (withIndex) {
        format += "Element\n@ Position{1}";
        data.push(makeNumericData(jid(id, "layer_index"), "Layer Position", 1, -99, 99, false));
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

function makeStrokeStyleData(id, /* out */ data, { withUnitType=true, withCap, withJoin, withMiterLimit, withLineDash, all } = {}) {
    let i = data.length;
    let format = `Stroke\nWidth {${i++}}`;
    data.push(makeTextData(jid(id, "line_width"), "Stroke Width", "0"));

    if (all || withUnitType) {
        format += `{${i++}}`;
        data.push(makeSizeTypeData(jid(id, "line_width")));
    }

    format += ` Stroke\nColor {${i++}}`;
    data.push(makeColorData(jid(id, "line_color"), "Stroke"));

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

function makeDrawStyleData(id, /* out */ data, { withShadow=true, withDrawOrder, withFillRule, all } = {}) {
    id = jid(id, "style");
    i = data.length;
    let format = `Fill\nColor {${i++}} `;
    data.push(makeColorData(jid(id, "fillColor"), "Fill"));
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
    const format = `Offset\n (%) H {${i++}}${NBSP}\n V{${i++}}`;
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

function addRectangleAction(id, name) {
    const descript = "Dynamic Icons: " +
        `Generate or layer a styled square/rounded shape. ${layerInfoText('shape')}\n` +
        "Size/radius/stroke width can be specified in percent of icon size or fixed pixels. Up to 4 radii can be specified, separated by commas, for each corner starting at top left.";
    let [format, data] = makeIconLayerCommonData(id);
    format += makeRectSizeData("rect", data) + " ";
    format += makeBorderRadiusData("rect", data) + " ";
    format += makeDrawStyleData("rect", data);
    addAction(id, name, descript, format, data);
}

function addTextAction(id, name) {
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
    addAction(id, name, descript, format, data);
}

function addImageAction(id, name, withTx = true) {
    let descript = "Dynamic Icons: " +
        `Generate or layer an image. ${layerInfoText('image')} ` +
        "File paths are relative to this plugin's \"Default Image Files Path\" setting, or use absolute paths. Base64-encoded images can be loaded by using a \"data:\" prefix before the string data.\n";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `Image\nFile {${i++}}Resize\nFit {${i++}}`;
    data.push(
        makeActionData(jid(id, "src"), "file", "Image Source"),
        makeChoiceData(jid(id, "fit"), "Resize Fit", ["contain", "cover", "fill", "scale-down", "none"]),
    );
    if (withTx) {
        descript += txInfoText();
        format += makeTransformData(TRANSFORM_OPERATIONS.slice(0, 3), jid(id, C.Act.IconTx), data);  // don't include skew op
    }
    addAction(id, name, descript, format, data, false);
}

function addProgressGaugeAction(id, name) {
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
        makeChoiceData("gauge_highlight", "Gauge Highlight", ["On", "Off"]),
        makeTextData("gauge_start_degree", "Gauge Start Degree", "180"),
        makeActionData("gauge_value", "text", "Gauge Value", "0"),
        makeTextData("gauge_line_width", "Line Width", "12"),
        makeSizeTypeData("gauge_line_width"),
        makeChoiceData("gauge_line_cap", "Gauge Icon Cap Type", ["round", "butt", "square"]),
        makeTextData("gauge_radius", "Diameter", "78"),
        makeChoiceData("gauge_counterclockwise", "Gauge Direction", ["Clockwise", "Counter CW", "Automatic"]),
        makeActionData("gauge_background_color", "color", "Gauge Background Color", "#000000FF"),
        makeActionData("gauge_shadow_color", "color", "Gauge Shadow Color", "#282828FF"),
    );
    addAction(id, name, descript, format, data, true);
}

function addBarGraphAction(id, name) {
    const descript = "Dynamic Icons: " +
        "Generate or layer a simple bar graph reflecting series data.\n" + layerInfoText('graph') + " " + numericValueInfoText();
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `with background {${i++}} of color {${i++}} using bar color {${i++}} add value {${i++}} with bar width {${i++}}`;
    data.push(
        makeChoiceData("bar_graph_backround", "Bar Graph Background", ["On", "Off"]),
        makeActionData("bar_graph_backround_color", "color", "Bar Graph Background Color", "#FFFFFFFF"),
        makeActionData("bar_graph_color", "color", "Bar Graph Color", "#FFA500FF"),
        makeActionData("bar_graph_value", "text", "Bar Graph Value", "0"),
        makeNumericData("bar_graph_width", "Bar Graph Width", 10, 1, 256, false),
    );
    addAction(id, name, descript, format, data, true);
}

function addProgressBarAction(id, name) {
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
    addAction(id, name, descript, format, data);
}

// Paths and path handlers

function addRectanglePathAction(id, name) {
    const descript = "Dynamic Icons: " +
        `Create rectangle and rounded shapes which can then be styled or used as a clip area. An ${layerInfoText('')}\n` +
        "Size and radius can be specified in percent of icon size or fixed pixels. Up to 4 radii can be specified, separated by commas, for each corner starting at top left.";
    let [format, data] = makeIconLayerCommonData(id);
    format += makeRectSizeData(id, data) + " ";
    format += makeBorderRadiusData(id, data) + " ";
    format += makeAlignmentData(id, data) + " ";
    format += makeOffsetData(id, data) + " ";
    format += makePathOperation(id, data);
    addAction(id, name, descript, format, data);
}

function addEllipsePathAction(id, name) {
    const descript = "Dynamic Icons: " +
        `Create an full or partial elliptical shape which can then be styled or used as a clip area. An ${layerInfoText('')}\n` +
        "Size can be specified in percent of icon size or fixed pixels. Angles are in degrees, with zero being North/up. " +
        "A complete circle is created by using 0 and 360 degrees as start/end angles. Rotation is applied to the final shape, from center. " +
        "Alignment & Offset control the shape's position within the overall drawing area.";
    let [format, data] = makeIconLayerCommonData(id);
    format += makeRectSizeData(id, data) + " ";
    let i = data.length;
    format += ` Start\nAngle {${i++}} End\nAngle {${i++}} Drawing\nDirection {${i++}} Rotation\n${SP_EM}${SP_EN}Angle {${i++}} `;
    data.push(
        makeTextData(jid(id, "start"), "Start Angle", "0"),
        makeTextData(jid(id, "end"), "End Angle", "360"),
        makeChoiceData(jid(id, "dir"), "Draw Direction", ["Clockwise", "Counter CW"]),
        makeTextData(jid(id, "rotate"), "rotation Angle", "0"),
    );
    format += makeAlignmentData(id, data) + " ";
    format += makeOffsetData(id, data) + " ";
    format += makePathOperation(id, data);
    addAction(id, name, descript, format, data);
}

function addFreeformPathAction(id, name) {
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
        makeChoiceData(jid(id, "close"), "Close Path", ["No", "Yes"]),
    );
    format += makeAlignmentData(id, data) + " ";
    format += makeOffsetData(id, data) + " ";
    format += makePathOperation(id, data);
    addAction(id, name, descript, format, data);
}

function addStyleAction(id, name) {
    const descript = "Dynamic Icons: " +
        "Apply a Style to preceeding Path layer(s). An Icon with same Name and at least one unused Path drawing layer must already be defined.\n" +
        "Items which can be styled are the Rectangle, Ellipse, and Freeform Path actions (only non-linear paths can have a fill color applied). " +
        "The style will be applied to any preceeding Path layer(s) which have not already had a style applied or used as a clip mask.";
    let [format, data] = makeIconLayerCommonData(id);
    format += makeDrawStyleData(id, data, {all: true});
    addAction(id, name, descript, format, data);
}

function addClipAction(id, name) {
    const descript = "Dynamic Icons: " +
        "Use preceeding Path layer(s) to create a clipping mask area on the current drawing. " +
        "The full area will include all preceeding Path layer(s) which have not already had a style applied or been used as another mask. " +
        "At least one unused Path drawing type layer must be added first for this action to have any effect.\n" +
        "A clip mask defines a shape outside of which nothing is drawn, like a window which hides anything outside the frame. It will hide parts of anything drawn afterwards which fall outside of it." +
        "'Inverse' will create a mask hiding everything inside of the given path(s). The 'Release' action will restore the drawing area back to the full icon's size.";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += ` {${i++}} Clipping Mask from preceeding Path layer(s) | Create with Fill Rule {${i++}}`;
    data.push(
        makeChoiceData(jid(id, "action"), "Action", [C.DataValue.ClipMaskNormal, C.DataValue.ClipMaskInverse, C.DataValue.ClipMaskRelease]),
        makeChoiceData(jid(id, "fillRule"), "Fill Rule", C.STYLE_FILL_RULE_CHOICES)
    );
    addAction(id, name, descript, format, data);
}

// Layered icon actions

function addStartLayersAction(id, name) {
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
    addAction(id, name, descript, format, data);
}

function addFilterAction(id, name) {
    const descript = "Dynamic Icons: " +
        "Set or clear a CSS-style filter on a layered icon. " + layerInfoText() + "\n" +
        "The filter specification is a string as per CSS 'filter' property, like `blur(5px)' or 'sepia(60%)'. Separate multiple filters with spaces." +
        "Filters affect all following layer(s) until they are reset (eg. 'blur(0)').";
    let [format, data] = makeIconLayerCommonData(id);
    format += `set filter to{${data.length}}`;
    data.push(makeActionData("canvFilter_filter", "text", "Filter", "https://developer.mozilla.org/en-US/docs/Web/CSS/filter"));
    addAction(id, name, descript, format, data);
}

function addCompositeModeAction(id, name) {
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
    addAction(id, name, descript, format, data, false);
}

function addGenerateLayersAction(id, name) {
    const descript = "Dynamic Icons: " +
        "Finalize and/or Render a dynamic image icon which has been created using preceding 'New' and 'Draw/Layer' actions using the same Icon Name.\n" +
        "'Finalize' marks the icon as finished, removing any extra layers which may have been added previously. 'Render' produces the actual icon in its current state and sends it to TP.";
    const format = "Icon Named {0} {1} with Compression Level {2} (default is set in plugin Settings)";
    // Do not use GPU setting for now, possibly revisit if skia-canvas is fixed.
    // const format = "Icon Named {0} {1} | Enable GPU Rendering: {2} Compression Level: {3} (defaults are set in plugin Settings)";
    const data = [
        makeIconNameData(id),
        makeChoiceData("icon_generate_action", "Action", ["Finalize & Render", "Finalize Only", "Render Only"]),
        // makeChoiceData("icon_generate_gpu", "Enable GPU Rendering", ["default", "Enable", "Disable"]),
        makeChoiceData("icon_generate_cl", "Image Compression Level", ["default", "None", "1 (low)", "2", "3", "4", "5", "6", "7", "8", "9 (high)"]),
    ];
    addAction(id, name, descript, format, data);
}

// Shared actions for updating existing icons/layers.

function addTransformAction(id, name, withIndex = false) {
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
    format += makeTransformData(TRANSFORM_OPERATIONS, id, data);
    if (withIndex) {
        format += `Render\nIcon?{${data.length}}`;
        data.push(makeChoiceData(jid(id, "render"), "Render?", ["No", "Yes"]));
    }
    else {
        format += `Scope {${data.length}}`
        data.push(
            makeChoiceData(jid(id, "scope"), "Scope", [C.DataValue.TxScopePreviousOne, C.DataValue.TxScopeCumulative, C.DataValue.TxScopeUntilReset, C.DataValue.TxScopeReset])
        );
    }
    addAction(id, name, descript, format, data, false);
}

function addValueUpdateAction(id, name) {
    const descript = "Dynamic Icons: " +
        "Update a value on an element in an existing icon. " +
        "Elements which can be updated: Gauge, Graph and Bar values, Text content, Image source, and Effect Filter. " +
        "Value type must match the element type (numeric/string), and may contain math and other JS expressions.\n" +
        "Icon with same Name must already exist and contain a supported element type at the specified position. " +
        "Position indexes start at 1 (non-layered icons have only one position). Specify a negative index to count from the bottom of a layer stack.";
    let [format, data] = makeIconLayerCommonData(id, true);
    format += `set value to{${data.length}}and render icon? {${data.length+1}}`;
    data.push(
        makeActionData("value_update_value", "text", "Value", ""),
        makeChoiceData("value_update_render", "Render?", ["No", "Yes"]),
    );
    addAction(id, name, descript, format, data);
}

function addColorUpdateAction(id, name) {
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
        makeChoiceData(jid(id, "render"), "Render?", ["No", "Yes"]),
    );
    addAction(id, name, descript, format, data);
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

addProgressGaugeAction(  jid(iid, C.Act.IconProgGauge), "Draw - Simple Round Gauge");
addBarGraphAction(       jid(iid, C.Act.IconBarGraph),  "Draw - Simple Bar Graph");
addProgressBarAction(    jid(iid, C.Act.IconProgBar),   "Draw - Linear Progress Bar");
addTextAction(           jid(iid, C.Act.IconText),      "Draw - Text");
addImageAction(          jid(iid, C.Act.IconImage),     "Draw - Image");
addRectangleAction(      jid(iid, C.Act.IconRect),      "Draw - Styled Rectangle");

addStartLayersAction(    jid(iid, C.Act.IconDeclare),   "Layer - New Layered Icon");
addTransformAction(      jid(iid, C.Act.IconTx),        "Layer - Add Transformation", false);
addFilterAction(         jid(iid, C.Act.IconFilter),    "Layer - Set Effect Filter");
addCompositeModeAction(  jid(iid, C.Act.IconCompMode),  "Layer - Set Composite Mode");
addGenerateLayersAction( jid(iid, C.Act.IconGenerate),  "Layer - Generate Layered Icon");

addRectanglePathAction(  jid(iid, C.Act.IconRectPath),  "Paths - Add Rounded Rectangle");
addEllipsePathAction(    jid(iid, C.Act.IconEllipse),   "Paths - Add Ellipse / Arc");
addFreeformPathAction(   jid(iid, C.Act.IconPath),      "Paths - Add Freeform Path");
addStyleAction(          jid(iid, C.Act.IconStyle),     "Paths - Apply Style to Path(s)");
addClipAction(           jid(iid, C.Act.IconClip),      "Paths - Clipping Mask from Path(s)");

addTransformAction(      jid(iid, C.Act.IconSetTx),     "Animate - Transformation", true);
addValueUpdateAction(    jid(iid, C.Act.IconSetValue),  "Animate - Update a Value");
addColorUpdateAction(    jid(iid, C.Act.IconSetColor),  "Animate - Update a Color");

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

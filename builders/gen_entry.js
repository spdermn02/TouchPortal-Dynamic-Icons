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
const { writeFileSync, existsSync, statSync } = require("fs");
const pkgConfig = require("../package.json");

const COMMON_JS_PATH = "./dist/common.js";

if (!existsSync(COMMON_JS_PATH) || statSync(COMMON_JS_PATH).mtimeMs < statSync("./src/common.ts").mtimeMs) {
    console.error(COMMON_JS_PATH + " settings file not found or is older than source version, please run 'npm run tsc' first or 'npm run gen-entry'");
    process.exit(1);
}

const { PluginSettings } = require("../" + COMMON_JS_PATH);

// Defaults
var VERSION = pkgConfig.version;
var BUILD_NUM = pkgConfig.config.build;
var OUTPUT_PATH = "base"
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
    "$schema": "https://pjiesco.com/touch-portal/entry.tp/schema",
    "sdk": 6,
    "version": parseInt(iVersion.toString(16)),
    "name": "Touch Portal Dynamic Icons",
    "id": "Touch Portal Dynamic Icons",
    [pkgConfig.name]: VERSION,
    "plugin_start_cmd":         DEV_MODE ? undefined : `sh %TP_PLUGIN_FOLDER%${pkgConfig.name}/start.sh ${pkgConfig.name}`,
    "plugin_start_cmd_windows": DEV_MODE ? undefined : `"%TP_PLUGIN_FOLDER%${pkgConfig.name}\\${pkgConfig.name}.exe"`,
    "configuration": {
        "colorDark": "#23272A",
        "colorLight": "#7289DA"
    },
    "settings": [
        {
            "name": "Default Icon Size",
            "type": "text",
            "default": `${PluginSettings.defaultIconSize.width} x ${PluginSettings.defaultIconSize.height}`,
            "readOnly": false,
            "description": "Image size produced when using standalone 'Draw' actions for producing icons, without any layering."
        },
        {
            "name": "Default Image Files Path",
            "type": "text",
            "default": "",
            "readOnly": false,
            "description": "Base directory to use when loading image files specified using a relative path. When left empty, the default is Touch Portal's configuration directory for the current user."
        },
        {
            "name": "Enable GPU Rendering by Default",
            "type": "text",
            "default": PluginSettings.defaultGpuRendering ? "Yes" : "No",
            "readOnly": false,
            "description": "Enables or disables using hardware acceleration (GPU), when available, for generating icon images. One of: \"yes, true, 1, or enable\" to enable, anything else to disable.\n" +
                "This setting can be also be overridden per icon. Changing this setting does not affect any icons already generated since the plugin was started.\n\n" +
                "When disabled, all image processing happens on the CPU, which may be slower and/or produce slightly different results in some cases.\n\n" +
                "GPU rendering is only supported on some hardware/OS/drivers, and is disabled on others regardless of this setting.\n\n" +
                "Note that at least some CPU will be used when generating icons in any case, most notably for image file loading and final output PNG compression."
        },
        {
            "name": "Default Output Image Compression Level (0-9)",
            "type": "number",
            "default": PluginSettings.defaultOutputCompressionLevel.toString(),
            "minValue": 0,
            "maxValue": 9,
            "readOnly": false,
            "description": "Sets or disables the default image compression level of generated icons. This can be set to a number between 1 (low compression) and 9 (high compression)," +
                " or 0 (zero) to disable compression entirely.\n" +
                "This option can be also be overridden per icon. Changing this setting does not affect any icons already generated since the plugin was started.\n\n" +
                "Compression affects the final image data size which will be sent to the TP device for display. The higher the compression level, the smaller the final size." +
                " However, compression uses CPU resources, proportional to the compression level (higher level means more CPU use) and may produce lower quality images.\n\n" +
                "Large image data sizes may impact the performance of the connected TP device to the point that it becomes unusable due to the lag. " +
                "This setting can be adjusted to fine-tune the impact of dynamic icon generation on your computer vs. efficient delivery of images to the TP device."
        },
    ],
    "categories": [
        {
            "id": "TP Dynamic Icons",
            "name": "Dynamic Icons",
            "imagepath": `%TP_PLUGIN_FOLDER%${pkgConfig.name}/${pkgConfig.name}.png`,
            "actions": [],
            "connectors": [],
            "states": [
                {
                    "id": "dynamic_icons_createdIconsList",
                    "type": "text",
                    "desc" : "Dynamic Icons: List of created icons",
                    "default" : ""
                }
            ],
            "events": []
        }
    ]
};

// Other constants
const ID_PREFIX = "dynamic_icons_";
const category = entry_base.categories[0];

// should really pull these in from the plugin source code... must match TransformOpType
const TRANSFORM_OPERATIONS = ['O', 'R', 'SC', 'SK'];

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
    category.actions.push(action);
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
    const d = makeActionData(id, "choice", label, typeof dflt === "undefined" ? choices[0] : dflt);
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

function makeIconNameData(idPrefix, label = "Icon Name") {
    return makeTextData(idPrefix + "_name", label);
}

function makeSizeTypeData(idPrefix, dflt = undefined) {
    return makeChoiceData(idPrefix + "_unit", "Unit", ["%", "px"], dflt);
}

// Shared functions which create both a format string and data array.
// They accept an array (reference) as argument to store the data parameters into, and return the related format string.

function makeIconLayerCommonData(idPrefix, withIndex = false) {
    let format = "Icon\nName{0}";
    const data = [ makeIconNameData(idPrefix) ];
    if (withIndex) {
        format += "Element\n@ Position{1}";
        data.push(makeNumericData(idPrefix + "_layer_index", "Layer Position", 1, -99, 99, false));
    }
    return [ format, data ];
}

function makeTransformOpData(type, idPrefix , /* out */ data, splitXY = true) {
    const i = data.length;
    let f = splitXY ? `{0}\n (%) X{${i}}${NBSP}\nY{${i+1}}` : `{0}\n${SP_EN}X : Y {${i}}`;
    switch (type) {
        case "R":
            f = `Rotate\n${SP_EM}${SP_EN}(%){${i}}`;
            data.push(makeActionData(idPrefix + "_tx_rot", "text", "Rotation %", "0"));
            break;
        case "O":
            f = f.format("Offset");
            if (splitXY) {
                data.push(makeActionData(idPrefix + "_tx_trsX", "text", "Offset X", "0"));
                data.push(makeActionData(idPrefix + "_tx_trsY", "text", "Offset Y", "0"));
            }
            else {
                data.push(makeActionData(idPrefix + "_tx_trs", "text", "Offset X : Y", "0 : 0"));
            }
            break;
        case "SC":
            f = f.format("Scale");
            if (splitXY) {
                data.push(makeActionData(idPrefix + "_tx_sclX", "text", "Scale X", "100"));
                data.push(makeActionData(idPrefix + "_tx_sclY", "text", "Scale Y", "100"));
            }
            else {
                data.push(makeActionData(idPrefix + "_tx_scl", "text", "Scale X : Y", "100 : 100"));
            }
            break;
        case "SK":
            f = f.format("Skew");
            if (splitXY) {
                data.push(makeActionData(idPrefix + "_tx_skwX", "text", "Skew X", "0"));
                data.push(makeActionData(idPrefix + "_tx_skwY", "text", "Skew Y", "0"));
            }
            else {
                data.push(makeActionData(idPrefix + "_tx_skw", "text", "Skew X : Y", "0 : 0"));
            }
            break;
        default:
            return;
    }
    return f;
}

function makeTransformOrderData(opsList, idPrefix, /* out */ data) {
    if (!opsList.length)
        return;
    const f = opsList.length > 1 ? `Order {${data.length}}` : "";
    let d = makeActionData(idPrefix + "_tx_order", opsList.length > 1 ? "choice" : "text", `Transform Order`);
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

function makeTransformData(opsList, idPrefix, /* out */ data) {
    let f = "";
    for (const op of opsList)
        f += makeTransformOpData(op, idPrefix, data, true);
    f += makeTransformOrderData(opsList, idPrefix, data);
    return f;
}

function makeDrawStyleData(idPrefix, /* out */ data, withShadow = true) {
    let i = data.length;
    let format = `Fill\nColor{${i++}}Stroke\nWidth{${i++}}{${i++}}Stroke\nColor{${i++}}`;
    data.push(
        makeColorData(idPrefix +  "_style_fillColor", "Fill"),
        makeTextData(idPrefix + "_style_line_width", "Stroke Width", "0"),
        makeSizeTypeData(idPrefix + "_style_line_width"),
        makeColorData(idPrefix +  "_style_line_color", "Stroke"),
    );
    if (withShadow) {
        format += `Shadow Size\n(blur, X, Y){${i++}}Shadow\nColor{${i++}}`;
        data.push(
            makeTextData(idPrefix +  "_style_shadow", "Shadow Coordinates", "0, 0, 0"),
            makeColorData(idPrefix +  "_style_shadowColor", "Shadow", "#000000FF"),
        );
    }
    return format;
}

function makeRectSizeData(idPrefix, /* out */ data, w = 100, h = 100, label = "Size", wLabel = "W", hLabel = "H") {
    let i = data.length;
    const format = `${label}\n${SP_EM}${wLabel} {${i++}}{${i++}}${NBSP}\n${hLabel} {${i++}}{${i++}}`;
    data.push(
        makeTextData(idPrefix + "_size_w", "Width", w.toString()),
        makeSizeTypeData(idPrefix + "_size_w"),
        makeTextData(idPrefix + "_size_h", "Height", h.toString()),
        makeSizeTypeData(idPrefix + "_size_h"),
    );
    return format;
}

function makeBorderRadiusData(idPrefix, /* out */ data, r = 0) {
    let i = data.length;
    const format = `Border\nRadius {${i++}}{${i++}}`;
    data.push(
        makeTextData(idPrefix + "_radius", "Radius", r.toString()),
        makeSizeTypeData(idPrefix + "_radius"),
    );
    return format;
}


// --------------------------------------
// Action creation functions

// Some shared description texts
function layerInfoText(what = "", layerOnly = true) {
    return (what ? `To add this ${what} as a layer, an ` : "") + "Icon with same Name must first have been created" + (layerOnly ? " with a 'New' action" : "") + ". "
}
function numericValueInfoText() {
    return "Values can include math operators and JavaScript functions.";
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
    format += `Text{${i++}} Font{${i++}}Align\n${SP_EM}${SP_EN}H{${i++}}${NBSP}\nV{${i++}}Offset\n (%) H{${i++}}${NBSP}\nV{${i++}}Tracking{${i++}}`;  // Baseline{${i++}}
    data.push(
        makeActionData("text_str", "text", "Text", ""),
        makeActionData("text_font", "text", "Font", "1.5em sans-serif"),
        makeChoiceData("text_alignH", "Horizontal Alignment", ["left", "center", "right"], "center"),
        makeChoiceData("text_alignV", "Vertical Alignment", ["top", "middle", "bottom"], "middle"),
        makeActionData(`text_ofsH`, "text", "Horizontal Offset", "0"),
        makeActionData(`text_ofsV`, "text", "Vertical Offset", "0"),
        // makeChoiceData("text_baseline", "Baseline", ["alphabetic", "top", "middle", "bottom", "hanging", "ideographic"]),
        makeNumericData("text_tracking", "Tracking", 0, -999999, 999999, true),
    );
    format += makeDrawStyleData("text", data);
    addAction(id, name, descript, format, data);
}

function addImageAction(id, name, withTx = true) {
    let descript = "Dynamic Icons: " +
        `Generate or layer an image. ${layerInfoText('image')} ` +
        "File paths are relative to this plugin's \"Default Image Files Path\" setting, or use absolute paths.\n";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `Image\nFile {${i++}}Resize\nFit {${i++}}`;
    data.push(
        makeActionData("image_src", "file", "Image Source"),
        makeChoiceData("image_fit", "Resize Fit", ["contain", "cover", "fill", "scale-down", "none"]),
    );
    if (withTx) {
        descript += txInfoText();
        format += makeTransformData(TRANSFORM_OPERATIONS.slice(0, 3), "image", data);  // don't include skew op
    }
    addAction(id, name, descript, format, data, false);
}

function addProgressGaugeAction(id, name) {
    const descript = "Dynamic Icons: " +
        "Generate or layer a round progress-bar style gauge reflecting a data value.\n" + layerInfoText('gauge') + " " + numericValueInfoText();
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format +=
        `with shadow {${i++}} of color {${i++}} using indicator color {${i++}} with highlight {${i++}} starting at degree {${i++}} ` +
        `at value {${i++}} with cap style {${i++}} on background color {${i++}} in direction {${i++}}`;
    data.push(
        makeChoiceData("gauge_shadow", "Gauge Shadow", ["On", "Off"]),
        makeActionData("gauge_shadow_color", "color", "Gauge Shadow Color", "#282828FF"),
        makeActionData("gauge_color", "color", "Gauge Color", "#FFA500FF"),
        makeChoiceData("gauge_highlight", "Gauge Highlight", ["On", "Off"]),
        makeNumericData("gauge_start_degree", "Gauge Start Degree", 180, 0, 360),
        makeActionData("gauge_value", "text", "Gauge Value", "0"),
        makeChoiceData("gauge_cap", "Gauge Icon Cap Type", ["round", "butt", "square"]),
        makeActionData("gauge_background_color", "color", "Gauge Background Color", "#000000FF"),
        makeChoiceData("gauge_counterclockwise", "Gauge Direction", ["Clockwise", "Counter Clockwise"]),
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
    format += " Value:\n" + makeDrawStyleData("pbar_val", data, false).replace("Fill\n", "");
    format += ` Set\nValue {${data.length}}`;
    data.push(
        makeActionData("pbar_value", "text", "Progress Value", "0"),
    )
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
    const format = "Icon Named {0} {1} | Enable GPU Rendering: {2} Compression Level: {3} (defaults are set in plugin Settings)";
    const data = [
        makeIconNameData(id),
        makeChoiceData("icon_generate_action", "Action", ["Finalize & Render", "Finalize Only", "Render Only"]),
        makeChoiceData("icon_generate_gpu", "Enable GPU Rendering", ["default", "Enable", "Disable"]),
        makeChoiceData("icon_generate_cl", "Image Compression Level", ["default", "None", "1 (low)", "2", "3", "4", "5", "6", "7", "8", "9 (high)"]),
    ];
    addAction(id, name, descript, format, data);
}

// Shared actions for updating existing icons/layers.

function addTransformAction(id, name, withIndex = false) {
    // Transforms can be inserted as a layer or updated like an "animation"; the former version is more terse.
    let descript = "";
    if (withIndex) {
        descript +=
            "Update transform operation(s) on a dynamic icon." + layerInfoText("", false) +
            "Position indexes start at 1 (non-layered icons have only one position). Specify a negative index to count from the bottom of a layer stack.\n"
            + txInfoText(0);
    }
    else {
        descript +=
            "Add transform operation(s) to a dynamic icon." + layerInfoText("", true) + txInfoText(1);
    }

    let [format, data] = makeIconLayerCommonData(id, withIndex);
    format += makeTransformData(TRANSFORM_OPERATIONS, (withIndex ? 'set' : 'layer'), data);
    if (withIndex) {
        format += `Render\nIcon?{${data.length}}`;
        data.push(makeChoiceData("tx_update_render", "Render?", ["No", "Yes"]));
    }
    else {
        format += `Scope {${data.length}}`
        data.push(makeChoiceData("layer_tx_scope", "Scope", ["previous layer", "all previous", "all following"]));
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

// System utility action

function addSystemActions() {
    addAction("control_command", "Plugin Actions", "", "Perform Action: {0} for Icon(s): {1}", [
        makeChoiceData("control_command_action", "Action to Perform", ["Clear the Source Image Cache", "Delete Icon State"], ""),
        makeChoiceData("control_command_icon", "Icon for Action", ["[ no icons created ]"], "")
    ]);
}


// ------------------------
// Build the full entry.tp object for JSON dump

addProgressGaugeAction(  "icon_progGauge",  "Draw - Simple Round Gauge");
addBarGraphAction(       "icon_barGraph",   "Draw - Simple Bar Graph");
addProgressBarAction(    "icon_progBar",    "Draw - Linear Progress Bar");
addTextAction(           "icon_text",       "Draw - Text");
addImageAction(          "icon_image",      "Draw - Image");
addRectangleAction(      "icon_rect",       "Draw - Rounded Shape");

addStartLayersAction(    "icon_declare",    "Layer - New Layered Icon");
addTransformAction(      "icon_tx",         "Layer - Add Transformation", false);
addFilterAction(         "icon_filter",     "Layer - Set Effect Filter");
addCompositeModeAction(  "icon_compMode",   "Layer - Set Composite Mode");
addGenerateLayersAction( "icon_generate",   "Layer - Generate Layered Icon");

addTransformAction(      "icon_set_tx",     "Animate - Transformation", true);
addValueUpdateAction(    "icon_set_value",  "Animate - Update a Value");

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

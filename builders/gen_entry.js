#!/usr/bin/env node

// Generates entry.tp JSON file.
// usage: node gen_entry.js [-v <plugin.version.numbers>] [-o <output/path or - for stdout>] [-d]
// A version number is required; it may also be passed via npm_package_version env. variable.
// -d (dev mode) will exclude the plugin_start commands in the TP file, for running the binary separately.


///  ***  NOTE  NOTE  NOTE   ***
//  The action and action data IDs generated here follow a fairly strict naming convention which is used by various bits in the plugin to do their thing.
//  A convention is followed to allow efficient validation and "trickle down" parsing of data by relevant components w/out (hopefully) a spaghetti mess of ifs/cases.
//  It is meant to be extensible -- the name parts (between "_") go from general to more specific, so new handlers could be inserted at any level.
//  On the plugin side the action handlers parse these parts and can hand the data down the component tree as needed.
//


// Defaults
var VERSION = "";
var OUTPUT_PATH = "base"
var DEV_MODE = false;

// Handle CLI arguments
for (let i=2; i < process.argv.length; ++i) {
    const arg = process.argv[i];
    if      (arg == "-v") VERSION = process.argv[++i];
    else if (arg == "-o") OUTPUT_PATH = process.argv[++i];
    else if (arg == "-d") DEV_MODE = true;
}
// Try fall back to npm_package_version variable
if (!VERSION && process.env.npm_package_version)
    VERSION = process.env.npm_package_version;
// Validate the version
if (!VERSION) {
    console.error("No plugin version number, cannot continue :( \n Use -v <version.number> argument.");
    process.exit(1);
}
// Create integer version number from dotted notation in form of ((MAJ << 16) | (MIN << 8) | PATCH)
// Each version part is limited to the range of 0-99.
var iVersion = 0;
for (const part of VERSION.split('-', 1)[0].split('.', 3))
    iVersion = iVersion << 8 | (parseInt(part) & 0xFF);

// --------------------------------------
// Define the base entry.tp object here

const entry_base =
{
    "$schema": "https://pjiesco.com/touch-portal/entry.tp/schema",
    "sdk": 6,
    "version": iVersion.toString(16),
    "touchportal-dynamic-icons": VERSION,
    "name": "Touch Portal Dynamic Icons",
    "id": "Touch Portal Dynamic Icons",
    "plugin_start_cmd_mac":     DEV_MODE ? "" : "sh \"%TP_PLUGIN_FOLDER%\"touchportal-dynamic-icons/start.sh touchportal-dynamic-icons",
    "plugin_start_cmd_linux":     DEV_MODE ? "" : "sh \"%TP_PLUGIN_FOLDER%\"touchportal-dynamic-icons/start.sh touchportal-dynamic-icons",
    "plugin_start_cmd_windows": DEV_MODE ? "" : "\"%TP_PLUGIN_FOLDER%touchportal-dynamic-icons\\touchportal-dynamic-icons.exe\"",
    "configuration": {
        "colorDark": "#23272A",
        "colorLight": "#7289DA"
    },
    "settings": [
        {
            "name": "Default Icon Size",
            "type": "number",
            "default": "256",
            "minValue": 8,
            "maxValue": 1920, // arbitrary
            "readOnly": false
        }
    ],
    "categories": [
        {
            "id": "TP Dynamic Icons",
            "name": "Dynamic Icons",
            "imagepath": "%TP_PLUGIN_FOLDER%touchportal-dynamic-icons/tp-dynamic-icons.png",
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
    return makeActionData(idPrefix + "_name", "text", label);
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

function makeDrawStyleData(idPrefix, /* out */ data) {
    let i = data.length;
    const format = `Fill\nColor{${i++}}Stroke\nWidth (%){${i++}}${NBSP}\nColor{${i++}}Shadow Size\n(blur, offset X, Y){${i++}}${NBSP}\nColor{${i++}}`;
    const d = [
        makeActionData(idPrefix +  "_style_fillColor", "color", "Fill Color", "#00000000"),
        makeNumericData(idPrefix + "_style_line_width", "Stroke Width", 0, 0, 999999, true),
        makeActionData(idPrefix +  "_style_line_color", "color", "Stroke Color", "#00000000"),
        makeActionData(idPrefix +  "_style_shadow", "text", "Text", "0, 0, 0"),
        makeActionData(idPrefix +  "_style_shadowColor", "color", "Shadow Color", "#000000FF"),
    ];
    data.push(...d);
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
        "Border radius and stroke width values are in percentage of icon dimension. Up to 4 radii can be specified for each corner starting at top left (separate by space/comma).";
    let [format, data] = makeIconLayerCommonData(id);
    format += `Border\nRadius (%) {${data.length}}`;
    data.push(makeActionData("rect_radius", "text", "Border Radius", "0"));
    format += makeDrawStyleData("rect", data);
    addAction(id, name, descript, format, data);
}

function addTextAction(id, name) {
    const descript = "Dynamic Icons: " +
        `Generate or layer styled text. ${layerInfoText('text')}\n` +
        "Font is specified like the CSS 'font' shorthand property. Offset is percent of icon size, positive for right/down, negative for left/up. Stroke width is percentage of half the font size.";
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
        "File paths are relative to TP's 'plugins' folder (or use absolute paths).\n";
    let [format, data] = makeIconLayerCommonData(id);
    let i = data.length;
    format += `Image\nFile {${i++}}Resize\nFit {${i++}}`;
    data.push(
        makeActionData("image_src", "text", "Image Source"),
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

// Layered icon actions

function addStartLayersAction(id, name) {
    const descript = "Dynamic Icons: " + name + "\n" +
        "Start a new Layered Icon. Add elements(s) in following 'Draw' and 'Layer' action(s) and then use the 'Generate' action to produce the icon.";
    const format = "Icon Name {0} of size {1} (pixels)";
    const data = [
        makeIconNameData(id),
        makeActionData("icon_size", "text", "Icon Size", "256")
    ];
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
    const format = "Icon Named {0} {1}";
    const data = [
        makeIconNameData(id),
        makeChoiceData("icon_generate_action", "Action", ["Finalize & Render", "Finalize Only", "Render Only"]),
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
        "Elements which can be updated are anything with a single value like progress bar, series graph, or text. " +
        "Value type must match the element type (numeric/string), and may contain math and other evaluated expressions.\n" +
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

const fs = require('fs');
const path = require('path');
const outfile = path.join(OUTPUT_PATH, "/entry.tp");
fs.writeFileSync(outfile, output);
console.log("Wrote output to file:", outfile);
if (DEV_MODE) {
    console.warn("!!!=== Generated DEV MODE entry.tp file ===!!!");
    process.exit(1);  // exit with error to prevent accidental usage with build scripts.
}
process.exit(0);

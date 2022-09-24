#!/usr/bin/env node

// Generates entry.tp JSON file.
// usage: node gen_entry.js [-v <plugin.version.numbers>] [-o <output/path or - for stdout>] [-d]
// A version number is required; it may also be passed via npm_package_version env. variable.
// -d (dev mode) will exclude the plugin_start commands in the TP file, for running the binary separately.

// Defaults
var VERSION = "";
var OUTPUT_PATH = "base/TPDynamicIcons"
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
    "TPDynamicIcons": VERSION,
    "name": "Touch Portal Dynamic Icons",
    "id": "Touch Portal Dynamic Icons",
    "plugin_start_cmd_mac":     DEV_MODE ? "" : "sh \"%TP_PLUGIN_FOLDER%\"TPDynamicIcons/start.sh touchportal-dynamic-icons",
    "plugin_start_cmd_windows": DEV_MODE ? "" : "\"%TP_PLUGIN_FOLDER%TPDynamicIcons\\touchportal-dynamic-icons.exe\"",
    "configuration": {
        "colorDark": "#23272A",
        "colorLight": "#7289DA"
    },
    "settings": [],
    "categories": [
        {
            "id": "TP Dynamic Icons",
            "name": "Dynamic Icons",
            "imagepath": "%TP_PLUGIN_FOLDER%TPDynamicIcons/tp-dynamic-icons.png",
            "actions": [],
            "connectors": [],
            "states": [],
            "events": []
        }
    ]
};

// Other constants
const ID_PREFIX = "dynamic_icons_";
const category = entry_base.categories[0];

const TRANSFORM_OPERATIONS = ['O', 'R', 'SC', 'SK'];

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

function addAction(id, name, descript, format, data, hold = false) {
    const action = {
        "id": id,
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

function makeIconNameData(label = "Icon Name") {
    return makeActionData("icon_name", "text", label);
}

// for image overlay actions

function addTransformOrderData(dataIdx, opsList, /* out */ format, /* out */ data, imgNum = "") {
    if (!opsList.length)
        return;
    const f = opsList.length > 1 ? `Order {${dataIdx}}` : "";
    let d = makeActionData(`overlay_img${imgNum}_txorder`, opsList.length > 1 ? "choice" : "text", `Transform Order`);
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

    format.push(f);
    data.push(d);
}

// TODO: possibly simplify if addImageStackAction() (below) is removed
function addTransformOp(type, dataIdx, /* out */ format, /* out */ data, imgNum = "") {
    let f = ` \n{0} {${dataIdx}}`;
    let d = makeActionData(`overlay_img${imgNum}_`, "text", `Image ${imgNum} `, "0 : 0");
    switch (type) {
        case "R":
            f = f.format("Rotate");
            d.id += "rot";
            d.label += "Rotation Value";
            d.default = "0";
            break;
        case "O":
            f = f.format("Offset");
            d.id += "trs";
            d.label += "Offset Value";
            break;
        case "SC":
            f = f.format("Scale");
            d.id += "scl";
            d.label += "Scale Value";
            d.default = "100 : 100";
            break;
        case "SK":
            f = f.format("Skew");
            d.id += "skw";
            d.label += "Skew Value";
            break;
        default:
            return;
    }
    format.push(f);
    data.push(d);
}

function makeTransformationData(startIndex, withTxOrder = true) {
    const format = [];
    const data = [];
    for (const op of TRANSFORM_OPERATIONS)
        addTransformOp(op, startIndex++, format, data);
    if (withTxOrder)
        addTransformOrderData(startIndex++, TRANSFORM_OPERATIONS, format, data);
    return [ format.join(" "), data ];
}

// --------------------------------------
// Action creation functions

// TODO: possibly remove
function addImageStackAction(id, name, numImgs, ops = TRANSFORM_OPERATIONS.slice(0, 3), includeOpsField = true) {
    const descript =
        `Create a composite icon from up to ${numImgs} images with optional transformation(s) applied to each one. ` +
        "File paths are relative to TP's 'plugins' folder (or use absolute paths). \n" +
        "Transformation values are percentages where 100% is one full rotation or icon dimension, positive for CW/right/down, negative for CCW/left/up. Negative scaling flips images." +
        "Values can include math operators and JavaScript Math functions.";
    let format = [        // use an array so we can pass by reference to helper function
        "Icon\nName {0}",
        "Size {1}"
    ];
    let data = [
        makeIconNameData(),
        makeActionData("icon_size", "text", "Icon Size", "256")
    ];
    let arg = 2;
    for (let i = 0; i < numImgs; ++i) {
        format.push(`Image ${i + 1}\nFile {${arg++}}`);
        data.push(makeActionData(`overlay_img${i + 1}_src`, "text", `Image ${i + 1} Source`))
        for (const op of ops)
            addTransformOp(op, arg++, format, data, i+1);
        if (includeOpsField)
            addTransformOrderData(arg++, ops, format, data, i+1);
    }
    addAction(ID_PREFIX + id, name, descript, format.join(" "), data, false);
}

function addImageStackStartAction(id, name) {
    const descript = "Dynamic Icons: \n" +
        "Start a new dynamic image icon. Add image(s) in following 'Add Image' action(s) and then use the 'Generate' action to produce the icon.";
    let format = "Icon Name {0} of size (px) {1}";
    const data = [
        makeIconNameData(),
        makeActionData("icon_size", "text", "Icon Size", "256"),
    ];
    addAction(ID_PREFIX + id, name, descript, format, data);
}

function addImageStackImageAction(id, name, withIndex = false, withTransform = true) {
    const descript = "Dynamic Icons: " +
        (withIndex ? "Replace (or append) an image at specified position in" : "Add an image to") +
        " a named icon, with optional transformation(s) applied. Icon with same Name must first be created with a 'Start New' action. " +
        "File paths are relative to TP's 'plugins' folder (or use absolute paths). \n" +
        "Transformation values are percentages where 100% is one full rotation or icon dimension, positive for CW/right/down, negative for CCW/left/up. Negative scaling flips images." +
        "Values can include math operators and JavaScript Math functions.";
    let format = "Icon\nName {0}";
    let data = [ makeIconNameData() ];
    let dataIdx = 1;
    if (withIndex) {
        format += ` Replace\nImage # {${dataIdx++}}`;
        data.push(makeNumericData("replace_index", "Image Index", 1, 1, 99, false));
    }
    format += `Image\nFile {${dataIdx++}} Resize {${dataIdx++}}`;
    data.push(makeActionData("overlay_img_src", "text", "Image Source"));
    data.push(makeChoiceData("overlay_img_fit", "Image Source", ["contain", "cover", "fill", "scale-down", "none"]));
    if (withTransform) {
        const [txFrmt, txData] = makeTransformationData(dataIdx, true);
        format += txFrmt;
        data.push(...txData);
    }
    addAction(ID_PREFIX + id, name, descript, format, data, false);
}

function addImageStackRenderAction(id, name) {
    const descript = "Dynamic Icons:\n" +
        "Generate dynamic image icon which has been created using preceding 'Start New' and 'Add Image' actions using the same Icon Name.";
    const format = "Generate Icon Named {0}";
    const data = [ makeIconNameData() ];
    addAction(ID_PREFIX + id, name, descript, format, data);
}

function addRoundGauge(id, name) {
    const descript = "Dynamic Icons: Create a Simple Round Gauge";
    const format = "Gauge Name {0} with shadow {1} of color {2} using indicator color {3} with highlight {4} starting at degree {5} at value {6} with cap style {7} on background color {8} in direction {9}";
    const data = [
        makeIconNameData(),
        makeChoiceData("gauge_shadow", "Gauge Shadow", ["On", "Off"]),
        makeActionData("gauge_shadow_color", "color", "Gauge Shadow Color", "#282828FF"),
        makeActionData("gauge_color", "color", "Gauge Color", "#FFA500FF"),
        makeChoiceData("gauge_highlight", "Gauge Highlight", ["On", "Off"]),
        makeNumericData("gauge_start_degree", "Gauge Start Degree", 180, 0, 360),
        makeActionData("gauge_value", "text", "Gauge Value", "0"),
        makeChoiceData("gauge_cap", "Gauge Icon Cap Type", ["round", "butt", "square"]),
        makeActionData("gauge_background_color", "color", "Gauge Background Color", "#000000FF"),
        makeChoiceData("gauge_counterclockwise", "Gauge Direction", ["Clockwise", "Counter Clockwise"]),
    ];
    addAction(id, name, descript, format, data, true);
}

function addBarGraph(id, name) {
    const descript = "Dynamic Icons: Create a Simple Bar Graph";
    const format = "Graph Name {0} with background {1} of color {2} using bar color {3} add value {4} with bar width {5}";
    const data = [
        makeIconNameData(),
        makeChoiceData("bar_graph_backround", "Bar Graph Background", ["On", "Off"]),
        makeActionData("bar_graph_backround_color", "color", "Bar Graph Background Color", "#FFFFFFFF"),
        makeActionData("bar_graph_color", "color", "Bar Graph Color", "#FFA500FF"),
        makeActionData("bar_graph_value", "text", "Bar Graph Value", "0"),
        makeNumericData("bar_graph_width", "Bar Graph Width", 10, 1, 256, false),
    ];
    addAction(id, name, descript, format, data, true);
}

function addSystemActions() {
    addAction(ID_PREFIX + "control_command", "System Actions", "", "Perform Action: {0}", [
        makeChoiceData("control_command_action", "Action to Perform", ["Clear the Source Image Cache"], "")
    ]);
}

// ------------------------
// Build the full entry.tp object for JSON dump

// Add all our icon generator actions
addRoundGauge("generate_simple_round_gauge", "Simple Round Gauge");
addBarGraph("generate_simple_bar_graph", "Simple Bar Graph");

addImageStackStartAction("new_image_stack", "Image Stack Icon - Start New");
addImageStackImageAction("add_image", "Image Stack Icon - Add Image");
addImageStackImageAction("replace_image", "Image Stack Icon - Replace Image", true);
addImageStackRenderAction("render_image_stack", "Image Stack Icon - Generate");

// Variations of the image stack actions so user can pick the simplest one they need.
// These could be probably be consolidated if/when TP supports breaking up long actions into multiple lines since the long ones will be less awkward to use.
addImageStackAction("generate_image_stack_rot_2",   "Rotated Image Stack (2 Images)",     2, ['R']);
addImageStackAction("generate_image_stack_rot_4",   "Rotated Image Stack (4 Images)",     4, ['R']);
addImageStackAction("generate_image_stack_rot_6",   "Rotated Image Stack (6 Images)",     6, ['R']);
addImageStackAction("generate_image_stack_trs_2",   "Offset Image Stack (2 Images)",      2, ['O']);
addImageStackAction("generate_image_stack_trs_4",   "Offset Image Stack (4 Images)",      4, ['O']);
addImageStackAction("generate_image_stack_scl_3",   "Scaled Image Stack (3 Images)",      3, ['SC']);
addImageStackAction("generate_image_stack_xform_2", "Transformed Image Stack (2 Images)", 2);
addImageStackAction("generate_image_stack_xform_4", "Transformed Image Stack (4 Images)", 4);
addImageStackAction("generate_image_stack_xform_6", "Transformed Image Stack (6 Images)", 6);
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

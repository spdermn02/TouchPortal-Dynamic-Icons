/*
This script runs typedoc to build reference docs (into "html" subfolder, by default)
and definitions for dts-bundle-generator (into "dist" subfolder),
which is then also executed. That bundle output is cleaned up with a bunch of replacements
and the result written out to "dynamic-icons.d.ts" which is suitable for
referencing in custom drawing scripts (eg. with "triple slash directive").
A bit convoluted really, but "best" workflow I've found so far with least manual intervention.

usage: node doc/build.js [-dts <path_to_defintions_output>] [-html <path_to_html_output>

By default the final definitions file is placed in the same folder as the HTML documentation (for download)
but this can be overridden with the `-dts` option.

Running the generators requires the following modules which are _not_ installed with this project by default:

    "dts-bundle-generator": "^9.5.0",
    "typedoc": "^0.2.0"

Install them manually, either globally or as a temporary package dev dependency.
*/


const
    fs = require("fs"),
    path = require("path"),
    process = require("process"),
    { execSync } = require("child_process")
;

process.env.NPM_CONFIG_UPDATE_NOTIFIER = "false";

const ROOT = "./doc",
    IN_DTS = "dts-definitions.d.ts",
    OUT_DTS = "dynamic-icons.d.ts";

// options
var
    HTML_OUT_PATH = path.join(ROOT, 'html'),
    DTS_OUT_PATH = "",
    runDocs = true,
    runDefs = true;
;

// Handle CLI arguments
for (let i=2; i < process.argv.length; ++i) {
    const arg = process.argv[i];
    if      (arg == "-dts")  DTS_OUT_PATH = process.argv[++i];
    else if (arg == "-html") HTML_OUT_PATH = process.argv[++i];
    else if (arg == "-nodoc") runDocs = false;
    else if (arg == "-nodef") runDefs = false;
}

if (!DTS_OUT_PATH)
    DTS_OUT_PATH = HTML_OUT_PATH;

// run doc generator
if (runDocs) {
    execSync(`npx typedoc --options ${ROOT}/typedoc.json --logLevel Error --html ${HTML_OUT_PATH}`);
    console.info("Finished generating documentation.");
}

if (!runDefs)
    return;

// run bundle generator
execSync(`npx dts-bundle-generator --config ${ROOT}/dts-bundle.json`);

// clean up/modify generated bundle
dts = fs.readFileSync(path.join(ROOT, IN_DTS), 'utf-8');
dts = dts.replace(/\$1/g, "");
dts = dts.replace(/ as [A-Z]\w+/g, "");
dts = dts.replace(/ as (?:loadImage(?:Data)?|sharp)/g, "");
dts = dts.replace("import { EventEmitter } from 'stream';\n", "");
dts = dts.replace("import sharp from 'sharp';\n", "");
dts = dts.replace(/declare module "skia-canvas" {\n\t(.+?)^}/ms, "export $1");
// exclude default lib.dom.d.ts definitions for consumers so that our Canvas definitions override them
dts = `/// <reference no-default-lib="true"/>
/// <reference lib="es2022" />
/// <reference types="node" />

` + dts;

fs.writeFileSync(path.join(DTS_OUT_PATH, OUT_DTS), dts, 'utf-8');
console.info("Wrote definitions output to %s", path.join(DTS_OUT_PATH, OUT_DTS));

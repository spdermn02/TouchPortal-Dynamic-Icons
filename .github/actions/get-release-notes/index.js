
const fs = require('fs')
const readline = require('readline')

module.exports = extractReleaseNotes;

var core = null;
if (process.env["GITHUB_ACTIONS"]) {
    try { core = require('@actions/core'); }
    catch(e) {
        try {
            require("child_process").execSync("npm install --no-audit --silent @actions/core")
            core = require('@actions/core');
        }
        catch {
            console.error("Couldn't load @actions/core!", e);
            process.exit(1);
        }
    }
}

const DEBUG = true;

const debug = function (...args) {
    if (core)
        core.debug(...args);
    else if (DEBUG)
        console.debug(...args);
}

async function extractReleaseNotes(changelog, tag, order_asc)
{
    const findLatest = tag == "latest",
        vlineRegEx = /^## .*/,
        tagRegEx = findLatest ? vlineRegEx : new RegExp("^## .*" + tag.replace(/[+.-]/g, '\\$&'));

    let heading = "",
        capture = false,
        lines = [];

    const rli = readline.createInterface({
        input: fs.createReadStream(changelog, {encoding: 'utf8'})
    });

    for await (const line of rli) {
        if (capture) {
            if (!vlineRegEx.test(line)) {
                lines.push(line);
                continue;
            }
            if (!order_asc)
                break;
            capture = false;
        }
        if (tagRegEx.test(line)) {
            heading = line.replace(/^## /, '').trim();
            capture = true;
            if (findLatest && order_asc)
                lines = [];
        }
    }

    return { heading: heading, releaseNotes: lines.join('\n').trim() };
}

function writeToFile(outfile, text) {
    if (outfile == "-") {
        console.log(text);
        return;
    }

    debug(`writing output file: '${outfile}'`);
    fs.writeFile(
        outfile,
        text,
        { encoding: 'utf8' },
        (err) => { if (err) throw err }
    );
}

main().catch((err) => {
    if (core)
        core.setFailed(err.message);
    else
        console.error(err);
})

async function main()
{
    let tag = "latest",
        changelog = "./CHANGELOG.md",
        order_asc = false,
        fallback = false,
        output = "-";

    if (core) {
        tag = core.getInput('version_tag', {required: true});
        changelog = core.getInput('changelog_file', {required: true});
        order_asc = core.getBooleanInput('changelog_ascending');
        fallback = core.getBooleanInput('fallback_to_latest');
        output = core.getInput('output_file');
    }
    else {
        // Handle CLI arguments
        for (let i=2; i < process.argv.length; ++i) {
            const arg = process.argv[i];
            if      (arg == "-v") tag = process.argv[++i];
            else if (arg == "-c") changelog = process.argv[++i];
            else if (arg == "-o") output = process.argv[++i];
            else if (arg == "-a") order_asc = true;
            else if (arg == "-f") fallback = true;
        }
    }

    debug(`<< version_tag = '${tag}'`);
    debug(`<< changelog_file = '${changelog}'`);
    debug(`<< changelog_ascending = '${order_asc}'`);
    debug(`<< fallback_to_latest = '${fallback}'`);
    debug(`<< output_file = '${output}'`);

    let {heading, releaseNotes} = await extractReleaseNotes(changelog, tag, order_asc);
    if (!heading && fallback && tag !== "latest") {
        debug("Tagged release notes not found, falling back to latest version.");
        ({heading, releaseNotes} = await extractReleaseNotes(changelog, "latest", order_asc));
    }

    debug(`>> release_title = '${heading}'`);
    debug(`>> release_notes = '${releaseNotes}'`);

    if (output)
        writeToFile(output, heading + "\n\n" + releaseNotes);

    if (core) {
        core.setOutput("release_title", heading);
        core.setOutput("release_notes", releaseNotes);
    }
}

const AdmZip = require("adm-zip");
const path  = require("path");
const fs = require("fs");
const fse = require("fs-extra")
const pkg = require("pkg");
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"))
const process = require("process");
const { execSync } = require("child_process");

const BASE_SRC = "./base";  // source folder for icons and other meta data

// use CLI -p argument to override build target platform(s)
// "win32", "darwin", "darwin-x64", "linux"
var targetPlatform = [ process.platform ]

// clean up temp staging files after build
var cleanStagedFiles = true

// Handle CLI arguments
for (let i=2; i < process.argv.length; ++i) {
    const arg = process.argv[i];
    if      (arg == "-p") targetPlatform = process.argv[++i].split(',');
    else if (arg == "-nc") cleanStagedFiles = false;
}

const build = async(platform) =>
{
    let arch = process.arch;
    if (platform.indexOf('-') > -1)
        [ platform, arch ] = platform.split('-', 2);
    platform = platform.toLowerCase();
    arch = arch.toLowerCase();

    const STAGING = `${BASE_SRC}/${platform}`  // temporary package build destination

    // Remove staging directory in case of leftovers, then (re)create it.
    if( fs.existsSync(STAGING) )
      fs.rmSync(STAGING, { recursive : true})
    fs.mkdirSync(STAGING)

    // copy all icons
    const icons = fs.readdirSync(`${BASE_SRC}/icons`).filter(fn => fn.endsWith('.png'))
    icons.forEach(fn => copyFileSync(`${BASE_SRC}/icons/${fn}`, `${STAGING}/icons`));
    // copy config file
    copyFileSync(`${BASE_SRC}/plugin-config.json`, STAGING)

    // Platform-specific packaging

    let osName;
    let pkgTarget = platform;
    let execName = packageJson.name

    if (platform == "win32" ) {
        osName = 'Windows'
        pkgTarget = "win"
        execName += ".exe"
    }
    else if (platform == "darwin") {
        osName = 'macOS'
        pkgTarget = "macos"
    }
    else if (platform == "linux") {
        osName = 'Linux'
    }
    else {
        console.error("Can't handle platform " + platform)
        process.exit(1)
    }

    if (platform == "win32") {
        // We need to copy updated MSVC runtime DLLs into the skia-canvas binary directory to avoid TP's outdated versions being loaded (which crashes the plugin)
        copyFiles("c:/Windows/System32", "./node_modules/skia-canvas/lib/v8", ["msvcp140.dll", "vcruntime140.dll", "vcruntime140_1.dll"])
    }
    else {
        // Copy the startup script
        copyFileSync(`${BASE_SRC}/start.sh`, STAGING)
    }

    // check for x-platform build
    if (platform != process.platform || arch != process.arch) {
        console.log(`Building on ${process.platform} ${process.arch}; Installing sharp for ${platform} ${arch}`)
        execSync(`npm install --os=${platform} --cpu=${arch} sharp`)
    }

    console.log("Generating entry.tp")
    execSync(`node ./builders/gen_entry.js -o "${STAGING}"`)

    console.log("Running pkg")
    await pkg.exec([
        "--targets", `${packageJson.config.nodeTarget}-${pkgTarget}-${arch}`,
        "--output",  `${STAGING}/${execName}`,
        //   "--debug",
        ".",
    ]);

    // Set the output archive .tpp name.
    const packageName = path.normalize(`./Installers/${packageJson.name}-${osName}-${arch}-${packageJson.version}.tpp`)

    console.log(`Creating zip file '${packageName}'`)
    const zip = new AdmZip()
    zip.addLocalFolder(
      path.normalize(STAGING),
      packageJson.name
    );

    zip.writeZip(packageName)

    if (cleanStagedFiles) {
        console.log("Cleaning Up")
        fs.rmSync(STAGING, { recursive : true})
    }
}

const cleanInstallers  = () => {
    try {
      fs.rmSync('./Installers/', { recursive : true })
      fs.mkdirSync('./Installers/')
    } catch (err) {
      console.error(err);
    }
}

const copyFileSync = function(filePath, destDir) {
    return fse.copySync(filePath, path.join(destDir, path.basename(filePath)))
}

function copyFiles(srcDir, destDir, files) {
    files.map((f) =>
        fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f))
    );
}

const executeBuilds = function() {
    // cleanInstallers()
    targetPlatform.forEach(
       p => build(p)
    )
}

executeBuilds();

const AdmZip = require("adm-zip");
const path  = require("path");
const fs = require("fs");
const fse = require("fs-extra")
const pkg = require("pkg");
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"))
const { exit } = require("process");
const { execSync } = require("child_process");

// sharp/vips library path constants
const SHARP_ROOT = "./node_modules/sharp"
const SHARP_BUILD = SHARP_ROOT + "/build/Release"

// use CLI -p argument to override build target platforms
var targetPlatform = ["Windows", "MacOS", "Linux"]

// Handle CLI arguments
for (let i=2; i < process.argv.length; ++i) {
    const arg = process.argv[i];
    if (arg == "-p") targetPlatform = process.argv[++i].split(',');
}

const build = async(platform, options ) => {
    if( fs.existsSync(`./base/${platform}`) ) {
      fs.rmSync(`./base/${platform}`, { recursive : true})
    }
    fs.mkdirSync(`./base/${platform}`)
    fs.copyFileSync("./base/plugin_icon.png", `./base/${platform}/${packageJson.name}.png`)

    let osTarget = platform.toLowerCase()
    let sharpPlatform = osTarget
    let execName = packageJson.name
    let libvipsSrcPath = SHARP_BUILD
    let libvipsDestPath = `./base/${platform}/`

    if (platform.toLowerCase() == "windows" ) {
        osTarget = "win"
        sharpPlatform = "win32"
        execName += ".exe"
        libvipsDestPath += `${SHARP_BUILD}/`
    }
    else if (platform.toLowerCase() == "macos") {
        sharpPlatform = 'darwin'
    }
    // MacOS-Arm64 ?
    else if (platform.toLowerCase() != "linux") {
        console.error("Can't handle platform " + platform)
        exit(1)
    }

    if (platform.toLowerCase() != "windows" )  {
        const vendorLibDir = fs.readdirSync(`${SHARP_ROOT}/vendor/`, { recursive: false, withFileTypes: false } ).filter(fn => /^\d+\.\d+\.\d+$/.test(fn)).at(-1)
        if (!vendorLibDir) {
            console.error("Could not locate sharp vendor lib version/directory in " + `${SHARP_ROOT}/vendor/`)
            exit(1)
        }
        console.log(`Found sharp lib vendor v${vendorLibDir}`)
        libvipsSrcPath = `${SHARP_ROOT}/vendor/${vendorLibDir}/${sharpPlatform}-x64/lib`
        fs.copyFileSync("./base/start.sh", `./base/${platform}/start.sh`)
    }

    console.log(`Making sure sharp is built for ${platform} x64`)
    execSync(`npm rebuild --platform=${sharpPlatform} --arch=x64 sharp`)
    const libs = fs.readdirSync(libvipsSrcPath).filter(fn => fn.startsWith('lib'))
    libs.forEach(fn => copyFileSync(`${libvipsSrcPath}/${fn}`, libvipsDestPath));
    copyFileSync(`${SHARP_BUILD}/sharp-${sharpPlatform}-x64.node`, `./base/${platform}/${SHARP_BUILD}/`)

    console.log("Generating entry.tp")
    execSync(`node ./builders/gen_entry.js -v ${packageJson.version} -o ./base/${platform}`)

    console.log("Running pkg")
    await pkg.exec([
      "--targets",
      `${packageJson.config.nodeTarget}-${osTarget}-x64`,
      "--output",
      `base/${platform}/${execName}`,
      ".",
    ]);

    let platform_arch = platform
    if(options?.type)
        platform_arch += `-${options.type}`
    const packageName = path.normalize(`./Installers/${packageJson.name}-${platform_arch}-${packageJson.version}.tpp`)

    console.log(`Creating zip file '${packageName}'`)
    const zip = new AdmZip()
    zip.addLocalFolder(
      path.normalize(`./base/${platform}/`),
      packageJson.name
    );

    zip.writeZip(packageName)

    console.log("Cleaning Up")
    fs.rmSync(`./base/${platform}`, { recursive : true})
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

const executeBuilds = function() {
    // cleanInstallers()
    targetPlatform.forEach(
       p => build(p)
    )
}

executeBuilds();

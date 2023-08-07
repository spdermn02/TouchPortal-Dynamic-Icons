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
const SHARP_VENDOR_V = "8.12.2"

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

    if (platform == "Windows" ) {
        osTarget = "win"
        sharpPlatform = "win32"
        execName += ".exe"
        libvipsDestPath += `${SHARP_BUILD}/`
    }
    else if (platform == "MacOS") {
        sharpPlatform = 'darwin'
    }
    else if (platform == "MacOS-Arm64") {
        console.error("Can't handle platform " + platform)
        exit(1)
    }

    if (platform != "Windows" )  {
        libvipsSrcPath = `${SHARP_ROOT}/vendor/${SHARP_VENDOR_V}/${sharpPlatform}-x64/lib`
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

    console.log("Running Zip File Creation")
    const zip = new AdmZip()
    zip.addLocalFolder(
      path.normalize(`./base/${platform}/`),
      packageJson.name
    );

    let packageName = `./Installers/${packageJson.name}-${platform}-${packageJson.version}.tpp`
    if( options?.type !== undefined ) {
      packageName = `./Installers/${packageJson.name}-${platform}-${options.type}-${packageJson.version}.tpp`
    }

    zip.writeZip(path.normalize(packageName))

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

const executeBuilds= async () => {
    cleanInstallers()
    await build("Windows")
    await build("MacOS")
    await build("Linux")
}

executeBuilds();

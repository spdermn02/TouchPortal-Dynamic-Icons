const AdmZip = require("adm-zip");
const path  = require("path");
const fs = require("fs");
const fse = require("fs-extra")
const pkg = require("pkg");
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"))
const { exit } = require("process");
const { exec, execSync } = require("child_process");

const build = async(platform, options ) => {
    if( fs.existsSync(`./base/${platform}`) ) {
      fs.rmSync(`./base/${platform}`, { recursive : true})
    }
    fs.mkdirSync(`./base/${platform}`)
    fs.copyFileSync("./base/plugin_icon.png", `./base/${platform}/${packageJson.name}.png`)
    
    let nodeVersion = 'node16-win-x64'
    let execName = `${packageJson.name}.exe`

    if( platform != "Windows" ) {
        execName = packageJson.name
        fs.copyFileSync("./base/start.sh", `./base/${platform}/start.sh`)
    }
    else {
      console.log("Making sure sharp is built for Windows")
      execSync('npm rebuild --platform=win32 --arch=x64 sharp')
    }

    if( platform == "MacOS") {
        nodeVersion = 'node16-macos-x64'
        console.log("Making sure sharp is built for MacOs x64")
        execSync('npm rebuild --platform=darwin --arch=x64 sharp')
    }
    if( platform == "MacOS-Arm64") {
        nodeVersion = '???'
    }
    if( platform == "Linux") {
        nodeVersion = 'node16-linux-x64'
        console.log("Making sure sharp is built for Linux x64")
        execSync('npm rebuild --platform=linux --arch=x64 sharp')
    }

    fse.copySync("./node_modules/sharp/build/Release", `./base/${platform}/node_modules/sharp/build/Release`)

    console.log("Generating entry.tp")
    execSync(`node ./builders/gen_entry.js -v ${packageJson.version} -o ./base/${platform}`)

    console.log("Running pkg")
    await pkg.exec([
      "--targets",
      nodeVersion,
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

const executeBuilds= async () => {
    cleanInstallers()
    await build("Windows")
    await build("MacOS")
    await build("Linux")
}

executeBuilds();
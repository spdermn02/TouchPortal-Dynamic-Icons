#!/bin/sh

# Usage: build.sh <win|mac> [plugin.version.number]
# version number may also be in npm_package_version env. var
# set build_keep_bin env. var to "1" to keep the produced binary after archiving it

target=$1
version=$2

base_dir="base"
plugin_name="TPDynamicIcons"
folder="${base_dir}/${plugin_name}"
executable="touchportal-dynamic-icons"
platform="MacOS"
npm_pkg_os="mac"
zip_args=""
version_sfx=""

if [ ! "$version" -a -n "$npm_package_version" ]; then version=${npm_package_version}; fi
if [ "$version" ]; then version_sfx="-v${version}"; fi

if [ target = "win32" ]; then
    executable="${executable}.exe"
    platform="Windows"
    npm_pkg_os="win"
    zip_args="-x *.sh"
fi

tppfile="Installers/${plugin_name}-${platform}${version_sfx}.tpp"

echo "=== Generating entry.tp ==="
node ./builders/gen_entry.js -v ${version} -o ${folder}

echo "=== Running TypeScript compilation ==="
npm run tsc

echo "=== Building $executable for $target ==="
npm run pkg-${npm_pkg_os}

echo "=== Moving %executable% to ${folder} ==="
mv ${executable} ${folder}

# Copy "sharp" library dependencies.
# Note that npm pkg warns of two node_modules/sharp folders to copy (build/Release and vendor/lib),
#   but seems only one is required (the latter folder doesn't even exist).
# To build for Windows on Mac, must have it installed as additional platform:
# npm rebuild --platform=windows --arch=x64 sharp
echo "=== Copying Sharp library files to ${folder} ==="
cp -r node_modules/sharp/build/Release ${folder}/node_modules/sharp/build/Release

echo "=== Cleanup old $tppfile file"
rm -rf  ${tppfile}

echo "=== Zipping up plugin ==="
zip -r ${zip_args} ${tppfile} ./${base_dir}/*

echo "=== Cleanup build process ==="
rm -rf ${folder}/node_modules
if [ "$build_keep_bin" != "1" ]; then rm -f ${folder}/${executable}; fi

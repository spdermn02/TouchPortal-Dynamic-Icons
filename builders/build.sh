#!/bin/sh

folder="TPDynamicIcons"
executable="touchportal-dynamic-icons"
target=$1

npm run tsc

#windows build
if target=="win32" then
    echo "Building ${executable}.exe for $target"
    npm run pkg-win

    echo "Moving ${executable}.exe to base/${folder}"
    mv ${executable}.exe base/${folder}

    echo "echo Cleanup old ${folder}-Windows.tpp files"
    rm Installers/${folder}-Windows.tpp 

    cd base 

    echo "Zipping up plugin"
    zip -r ../Installers/${folder}-Windows.tpp ${folder}

    echo "Cleanup build process"
    rm -rf ${folder}/*.sh ${folder}/${executable}
fi

#mac build
if target=="mac" then
    echo "Building ${executable} for $target"
    npm run pkg-mac

    echo "Moving ${executable} to base/${folder}"
    mv ${executable} base/${folder}

    echo "echo Cleanup old ${folder}-MacOs.tpp files"
    rm -rf Installers/${folder}-MacOs.tpp

    cd base 

    echo "Pulling in start.sh for plugin startup to work"
    cp start.sh ${folder}

    echo "Zipping up plugin"
    zip -r ../Installers/${folder}-MacOs.tpp ${folder}

    echo "Cleanup build process"
    rm -rf ${folder}/*.sh ${folder}/${executable}
fi

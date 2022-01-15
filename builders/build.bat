@echo off

SET folder=TPDynamicIcons
SET executable=touchportal-dynamic-icons
SET target=%1

CMD /C npm run tsc

if %target% == win32 (
    echo Building %executable%.exe for %target%
    npm run pkg-win

    echo Moving %executable%.exe to base/%folder%
    move %executable%.exe  base\%folder%

    echo Cleanup old %folder%-Windows.tpp files
    del Installers\%folder%-Windows.tpp 

    cd base 

    echo Zipping up plugin
    7z a -tzip ../Installers/%folder%-Windows.tpp %folder% 

    echo Cleanup build process
    erase /Q %folder%\%executable%.exe
)

if %target% == mac (
    echo Building %executable% for %target%
    npm run pkg-mac

    echo Moving %executable% to base/%folder%
    move %executable%  base/%folder% 

    echo Cleanup old %folder%-MacOs.tpp files
    del Installers\%folder%-MacOs.tpp 

    cd base 

    echo Pulling in start.sh for plugin startup to work
    copy start.sh %folder%

    echo Zipping up plugin
    7z a -tzip ../Installers/%folder%-MacOS.tpp %folder% 

    echo Cleanup build process
    erase /Q %folder%\*.sh %folder%\%executable% 
)

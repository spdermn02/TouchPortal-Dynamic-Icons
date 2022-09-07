@echo off

:: Usage: build.bat <win|mac> [plugin.version.number]
:: version number may also be in npm_package_version env. var
:: set build_keep_bin env. var to "1" to keep the produced binary after archiving it

SET target=%1
SET version=%2

SET base_dir=base
SET plugin_name=TPDynamicIcons
SET folder=%base_dir%\%plugin_name%
SET executable=touchportal-dynamic-icons
SET platform=MacOS
SET npm_pkg_os=mac
SET zip_args=
SET version_sfx=

if "%version%"=="" SET version=%npm_package_version%
if not "%version%"=="" SET version_sfx=-v%version%

if "%target%" == "win32" (
    SET executable=%executable%.exe
    SET platform=Windows
    SET npm_pkg_os=win
    SET zip_args=-xr!*.sh
)

SET tppfile=Installers\%plugin_name%-%platform%%version_sfx%.tpp

echo === Generating entry.tp ===
CMD /C node ./builders/gen_entry.js -v %version% -o %folder%

echo;
echo === Running TypeScript compilation ===
CMD /C npm run tsc

echo === Building %executable% for %target% ===
CMD /C npm run pkg-%npm_pkg_os%

echo;
echo === Moving %executable% to %folder% ===
move %executable% %folder%

:: Copy "sharp" library dependencies.
:: Note that npm pkg warns of two node_modules/sharp folders to copy (build/Release and vendor/lib),
::   but seems only one is required (the latter folder doesn't even exist).
:: To build for Mac on Windows, must have it installed as additional platform:
:: npm rebuild --platform=darwin --arch=x64 sharp
echo;
echo === Copying Sharp library files to %folder% ===
xcopy /Y /I /R node_modules\sharp\build\Release %folder%\node_modules\sharp\build\Release

echo;
echo === Cleanup old %tppfile% file ===
del %tppfile%

echo;
echo === Zipping up plugin ===
CMD /C "%PROGRAMFILES%\7-Zip\7z" a -tzip %tppfile% .\%base_dir%\* %zip_args%

echo;
echo === Cleanup build process ===
rd /S /Q %folder%\node_modules
if not "%build_keep_bin%"=="1" del /Q %folder%\%executable%

echo;
echo === Build finished. ===

import { SizeType } from "./modules/geometry";

// hackish way to share the TPClient "logger" with other modules
export var logIt: Function = console.log;
export function setCommonLogger(logger: Function) {
    logIt = logger;
}

// Runtime options.
export const PluginSettings = {
    // these can be changed in TP Settings
    defaultIconSize: <SizeType> { width: 256, height: 256 },
    defaultGpuRendering: <boolean> true,
    defaultOutputCompressionLevel: <number> 4,  // MP: 4 seems to give the highest effective compression in my tests, no gains with higher levels but does slow down.
};

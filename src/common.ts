import { SizeType } from "./modules/geometry";

export var TPClient: any = null;
export function setTPClient(client: Object) {
    TPClient = client;
}

// Runtime options.
export const PluginSettings = {
    // these can be changed in TP Settings
    defaultIconSize: <SizeType> { width: 128, height: 128 },
    defaultGpuRendering: <boolean> false,
    defaultOutputCompressionLevel: <number> 4,  // MP: 4 seems to give the highest effective compression in my tests, no gains with higher levels but does slow down.
    imageFilesBasePath: <string> ''
};

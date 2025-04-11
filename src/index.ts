import TP from 'touchportal-api'
import * as C from './utils/consts'
import { ColorUpdateType } from './modules/enums';
import type { TpActionDataArrayType } from './modules/types'
import type { IColorElement, ILayerElement, IValuedElement } from './modules/interfaces';
import { Point, type PointType, Size } from './modules/geometry';
import { DynamicIcon, ParseState, globalImageCache } from "./modules";
import * as LE from "./modules/elements";
import { ConsoleEndpoint, Logger, logging , LogLevel } from './modules/logging';
import { setTPClient, PluginSettings } from './common'
import { qualifyFilepath, parseIntOrDefault, /* parseBoolOrDefault, */ clamp } from './utils/helpers'
import './utils/extensions'
import { dirname as pdirname, extname as pathExtName, resolve as presolve } from 'path';
import { concurrency as sharp_concurrency } from 'sharp';
const { version: pluginVersion } = require('../package.json');  // 'import' causes lint error in VSCode

// -------------------------------
// Constants

// Try find the path we're executing from -- if packaged then it's the exec path, otherwise default to CWD which should be the package root.
const EXEC_BASE_PATH = !!process["pkg"] ? pdirname(process.execPath) : process.cwd();

// Where we'd find the logging config file if there is one.
const CONFIG_FILEPATH = presolve(EXEC_BASE_PATH, "plugin-config.json");

// Default image base directory to TP's config folder for current user.
// This is used to resolve relative paths when loading images, via the ImageCache.cacheOptions.baseImagePath setting.
// User can override this with the "Default Image Files Path" plugin setting in TP.
// NOTE: this only works when the plugin binary is run from its normal install location in TPs config folder.
// If there's a better x-platform way to find TPs config path, then fixme.
const DEFAULT_IMAGE_FILE_BASE_PATH = presolve(EXEC_BASE_PATH, '..', '..');

{
    // Get max available system threads, including virtual. `availableParallelism()` is Node v18.14+
    const os = require('os');
    var SYS_MAX_THREADS = ('availableParallelism' in os ? os.availableParallelism() : os.cpus.length) || 1;
}
// Use half the available threads by default for each of the main processing tasks we run (see 3rd party libs setup, below).
const DEFAULT_CONCURRENCY = Math.ceil(SYS_MAX_THREADS / 2);

// Translate TPClient log level strings to our LogLevel enum.
const TPClientLogLevel = {
    "ERROR": LogLevel.ERROR,
    "WARN" : LogLevel.WARNING,
    "INFO" : LogLevel.INFO,
    "DEBUG": LogLevel.DEBUG,
} as const;

// Mapping of action names to layer element types with additional meta data for validation/etc.
type LayerElementRecord = Record<string, {
    type: ConstructorType<ILayerElement>,
    layered?: boolean,    // layered icons only
    prev_layer?: boolean, // requires previous (existing) layer(s) (implies `layered`)
    ctor_arg?: boolean,   // requires argument(s) for constructor
}>;
// Used in `handleIconAction()`
const ACTION_TO_ELEMENT_MAP: LayerElementRecord = {
    // Elements which can be either layers or individual icons.
    [C.Act.IconProgGauge ]: { type: LE.RoundProgressGauge },
    'simple_round_gauge'  : { type: LE.RoundProgressGauge },  // keep for BC
    [C.Act.IconProgBar   ]: { type: LE.LinearProgressBar },
    [C.Act.IconBarGraph  ]: { type: LE.BarGraph },
    'simple_bar_graph'    : { type: LE.BarGraph },            // keep for BC
    [C.Act.IconRect      ]: { type: LE.StyledRectangle },
    [C.Act.IconRectPath  ]: { type: LE.RectanglePath },
    [C.Act.IconEllipse   ]: { type: LE.EllipsePath },
    [C.Act.IconPath      ]: { type: LE.FreeformPath },
    [C.Act.IconText      ]: { type: LE.StyledText },
    [C.Act.IconImage     ]: { type: LE.DynamicImage,    ctor_arg: true },
    // Elements which affect other layers in some way.
    [C.Act.IconStyle     ]: { type: LE.DrawingStyle,    prev_layer: true },
    [C.Act.IconClip      ]: { type: LE.ClippingMask,    prev_layer: true },
    [C.Act.IconFilter    ]: { type: LE.CanvasFilter,    layered: true },
    [C.Act.IconCompMode  ]: { type: LE.CompositionMode, layered: true },
    [C.Act.IconTx        ]: { type: LE.Transformation,  layered: true },
} as const;

// Supported image file output formats indexed by file extension.
const OUTPUT_FORMATS = new Map([
  ['avif', 'avif'],
  ['jpeg', 'jpeg'],
  ['jpg', 'jpeg'],
  ['jpe', 'jpeg'],
  ['png', 'png'],
  ['tiff', 'tiff'],
  ['tif', 'tiff'],
  ['webp', 'webp'],
  ['gif', 'gif'],
]);

// ------------------------------
// 3rd-party Libs Setup

// Expand Node's thread pool if possible since sharp use it for async image loading/resizing.
// Need to do this first before any I/O can happen. Sharp also runs multiple threads _per image_ for compression,
// and tiling so leave some available. And don't override the limit if one is already set. 4 is the default.
if (!process.env.UV_THREADPOOL_SIZE)
    process.env.UV_THREADPOOL_SIZE = DEFAULT_CONCURRENCY.toString()

// Curb Sharp's default enthusiasm for using up all the available system threads for compressing each image.
// This is also set/changed by user's plugin settings after connecting to TP, but set a default here just in case.
sharp_concurrency(DEFAULT_CONCURRENCY);
// Skia-canvas v2 introduced a new way to control number of threads used for image rendering.
canvas_concurrency(DEFAULT_CONCURRENCY);


// -------------------------------
// Logging

// Configure logging.
const logger: Logger =
    logging()
    // .configure({ modules: { '' : LogLevel.DEBUG } })  // default config is INFO level for all modules
    .configureFromFile(CONFIG_FILEPATH)
    .getLogger('plugin');

if (!logging().haveEndpoints) {
    // If no logging output has been configured so far then add a fallback console logger unless it has been explicitly disabled in config.
    if (!logging().configuration.endpoints?.Console)
        logging().registerEndpoint(ConsoleEndpoint.instance())
}

// Init a logger specifically for TPClient messages so they can be filtered by level.
const tpLogger: Logger = logging().getLogger('tpclient');


// -------------------------------
// Globals

// Struct for tracking requested icons.
const g_dyanmicIconStates:Map<string, DynamicIcon> = new Map();
// flag for avoiding running the shutdown routine multple times from different callbacks
var g_quitting: boolean = false;

// Set default image path here. It should be overwritten anyway when Settings are processed,
// but this preserves BC with previous 1.1 alpha versions w/out the setting. Could eventually be removed.
PluginSettings.imageFilesBasePath = DEFAULT_IMAGE_FILE_BASE_PATH;

// Create Touch Portal API client
const TPClient = new TP.Client({
    pluginId: C.Str.PluginId,
    logCallback: tpClientLogCallback
});
// share the TP client with other modules
setTPClient(TPClient);


// -------------------------------
// Helper functions

// Shutdown handler: clean up and exit.
function quit(reason: string, exitCode: number = 0) {
    if (g_quitting)
        return;
    g_quitting = true;
    removeIcons([...g_dyanmicIconStates.keys()], false);
    logger.info("---------------- %s. %s shutting down. ----------------", reason, C.Str.PluginName)
    logging().close()
    // give the logger a chance to flush and close streams. If process is exiting already then this should be a no-op.
    setTimeout(() => { process.exit(exitCode); }, 50)
}

// Direct TPClient log messages to our own logger instance.
function tpClientLogCallback(level: string, message?: any, ...args: any[]) {
    const lvl: LogLevel = TPClientLogLevel[level] || LogLevel.INFO;
    tpLogger.log(lvl, message, ...args);
}

// Updates state of current icons list and command action selector.
function sendIconLists() {
    const nameArry = [...g_dyanmicIconStates.keys()].sort();
    TPClient.stateUpdate(C.StateId.IconsList, nameArry.length ? nameArry.join(',') + ',' : "");
    TPClient.choiceUpdate(C.ChoiceDataId.ControlIconsList, nameArry.length ? ["All", ...nameArry] : ["[ no icons created ]"]);
}

// Creates or removes TP State(s) for an icon as needed based on current and new tiling properties.
// An icon may use multiple states if it is tiled.
// Removes any TP state(s) for an icon that have already been created and are no longer needed,
// eg. when the tiling properties change or an icon is deleted entirely.
// Note this uses the icon's _current_ `tile` property value to determine state IDs to remove.
function createOrRemoveIconStates(icon: DynamicIcon, newTiles: PointType) {
    const newIsTiled = (newTiles.x > 1 || newTiles.y > 1);

    // Remove any old states based on the current icon config
    if (icon.isTiled) {
        for (let y=0; y < icon.tile.y; ++y) {
            for (let x=0; x < icon.tile.x; ++x) {
                if (newIsTiled && x < newTiles.x && y < newTiles.y)
                    continue
                try { TPClient.removeState(icon.getTileStateId({x: x, y: y})) }
                catch { /* ignore */ }
            }
        }
    }
    else if (icon.tile.x) {
        try { TPClient.removeState(/* id */ icon.name); }
        catch { /* ignore */ }
    }

    // Create new states, if any
    if (newIsTiled) {
        for (let y=0; y < newTiles.y; ++y) {
            for (let x=0; x < newTiles.x; ++x) {
                if (icon.isTiled && x < icon.tile.x && y < icon.tile.y)
                    continue
                try {
                    const tile = {x: x, y: y};
                    TPClient.createState(
                        icon.getTileStateId(tile),
                        icon.getTileStateName(tile),
                        "",        // default value
                        icon.name  // parent group, use icon name
                    )
                }
                catch { /* ignore, client logs errors */ }
            }
        }
    }
    else if (newTiles.x) {
        try { TPClient.createState(/* id */ icon.name, /* name */ icon.name, "", /* category */ C.Str.IconCategoryName); }
        catch { /* ignore, client logs errors */ }
    }
}

// Deletes icon(s) specified in `iconNames` array.
function removeIcons(iconNames: string[], removeStates = true) {
    iconNames.forEach((n) => {
        const icon: DynamicIcon | undefined = g_dyanmicIconStates.get(n);
        if (icon) {
            if (removeStates)
                createOrRemoveIconStates(icon, Point.new());
            globalImageCache().clearIconName(icon.name);
            if (!g_quitting)
                logger.info("Deleted icon instance '%s'", icon.name);
            g_dyanmicIconStates.delete(n);
        }
    });
}

// Sets skia-canvas async image generator thread limit
function canvas_concurrency(numThreads: number) {
    process.env.SKIA_CANVAS_THREADS = numThreads.toString()
}

// -------------------------------
// Action handlers

// Processes the 'dynamic_icons_control_command' action.
function handleControlAction(actionId: string, data: TpActionDataArrayType) {
    if (actionId !== C.Act.ControlCommand) {
        logger.error("Unknown type value for Control action: " + actionId);
        return;
    }
    const iconName:string = data.length > 1 ? data[1].value : "All";
    switch (data[0].value) {
        case C.DataValue.ClearImageCache:
            if (iconName == "All")
                globalImageCache().clear();
            else
                globalImageCache().clearIconName(iconName);
            return

        case C.DataValue.DelIconState: {
            removeIcons(iconName == "All" ? [...g_dyanmicIconStates.keys()] : [iconName]);
            sendIconLists();
            return;
        }

        default:
            logger.error("Unknown data value for Command action: " + data[0].value);
            return;
    }
}

// Processes all icon layering and generation actions.
function handleIconAction(actionId: string, data: TpActionDataArrayType)
{
    // The icon name is always the first data field in all other actions.
    const iconName:string = data[0].value.trim()
    if (!iconName) {
        logger.warn("Icon name missing for action", actionId);
        return;
    }

    // We may already have an instance of DynamicIcon to work with, these are stored indexed by name.
    let icon: DynamicIcon | undefined = g_dyanmicIconStates.get(iconName)
    // prepare action data for parsing
    const parseState = new ParseState(data)

    // Check for most likely scenario of actions which map directly to element types.
    const elTypeMeta = ACTION_TO_ELEMENT_MAP[actionId]
    if (!!elTypeMeta) {

        if (elTypeMeta.prev_layer && (!icon || icon.isEmpty)) {
            logger.warn(`Icon '${iconName}' has no existing layers for a '${elTypeMeta.type.name}' to handle.`)
            return
        }

        if ((elTypeMeta.layered || elTypeMeta.prev_layer) && !(icon && icon.delayGeneration)) {
            logger.warn(`Layered icon '${iconName}' must first be declared before adding a '${elTypeMeta.type.name}' type layer.`)
            return
        }

        // Must have an icon instance to work with
        if (!icon) {
            g_dyanmicIconStates.set(
                iconName,
                (icon = new DynamicIcon({ name: iconName }))
            )
        }
        else if (!icon.delayGeneration) {
            // reset position index for non-layered icons ("instant" rendering) since they can only have one layer
            icon.resetCurrentIndex();
        }

        let args: any;
        // image layer type requires icon name property as argument to c'tor
        if (elTypeMeta.ctor_arg && actionId == C.Act.IconImage)
            args = { iconName }

        icon.setOrUpdateLayerAtCurrentIndex(parseState, elTypeMeta.type, args)

        // render individual single-layered icon now
        if (!icon.delayGeneration && !icon.isEmpty) {
            // A new icon has tile = {0,0}, which is a way to check if we need to create a new TP State for it
            if (!icon.tile.x) {
                const tile: PointType = { x: 1, y: 1 }
                // Create a new state now.
                createOrRemoveIconStates(icon, tile)
                // Set the tile property.
                Point.set(icon.tile, tile)
                sendIconLists()
            }
            icon.render()
        }
        return
    }

    // Other actions either trigger icon creation/rendering or update existing layer data.
    switch (actionId)
    {
        case C.Act.IconDeclare: {
            // Create or modify a "layer stack" type icon. Layer elements need to be added/updated in following action(s).

            const dr = parseState.dr;
            // Create icon now if it doesn't exist yet
            if (!icon) {
                g_dyanmicIconStates.set(
                    iconName,
                    (icon = new DynamicIcon({ name: iconName, delayGeneration: true }))
                )
            }
            else {
                // reset layer position index, this increments each time we parse a layer element into the icon
                icon.resetCurrentIndex();
                // must explicitly generate (should already be true unless "converting" from single-layer icon)
                icon.delayGeneration = true;
            }

            // Parse and set the size property(ies).
            icon.size.width = parseIntOrDefault(dr.size, PluginSettings.defaultIconSize.width)
            // Size height parameter added in v1.2-alpha3
            // use current width as default for height, not the defaultIconSize.height (which is really for non-layered icons)
            icon.size.height = parseIntOrDefault(dr.h, icon.size.width)
            // set flag indicating tiling style is for < v1.2-alpha3. TODO: Remove and log as warning
            if (dr.h == undefined)
                icon.sizeIsActual = false

            // Handle tiling parameters, if any;  Added in v1.2.0
            const tile: PointType = Point.new(parseIntOrDefault(dr.x, 1), parseIntOrDefault(dr.y, 1))
            // Create the TP state(s) now if we haven't yet (icon.tile will be 0,0); this way a user can create the new state at any time, separate from the render action.
            // Also check if the tiling settings have changed; we may need to clean up any existing TP states first or create new ones.
            if (!Point.equals(icon.tile, tile)) {
                // Adjust icon states based on current tile property vs. the new one.
                createOrRemoveIconStates(icon, tile)
                // Update the icons list state if this is a new icon.
                if (!icon.tile.x)
                    sendIconLists()
                // Set the tile property after adjusting the states.
                Point.set(icon.tile, tile)
            }
            return;
        }

        case C.Act.IconGenerate:  {
            // Generate an existing layered dynamic icon which should have been created and populated by preceding actions.
            if (!icon || icon.isEmpty) {
                logger.warn("Image icon named '" + iconName + "' is empty, nothing to generate.");
                return
            }

            const dr = parseState.dr;
            let action = 3  // finalize | render
            // Action choices: "Finalize & Render", "Finalize Only", "Render Only"
            if (dr.action && dr.action.length < 17)
                action = dr.action[0] == 'F' ? 1 : 2

            // Output compression choices: "default", "None", "1"..."9"; Added in v1.2.0-a3
            if (dr.cl != undefined)
                icon.outputCompressionOptions.compressionLevel = dr.cl[0] == 'N' ? 0 : parseIntOrDefault(dr.cl, PluginSettings.defaultOutputCompressionLevel)

            // Output quality level: "default", 1-100; Added in v1.3.0
            if (dr.quality != undefined)
                icon.outputCompressionOptions.quality = clamp(parseIntOrDefault(dr.quality, PluginSettings.defaultOutputQuality), 1, 100)

            // GPU rendering setting choices: "default", "Enabled", "Disabled"; Added in v1.2.0-a1, removed after 1.2.0-a3
            // Disabled for now, revisit later if GPU usage becomes stable.
            // if (dr.gpu != undefined)
                // icon.gpuRendering = parseBoolOrDefault(dr.gpu, PluginSettings.defaultGpuRendering)

            if (action & 1)
                icon.finalize()
            if (action & 2)
                icon.render()

            return
        }

        case C.Act.IconSaveFile:  {
            // Generate and save an image to a file in various formats.
            if (!icon || icon.isEmpty) {
                logger.warn("Image icon named '" + iconName + "' is empty, nothing to generate.")
                return
            }

            const dr = parseState.dr;
            // Format is based on file extension.
            const format = OUTPUT_FORMATS.get(pathExtName(dr.file || "").toLowerCase().slice(1))
            if (!format) {
                logger.warn(`Unsupported output file format "${pathExtName(dr.file)}" for icon '${icon.name}'. Supported formats: ${[...OUTPUT_FORMATS.keys()].join(',')}`)
                return
            }

            // rendering options for icon.render()
            const options = {
                file: qualifyFilepath(dr.file),
                format,
                output: {}
            }

            // Convert name=value pairs to Sharp output options object.
            // We don't validate the values here... would be too much. Sharp will handle it and we'll log any errors at that point.
            const optsData = dr.options.split(',')
            for (const opt of optsData) {
                const kv = opt.split('=')
                const key = kv.at(0)?.trim()
                const strVal = kv.at(1)?.trim()
                if (!key || !strVal)
                    continue
                // most values are numeric or boolean, and a couple are strings;
                // strings should be quoted although only "chromaSubsampling" with values like "4:4:2" is an issue;
                let val: number|boolean|string = parseFloat(strVal)
                if (Number.isNaN(val))
                    val = (strVal == 'true' ? true : strVal == 'false' ? false : strVal.replace(/["']/g, ""))
                options.output[key] = val
            }

            icon.render(options)
            return
        }

        default:
            // Must be a layer update action...
            if (!!icon)
                handleIconUpdateAction(actionId, icon, parseState)
            else
                logger.warn(`No icon named '${iconName}' was found for update action ${actionId}`)
            return
    }

}  // handleIconAction()

// Handle actions which update existing layer element properties (transform, value, color).
// Note that this does support updating a "non-layered" icon with a single layer (!icon.delayGeneration),
// as long as that icon has been created already (the layer and compatible element exist).
function handleIconUpdateAction(actionId: string, icon: DynamicIcon, parseState: ParseState)
{
    const dr = parseState.dr;
    // Get index of layer to update.
    // Positive index values are 1-based so we subtract 1 to get actual array index,
    // negative is treated as counting from the end of the array as in `Array.prototype.at()`
    let layerIdx = parseInt(dr.index) || 0
    if (layerIdx > 0)
        --layerIdx
    // Get element at this index, if any.
    const el = icon.elementAt(layerIdx);
    if (!el) {
        // try to be more useful in error messages
        const len = icon.layerCount();
        if (layerIdx < 0) layerIdx += len
        logger.warn(`No element found at Position ${layerIdx + 1} (out of ${len}) for icon '${icon.name}'.`)
        return
    }

    switch (actionId)
    {
        // `break` from cases to finish the update process or `return` to cancel.
        case C.Act.IconSetTx:
            // Updates/sets a transformation on an existing icon layer of a type which supports it.
            // If layer is a Tx, update it.
            if (el instanceof LE.Transformation)
                el.loadFromDataRecord(dr)
            // Image element types have their own transform property which we can update directly.
            else if (el instanceof LE.DynamicImage)
                el.loadTransform(dr)
            // If this is a single-layer icon then we actually want to append this Tx (should only happen once per icon).
            // If we already appended a Tx to a single-layer icon (upon last update), then the next layer would already be a Tx.
            else if (!icon.delayGeneration && !layerIdx)
                icon.setOrUpdateLayerAtIndex(1, parseState, LE.Transformation);
            // Otherwise we'd have to replace the current layer with the Tx, which is probably not what the user intended.
            else {
                if (layerIdx < 0) layerIdx += icon.layerCount()
                logger.warn(`Could not set transform at Position ${layerIdx+1} for icon named '${icon.name}' on element of type '${el.constructor.name}'.`)
                return
            }
            break

        case C.Act.IconSetValue:
            // Updates/sets a single value on an existing icon layer of a type which supports it.
            if (typeof((<IValuedElement>el).setValue) === 'function') {
                (<IValuedElement>el).setValue(dr.value)
                break
            }
            if (layerIdx < 0) layerIdx += icon.layerCount()
            logger.warn(`Could not update data at Position ${layerIdx+1} for icon named '${icon.name}': Element type '${el.constructor.name}' does not support data updates.`)
            return

        case C.Act.IconSetColor:
            // Updates/sets a single value on an existing icon layer of a type which supports it.
            if (typeof((<IColorElement>el).setColor) === 'function') {
                // Color update fields: type = 'type'; Color value = 'color'.
                // Color update type values: "Stroke/Foreground", "Fill/Background", "Shadow"
                const type: ColorUpdateType = dr.type[1] == 't' ? ColorUpdateType.Stroke : dr.type[0] == 'F' ? ColorUpdateType.Fill : ColorUpdateType.Shadow;
                (<IColorElement>el).setColor(dr.color, type)
                break
            }
            if (layerIdx < 0) layerIdx += icon.layerCount()
            logger.warn(`Could not update color at Position ${layerIdx+1} for icon named '${icon.name}': Element type '${el.constructor.name}' does not support color updates.`)
            return

        default:
            // unknown message ID... shouldn't get here
            logger.error("Unknown action for Icon handler: " + actionId)
            return
    }

    // When updating a value/tx, there is an option to generate the icon immediately (w/out an explicit "generate" action)
    if (parseState.dr.render === C.DataValue.YesValue)
        icon.render();

}  // handleIconUpdateAction()


// -------------------------------
// Event handlers

function onAction(message:any /*,  hold?:boolean */) {
    // logger.debug("Action: %o", message);
    if (!message.data.length)
        return;  // we have no actions w/out data members

    // Shorten the action ID and split to get the action handler and action parts.
    // eg. in 'dynamic_icons_icon_set_tx', 'dynamic_icons' is ignored, 'icon' becomes the handler, and the rest of the id ('set_tx') is passed to the handler.
    // Note we also need to handle "legacy" action names 'generate_simple_round_gauge' and 'generate_simple_bar_graph'
    const trimId = message.actionId.replace(C.Str.IdPrefix, "");
    // benchmarked quickest method to extract first and rest elements from delimited string
    const uIdx = trimId.indexOf(C.Str.IdSep);
    const [handler, actionId] = [trimId.slice(0, uIdx), trimId.slice(uIdx+1)];

    switch (handler) {
        case C.ActHandler.Icon:
        case 'generate':  // keep for BC
            handleIconAction(actionId, message.data);
            break;

        case C.ActHandler.Control:
            handleControlAction(actionId, message.data);
            break;

        default:
            // unknown message ID... shouldn't get here
            logger.error("Unknown action for this plugin: %s", message.actionId);
            return;
    }
}


function onSettings(settings:{ [key:string]:string }[]) {
    settings.forEach((s) => {
        const [key, val] = Object.entries(s)[0];
        switch (key) {
            case C.SettingName.IconSize: {
                const sizeArry = val.split(/\s*[x, ]\s*/);
                const size = Size.new(parseInt(sizeArry[0]) || 0);
                if (size.width >= 8)  {
                    if (sizeArry.length > 1)
                        size.height = parseInt(sizeArry[1]) || size.width;
                    PluginSettings.defaultIconSize = size;
                }
                break;
            }
            case C.SettingName.ImageFilesPath:
                PluginSettings.imageFilesBasePath = val.trim() || DEFAULT_IMAGE_FILE_BASE_PATH;
                break;
            case C.SettingName.PngCompressLevel:
                PluginSettings.defaultOutputCompressionLevel = clamp(parseIntOrDefault(val, PluginSettings.defaultOutputCompressionLevel), 0, 9);
                break;
            case C.SettingName.PngQualityLevel:
                PluginSettings.defaultOutputQuality = clamp(parseIntOrDefault(val, PluginSettings.defaultOutputQuality), 1, 100);
                break;
            case C.SettingName.MaxImageProcThreads:
                sharp_concurrency(clamp(parseIntOrDefault(val, DEFAULT_CONCURRENCY), 1, SYS_MAX_THREADS));
                break;
            case C.SettingName.MaxImageGenThreads:
                canvas_concurrency(clamp(parseIntOrDefault(val, DEFAULT_CONCURRENCY), 1, SYS_MAX_THREADS));
                break;
            // Disabled for now, revisit later if GPU usage becomes stable.
            // case C.SettingName.GPU:
            //     PluginSettings.defaultGpuRendering = parseBoolOrDefault(val, PluginSettings.defaultGpuRendering);
            //     break;
        }
    });
    // logger.debug("settings: %O", settings)
    // logger.debug('PluginSettings: %O', PluginSettings)
}

TPClient.on("Action", onAction)
TPClient.on("Settings", onSettings)

TPClient.on("Info", function (message?:any) {
    logger.info("Connected to Touch Portal v%s with running plugin v%s (entry.tp v%d)", message.tpVersionString, pluginVersion, message.pluginVersion)
    // logger.debug("%o", message);
    sendIconLists()
})

TPClient.on("Close", function() {
    quit("Touch Portal disconnected");
})

TPClient.on("disconnected", function(/* hasError */) {
    // no-op if already quitting
    quit("Touch Portal socket disconnected");
})

process.on('uncaughtException', function(e) {
    logger.error("Exception: %s\n%s", e.message, e.stack)
    // quit("Uncaught Exception", 1);
});

// Trap keyboard interrupts and other signals for a clean exit.
process.on('SIGINT', () => quit("Keyboard interrupt") )     // ctrl-c
process.on('SIGBREAK', () => quit("Keyboard break") )       // ctrl-break (Windows)
process.on('SIGHUP', () => quit("Console host closed") )
process.on('SIGTERM', () => quit("Process terminated") )    // not on Windows


// -------------------------------
// Run

logger.info("=============== %s started, connecting to Touch Portal... ===============", C.Str.PluginName)

TPClient.connect( { exitOnClose: false })

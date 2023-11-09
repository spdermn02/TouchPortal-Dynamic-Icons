import TP from 'touchportal-api'
import * as C from './utils/consts'
import { TpActionDataArrayType } from './modules/types'
import { ILayerElement, IValuedElement } from './modules/interfaces';
import { Point, PointType, Size } from './modules/geometry';
import { DynamicIcon, ParseState, globalImageCache } from "./modules";
import * as LE from "./modules/elements";
import { ConsoleEndpoint, Logger, logging , LogLevel } from './modules/logging';
import { setTPClient, PluginSettings } from './common'
import { parseIntOrDefault, /* parseBoolOrDefault, */ clamp } from './utils/helpers'
import { dirname as pdirname, resolve as presolve } from 'path';
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

// Translate TPClient log level strings to our LogLevel enum.
const TPClientLogLevel = {
    "ERROR": LogLevel.ERROR,
    "WARN" : LogLevel.WARNING,
    "INFO" : LogLevel.INFO,
    "DEBUG": LogLevel.DEBUG,
}


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

// This is used for actions which update existing layers in an icon.
// Checks if action data contains valid "_index" field and returns its value in 'index' if (0 < value < currentLen);
// Otherwise returns the currentLen input value. The 'dataValid' member indicates if the index field was present and valid.
// If "_index" data value is negative, it is treated as counting from the end of the array, meaning it is added to 'currentLen' (and then validated).
function getLayerIndexFromActionData(actionData: any[], currentLen: number) {
    let ret = { index: currentLen, dataValid: false }
    if (actionData.length > 1 && actionData[1].id.endsWith("_index")) {
        let idxValue = parseInt(actionData[1].value) || 0;
        if (idxValue < 0)
            idxValue = currentLen + idxValue;
        else
            --idxValue;
        if (idxValue > -1 && idxValue < currentLen) {
            ret.index = idxValue;
            ret.dataValid = true;
        }
    }
    return ret
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
            g_dyanmicIconStates.delete(n);
        }
    });
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
async function handleIconAction(actionId: string, data: TpActionDataArrayType)
{
    // The icon name is always the first data field in all other actions.
    const iconName:string = data[0].value.trim()
    if (!iconName) {
        logger.warn("Icon name missing for action", actionId);
        return;
    }

    // We must have an instance of DynamicIcon to work with, these are stored indexed by name.
    let icon: DynamicIcon | undefined = g_dyanmicIconStates.get(iconName)
    if (!icon) {
        icon = new DynamicIcon({ name: iconName })
        g_dyanmicIconStates.set(iconName, icon)
    }

    // reset position index for non-layered icons ("instant" rendering) since they can only have one layer
    if (!icon.delayGeneration)
        icon.nextIndex = 0

    const layerElement: ILayerElement | null = icon.layers[icon.nextIndex]  // element at current position, if any
    const parseState = new ParseState(data)                                 // passed to the various "loadFromActionData()" methods of layer elements

    switch (actionId)
    {
        case C.Act.IconDeclare: {
            if (data.length < 2) {
                logger.error("Missing all data for icon '" + iconName + "' action " + actionId);
                return;
            }
            // Create or modify a "layer stack" type icon. Layer elements need to be added in following action(s).
            icon.delayGeneration = true;   // must explicitly generate
            icon.nextIndex = 0;   // reset layer position index, this increments each time we parse a layer element into the icon
            // Parse and set the size property(ies).
            const size = Size.new(parseInt(data[parseState.pos++].value) || PluginSettings.defaultIconSize.width);
            // Size height parameter; Added in v1.2-alpha3
            if (data[parseState.pos]?.id.endsWith("size_h"))
                size.height = parseInt(data[parseState.pos++].value) || PluginSettings.defaultIconSize.height
            else
                icon.sizeIsActual = false;  // set flag indicating tiling style is for < v1.2-alpha3. TODO: Remove
            Size.set(icon.size, size);

            // Handle tiling parameters, if any;  Added in v1.2.0
            let tile: PointType = { x: 1, y: 1}
            if (data[parseState.pos]?.id.endsWith("tile_x"))
                tile = { x: parseInt(data[parseState.pos++].value) || 1, y: parseInt(data[parseState.pos]?.value) || 1 };
            // Create the TP state(s) now if we haven't yet (icon.tile will be 0,0); this way a user can create the new state at any time, separate from the render action.
            // Also check if the tiling settings have changed; we may need to clean up any existing TP states first or create new ones.
            if (!Point.equals(icon.tile, tile)) {
                // Adjust icon states based on current tile property vs. the new one.
                createOrRemoveIconStates(icon, tile);
                // Update the icons list state if this is a new icon.
                if (!icon.tile.x)
                    sendIconLists()
                // Set the tile property after adjusting the states.
                Point.set(icon.tile, tile);
            }
            return;
        }

        case C.Act.IconGenerate:  {
            // Generate an existing layered dynamic icon which should have been created and populated by preceding actions.
            if (!icon.layers.length) {
                logger.warn("Image icon named '" + iconName + "' is empty, nothing to generate.");
                return;
            }

            let action = 3  // finalize | render
            if (data.length > 1) {
                // Action choices: "Finalize & Render", "Finalize", "Render"
                let strVal:string = data[1].value.trim()
                if (strVal.length < 9)
                    action = strVal[0] == 'F' ? 1 : 2

                parseState.pos = 2;
                // GPU rendering setting choices: "default", "Enable", "Disable"; Added in v1.2.0-a1, Removed after 1.2.0-a3.
                if (data[parseState.pos]?.id.endsWith("gpu")) {
                    /* Ignore GPU setting for now, possibly revisit if skia-canvas is fixed.
                    strVal = data[parseState.pos++].value[0]
                    icon.gpuRendering = (strVal == "d" && PluginSettings.defaultGpuRendering) || strVal == "E"
                    */
                    ++parseState.pos;
                }
                // Output compression choices: "default", "none", "1"..."9"; Added in v1.2.0-a3
                if (data[parseState.pos]?.id.endsWith("cl")) {
                    strVal = data[parseState.pos++].value[0]
                    icon.outputCompressionOptions.compressionLevel = strVal == "d" ? PluginSettings.defaultOutputCompressionLevel : parseInt(strVal) || 0
                }
            }

            if (action & 1)
                icon.layers.length = icon.nextIndex;   // trim any old layers
            if (action & 2)
                icon.render();

            return;
        }

        // Elements which can be either layers or individual icons.

        case 'simple_round_gauge':  // keep for BC
        case C.Act.IconProgGauge: {
            // Adds a round "progress bar" style gauge.
            const gauge: LE.RoundProgressGauge = layerElement instanceof LE.RoundProgressGauge ? (layerElement as LE.RoundProgressGauge) : (icon.layers[icon.nextIndex] = new LE.RoundProgressGauge())
            gauge.loadFromActionData(parseState);
            ++icon.nextIndex
            break;
        }

        case C.Act.IconProgBar: {
            // Adds a linear "progress bar" style widget.
            const gauge: LE.LinearProgressBar = layerElement instanceof LE.LinearProgressBar ? (layerElement as LE.LinearProgressBar) : (icon.layers[icon.nextIndex] = new LE.LinearProgressBar())
            gauge.loadFromActionData(parseState);
            ++icon.nextIndex
            break;
        }

        case 'simple_bar_graph':  // keep for BC
        case C.Act.IconBarGraph: {
            // Bar graph of series data. Data values are stored in the actual graph element.
            const barGraph: LE.BarGraph = layerElement instanceof LE.BarGraph ? (layerElement as LE.BarGraph) : (icon.layers[icon.nextIndex] = new LE.BarGraph())
            barGraph.loadFromActionData(parseState)
            barGraph.maxExtent = icon.actualSize().width;
            ++icon.nextIndex
            break
        }

        case C.Act.IconRect: {
            // Adds a "styled rectangle" (background, etc).
            const rect: LE.StyledRectangle = layerElement instanceof LE.StyledRectangle ? (layerElement as LE.StyledRectangle) : (icon.layers[icon.nextIndex] = new LE.StyledRectangle())
            rect.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconRectPath: {
            // Adds a rounded rectangle path.
            const rect: LE.RectanglePath = layerElement instanceof LE.RectanglePath ? (layerElement as LE.RectanglePath) : (icon.layers[icon.nextIndex] = new LE.RectanglePath())
            rect.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconEllipse: {
            // Adds an ellipse path.
            const ell: LE.EllipsePath = layerElement instanceof LE.EllipsePath ? (layerElement as LE.EllipsePath) : (icon.layers[icon.nextIndex] = new LE.EllipsePath())
            ell.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconPath: {
            // Adds a polyline or polygon path which can be styled or used as clip region.
            const path: LE.FreeformPath = layerElement instanceof LE.FreeformPath ? (layerElement as LE.FreeformPath) : (icon.layers[icon.nextIndex] = new LE.FreeformPath())
            path.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconText: {
            // Adds a "styled text" element.
            const text: LE.StyledText = layerElement instanceof LE.StyledText ? (layerElement as LE.StyledText) : (icon.layers[icon.nextIndex] = new LE.StyledText())
            text.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconImage: {
            // Adds an image source with possible embedded transformation element.
            const image: LE.DynamicImage = layerElement instanceof LE.DynamicImage ? (layerElement as LE.DynamicImage) : (icon.layers[icon.nextIndex] = new LE.DynamicImage({iconName: iconName}))
            image.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        // Elements which affect other layers in some way.

        case C.Act.IconStyle: {
            // Applies style to any previously unhandled path-producing elements.
            const style: LE.DrawingStyle = layerElement instanceof LE.DrawingStyle ? (layerElement as LE.DrawingStyle) : (icon.layers[icon.nextIndex] = new LE.DrawingStyle())
            style.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconClip: {
            // Creates a clipping mask from any previously unhandled path-producing elements.
            const clip: LE.ClippingMask = layerElement instanceof LE.ClippingMask ? (layerElement as LE.ClippingMask) : (icon.layers[icon.nextIndex] = new LE.ClippingMask())
            clip.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconFilter: {
            // Adds a CanvasFilter layer to an existing layered dynamic icon. This is purely CSS style 'filter' shorthand for applying to the canvas. The filter will affect all following layers.
            if (!icon.layers.length && !icon.delayGeneration) {
                logger.warn("Layered icon '" + iconName + "' must first be created before adding a filter.")
                return
            }
            const filter: LE.CanvasFilter = layerElement instanceof LE.CanvasFilter ? (layerElement as LE.CanvasFilter) : (icon.layers[icon.nextIndex] = new LE.CanvasFilter())
            filter.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconCompMode: {
            // Adds a CompositionMode layer to an existing layered dynamic icon. This sets the drawing context's globalCompositeOperation value for various blending effects.
            // The operating mode will affect all following layers until end or a new comp. mode layer.
            if (!icon.layers.length && !icon.delayGeneration) {
                logger.warn("Layered icon '" + iconName + "' must first be created before adding a composition mode.")
                return
            }
            const cm: LE.CompositionMode = layerElement instanceof LE.CompositionMode ? (layerElement as LE.CompositionMode) : (icon.layers[icon.nextIndex] = new LE.CompositionMode())
            cm.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconTx: {
            // Adds a Transformation layer on an existing layered icon.
            // The tx may affect either a single preceding layer, all the preceding layers so far, or all following layers (until end or reset).
            if (!icon.layers.length && !icon.delayGeneration) {
                logger.warn("Icon '" + iconName + "' must first be created before adding a transformation.")
                return
            }
            const tx: LE.Transformation = layerElement instanceof LE.Transformation ? (layerElement as LE.Transformation) : (icon.layers[icon.nextIndex] = new LE.Transformation())
            tx.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case C.Act.IconSetTx:
        case C.Act.IconSetValue: {
            // Updates/sets a single value or a transform on an existing icon layer of a type which supports it.
            // Note that this does support updating a "non-layered" icon with a single layer (!icon.delayGeneration),
            // as long as that icon has been created already (the layer and compatible element exist).
            const layersLen = icon.layers.length
            if (!layersLen) {
                logger.warn("Icon '" + iconName + "' must first be created before updating a value.")
                return
            }
            // Get index of layer to update
            const findLayerIdx = getLayerIndexFromActionData(data, layersLen)
            if (!findLayerIdx.dataValid) {
                logger.warn(`Layer data update Position out of bounds for icon named '${iconName}': Max. range 1-${layersLen}, got ${findLayerIdx.index+1}.`)
                return
            }
            // Get layer item we'll be updating
            const elem: ILayerElement | undefined = icon.layers.at(findLayerIdx.index)
            if (!elem || data.length < 3)
                return  // unlikely

            // Handle transform update
            if (actionId == "set_tx") {
                parseState.setPos(2)  // set up position for Tx parsing
                // If layer is a Tx, update it.
                if (elem instanceof LE.Transformation)
                    (elem as LE.Transformation).loadFromActionData(parseState)
                // Image element types have their own transform property which we can update directly.
                else if (elem instanceof LE.DynamicImage)
                    (elem as LE.DynamicImage).loadTransform(parseState)
                // If we already appended a Tx to a single-layer icon (upon last update, see the following condition), then the _next_ layer would be a Tx
                else if (layersLen == 2 && icon.layers[1] instanceof LE.Transformation)
                    (icon.layers[1] as LE.Transformation).loadFromActionData(parseState)
                // If there's only one layer then we actually want to append this Tx (should only happen once per icon, next update will hit the previous condition)
                else if (layersLen == 1)
                    icon.layers.push(new LE.Transformation().loadFromActionData(parseState))
                // Otherwise we'd have to replace the current layer with the Tx, which is probably not what the user intended.
                else {
                    logger.warn(`Could not set transform at Position ${findLayerIdx.index + 1} for icon named '${iconName}' on element is of type '${elem.constructor.name}'.`)
                    return
                }
            }
            // Handle single data value update
            else {
                if (!data[2].id.endsWith('value'))
                    return  // unlikely
                if ('setValue' in elem && typeof((elem as IValuedElement).setValue) === 'function') {
                    (elem as IValuedElement).setValue(data[2].value)
                }
                else {
                    logger.warn(`Could not update data at Position ${findLayerIdx.index + 1} for icon named '${iconName}': Element type '${elem.constructor.name}' does not support data updates.`)
                    return
                }
            }
            // When updating a value/tx, there is an option to generate the icon immediately (w/out an explicit "generate" action)
            const render = data.at(-1)
            if (render && render.id.endsWith("render") && render.value === "Yes")
                icon.render();
            return
        }

        default:
            // unknown message ID... shouldn't get here
            logger.error("Unknown action for Icon handler: " + actionId)
            return
    }

    // render individual single-layered icon now
    if (!icon.delayGeneration && icon.layers.length > 0) {
        // A new icon has tile = {0,0}, which is a way to check if we need to create a new TP State for it
        if (!icon.tile.x) {
            const tile: PointType = { x: 1, y: 1 }
            // Create a new state now.
            createOrRemoveIconStates(icon, tile)
            // Set the tile property.
            Point.set(icon.tile, tile)
            sendIconLists()
        }
        icon.render();
    }

}  // handleIconAction()


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
            // Ignore GPU setting for now, possibly revisit if skia-canvas is fixed.
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

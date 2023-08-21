import TP from 'touchportal-api'
import { pluginId } from './utils/consts'
import { ParseState, TpActionDataArrayType } from './modules/types'
import { ILayerElement, IValuedElement } from './modules/interfaces';
import { Point, PointType, Size } from './modules/geometry';
import DynamicIcon from "./modules/DynamicIcon";
import * as m_el from "./modules/elements";
import { default as g_globalImageCache, ImageCache } from './modules/ImageCache'
import { setTPClient, PluginSettings } from './common'
import { dirname as pdirname, join as pjoin } from 'path';

// -------------------------------
// Constants

// Default image base directory to TP's config folder for current user.
// This is used to resolve relative paths when loading images, via the ImageCache.cacheOptions.baseImagePath setting.
// User can override this with the "Default Image Files Path" plugin setting in TP.
// NOTE: this only works when the plugin binary is run from its normal install location in TPs config folder.
// If there's a better x-platform way to find TPs config path, then fixme.
const DEFAULT_IMAGE_FILE_BASE_PATH = pjoin(pdirname(process.argv0), '..', '..');


// -------------------------------
// Globals

// Struct for tracking requested icons.
const g_dyanmicIconStates:Map<string, DynamicIcon> = new Map();

const TPClient = new TP.Client();
// share the TP client and logger with other modules
setTPClient(TPClient);

// Set default image path here. It should be overwritten anyway when Settings are processed,
// but this preserves BC with previous 1.1 alpha versions w/out the setting. Could eventually be removed.
ImageCache.cacheOptions.baseImagePath = DEFAULT_IMAGE_FILE_BASE_PATH;


// -------------------------------
// Helper functions

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
    TPClient.stateUpdate("dynamic_icons_createdIconsList", nameArry.join(','));
    TPClient.choiceUpdate("dynamic_icons_control_command_icon", nameArry.length ? ["All", ...nameArry] : ["[ no icons created ]"]);
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
        try { TPClient.createState(/* id */ icon.name, /* name */ icon.name, "", /* category */ "Dynamic Icons"); }
        catch { /* ignore, client logs errors */ }
    }
}


// -------------------------------
// Action handlers

// Processes the 'dynamic_icons_control_command' action.
function handleControlAction(actionId: string, data: TpActionDataArrayType) {
    if (actionId !== 'command') {
        TPClient.logIt("ERROR", "Unknown type value for Control action:", actionId);
        return;
    }
    const iconName:string = data.length > 1 ? data[1].value : "All";
    switch (data[0].value) {
        case 'Clear the Source Image Cache':
            if (iconName == "All")
                g_globalImageCache.clear();
            else
                g_globalImageCache.clearIconName(iconName);
            return

        case 'Delete Icon State': {
            const iList = (iconName == "All" ? [...g_dyanmicIconStates.keys()] : [iconName]);
            iList.forEach((n) => {
                const icon: DynamicIcon | undefined = g_dyanmicIconStates.get(n);
                if (icon) {
                    createOrRemoveIconStates(icon, Point.new());
                    g_globalImageCache.clearIconName(icon.name);
                    g_dyanmicIconStates.delete(n);
                }
            });
            sendIconLists();
            return;
        }

        default:
            TPClient.logIt("ERROR", "Unknown data value for Command action:", data[0].value);
            return;
    }
}

// Processes all icon layering and generation actions.
async function handleIconAction(actionId: string, data: TpActionDataArrayType)
{
    // The icon name is always the first data field in all other actions.
    const iconName:string = data[0].value.trim()
    if (!iconName) {
        TPClient.logIt("WARN", "Icon name missing for action", actionId);
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
    const layerType: string = layerElement ? layerElement.type : ""         // checked in most of the actions below
    const parseState = new ParseState({data: data, pos: 1})                 // passed to the various "loadFromActionData()" methods of layer elements

    switch (actionId)
    {
        case 'declare': {
            if (data.length < 2) {
                TPClient.logIt("ERROR", "Missing all data for icon '" + iconName + "' action " + actionId);
                return;
            }
            // Create or modify a "layer stack" type icon. Layer elements need to be added in following action(s).
            icon.delayGeneration = true;   // must explicitly generate
            icon.nextIndex = 0;   // reset layer position index, this increments each time we parse a layer element into the icon
            // Parse and set the size property(ies).
            const size = Size.new(parseInt(data[parseState.pos++].value) || PluginSettings.defaultIconSize.width);
            // Size height parameter; Added in v1.2-alpha3
            if (data.length > parseState.pos && data[parseState.pos].id.endsWith("size_h"))
                size.height = parseInt(data[parseState.pos++].value) || PluginSettings.defaultIconSize.height
            else
                icon.sizeIsActual = false;  // set flag indicating tiling style is for < v1.2-alpha3. TODO: Remove
            Size.set(icon.size, size);

            // Handle tiling parameters, if any;  Added in v1.2.0
            let tile: PointType = { x: 1, y: 1}
            if (data.length > parseState.pos + 1 && data[parseState.pos].id.endsWith("tile_x"))
                tile = { x: parseInt(data[parseState.pos++].value) || 1, y: parseInt(data[parseState.pos].value) || 1 };
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

        case 'generate':  {
            // Generate an existing layered dynamic icon which should have been created and populated by preceding actions.
            if (!icon.layers.length) {
                TPClient.logIt("WARN", "Image icon named '" + iconName + "' is empty, nothing to generate.");
                return;
            }

            let action = 3  // finalize | render
            if (data.length > 1) {
                // Action choices: "Finalize & Render", "Finalize", "Render"
                let strVal:string = data[1].value.trim()
                if (strVal.length < 9)
                    action = strVal[0] == 'F' ? 1 : 2

                // GPU rendering setting choices: "default", "Enable", "Disable"; Added in v1.2.0
                if (data.length > 2 && data[2].id.endsWith("gpu")) {
                    strVal = data[2].value[0]
                    icon.gpuRendering = (strVal == "d" && PluginSettings.defaultGpuRendering) || strVal == "E"
                }
                // Output compression choices: "default", "none", "1"..."9"; Added in v1.2.0
                if (data.length > 3 && data[3].id.endsWith("cl")) {
                    strVal = data[3].value[0]
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
        case 'progGauge': {
            // Adds a round "progress bar" style gauge.
            const gauge: m_el.RoundProgressGauge = layerType == "RoundProgressGauge" ? (layerElement as m_el.RoundProgressGauge) : (icon.layers[icon.nextIndex] = new m_el.RoundProgressGauge())
            gauge.loadFromActionData(parseState);
            ++icon.nextIndex
            break;
        }

        case 'progBar': {
            // Adds a linear "progress bar" style widget.
            const gauge: m_el.LinearProgressBar = layerType == "LinearProgressBar" ? (layerElement as m_el.LinearProgressBar) : (icon.layers[icon.nextIndex] = new m_el.LinearProgressBar())
            gauge.loadFromActionData(parseState);
            ++icon.nextIndex
            break;
        }

        case 'simple_bar_graph':  // keep for BC
        case 'barGraph': {
            // Bar graph of series data. Data values are stored in the actual graph element.
            const barGraph: m_el.BarGraph = layerType == "BarGraph" ? (layerElement as m_el.BarGraph) : (icon.layers[icon.nextIndex] = new m_el.BarGraph())
            barGraph.loadFromActionData(parseState)
            barGraph.maxExtent = icon.actualSize().width;
            ++icon.nextIndex
            if (!icon.delayGeneration)
                icon.outputCompressionOptions.compressionLevel = 0;  // simple bar graphs don't benefit from compression
            break
        }

        case 'rect': {
            // Adds a "styled rectangle" (background, etc).
            const rect: m_el.StyledRectangle = layerType == "StyledRectangle" ? (layerElement as m_el.StyledRectangle) : (icon.layers[icon.nextIndex] = new m_el.StyledRectangle())
            rect.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case 'text': {
            // Adds a "styled text" element.
            const text: m_el.StyledText = layerType == "StyledText" ? (layerElement as m_el.StyledText) : (icon.layers[icon.nextIndex] = new m_el.StyledText())
            text.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case 'image': {
            // Adds an image source with possible embedded transformation element.
            const image: m_el.DynamicImage = layerType == "StyledText" ? (layerElement as m_el.DynamicImage) : (icon.layers[icon.nextIndex] = new m_el.DynamicImage({iconName: iconName}))
            image.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        // Elements which affect other layers in some way.

        case 'filter': {
            // Adds a CanvasFilter layer to an existing layered dynamic icon. This is purely CSS style 'filter' shorthand for applying to the canvas. The filter will affect all following layers.
            if (!icon.layers.length && !icon.delayGeneration) {
                TPClient.logIt("WARN", "Layered icon '" + iconName + "' must first be created before adding a filter.")
                return
            }
            const filter: m_el.CanvasFilter = layerType == "CanvasFilter" ? (layerElement as m_el.CanvasFilter) : (icon.layers[icon.nextIndex] = new m_el.CanvasFilter())
            filter.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case 'compMode': {
            // Adds a CompositionMode layer to an existing layered dynamic icon. This sets the drawing context's globalCompositeOperation value for various blending effects.
            // The operating mode will affect all following layers until end or a new comp. mode layer.
            if (!icon.layers.length && !icon.delayGeneration) {
                TPClient.logIt("WARN", "Layered icon '" + iconName + "' must first be created before adding a composition mode.")
                return
            }
            const cm: m_el.CompositionMode = layerType == "CompositionMode" ? (layerElement as m_el.CompositionMode) : (icon.layers[icon.nextIndex] = new m_el.CompositionMode())
            cm.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case 'tx': {
            // Adds a Transformation layer on an existing layered icon.
            // The tx may affect either a single preceding layer, all the preceding layers so far, or all following layers (until end or reset).
            if (!icon.layers.length && !icon.delayGeneration) {
                TPClient.logIt("WARN", "Icon '" + iconName + "' must first be created before adding a transformation.")
                return
            }
            const tx: m_el.Transformation = layerType == "Transformation" ? (layerElement as m_el.Transformation) : (icon.layers[icon.nextIndex] = new m_el.Transformation())
            tx.loadFromActionData(parseState)
            ++icon.nextIndex
            break
        }

        case 'set_tx':
        case 'set_value': {
            // Updates/sets a single value or a transform on an existing icon layer of a type which supports it.
            // Note that this does support updating a "non-layered" icon with a single layer (!icon.delayGeneration),
            // as long as that icon has been created already (the layer and compatible element exist).
            const layersLen = icon.layers.length
            if (!layersLen) {
                TPClient.logIt("WARN", "Icon '" + iconName + "' must first be created before updating a value.")
                return
            }
            // Get index of layer to update
            const findLayerIdx = getLayerIndexFromActionData(data, layersLen)
            if (!findLayerIdx.dataValid) {
                TPClient.logIt("WARN", `Layer data update Position out of bounds for icon named '${iconName}': Max. range 1-${layersLen}, got ${findLayerIdx.index+1}.`)
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
                if (elem.type == "Transformation")
                    (elem as m_el.Transformation).loadFromActionData(parseState)
                // Image element types have their own transform property which we can update directly.
                else if (elem.type == "DynamicImage")
                    (elem as m_el.DynamicImage).loadTransform(parseState)
                // If we already appended a Tx to a single-layer icon (upon last update, see the following condition), then the _next_ layer would be a Tx
                else if (layersLen == 2 && icon.layers[1].type == "Transformation")
                    (icon.layers[1] as m_el.Transformation).loadFromActionData(parseState)
                // If there's only one layer then we actually want to append this Tx (should only happen once per icon, next update will hit the previous condition)
                else if (layersLen == 1)
                    icon.layers.push(new m_el.Transformation().loadFromActionData(parseState))
                // Otherwise we'd have to replace the current layer with the Tx, which is probably not what the user intended.
                else {
                    TPClient.logIt("WARN", `Could not set transform at Position ${findLayerIdx.index + 1} for icon named '${iconName}': Element is of type ${elem.type}.`)
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
                    TPClient.logIt("WARN", `Could not update data at Position ${findLayerIdx.index + 1} for icon named '${iconName}': Element ${elem.type} does not support data updates.`)
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
            TPClient.logIt("ERROR", "Unknown action for Icon handler:", actionId)
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
    // TPClient.logIt("INFO",`Action ${message.actionId}`);  console.dir(message);
    if (!message.data.length)
        return;  // we have no actions w/out data members

    // Shorten the action ID and split to get the action handler and action parts.
    // eg. in 'dynamic_icons_icon_set_tx', 'dynamic_icons' is ignored, 'icon' becomes the handler, and the rest of the id ('set_tx') is passed to the handler.
    // Note we also need to handle "legacy" action names 'generate_simple_round_gauge' and 'generate_simple_bar_graph'
    const trimId = message.actionId.replace("dynamic_icons_", "");
    // benchmarked quickest method to extract first and rest elements from delimited string
    const uIdx = trimId.indexOf('_');
    const [handler, actionId] = [trimId.slice(0, uIdx), trimId.slice(uIdx+1)];

    switch (handler) {
        case 'icon':
        case 'generate':  // keep for BC
            handleIconAction(actionId, message.data);
            break;

        case 'control':
            handleControlAction(actionId, message.data);
            break;

        default:
            // unknown message ID... shouldn't get here
            TPClient.logIt("ERROR", "Unknown action for this plugin:", message.actionId);
            return;
    }
}

TPClient.on("Action", onAction)

function onSettings(settings:{ [key:string]:string }[]) {
    settings.forEach((s) => {
        const key:string = Object.keys(s)[0];
        const val:string = Object.values(s)[0].toString().trim();
        if (key.startsWith('Default Icon Size')) {
            const sizeArry = val.split(/\s*[x, ]\s*/);
            const size = Size.new(parseInt(sizeArry[0]) || 0);
            if (size.width >= 8)  {
                if (sizeArry.length > 1)
                    size.height = parseInt(sizeArry[1]) || size.width;
                PluginSettings.defaultIconSize = size;
            }
        }
        else if (key.startsWith('Default Image Files Path')) {
            ImageCache.cacheOptions.baseImagePath = val || DEFAULT_IMAGE_FILE_BASE_PATH;
        }
        else if (key.startsWith('Enable GPU Rendering')) {
            PluginSettings.defaultGpuRendering = /(?:[1-9]\d*|yes|true|enabled?)/i.test(val);
        }
        else if (key.includes('Output Image Compression')) {
            PluginSettings.defaultOutputCompressionLevel = /^\d$/.test(val) ? parseInt(val) : 0;
        }
    });
}

TPClient.on("Settings", onSettings)

TPClient.on("Info", function (message?:any) {
    TPClient.logIt("INFO","Connected to Touch Portal "+JSON.stringify(message))
    sendIconLists()
})

process.on('uncaughtException', function(e) {
    TPClient.logIt("ERROR", "Exception:", e.message, "\n", e.stack)
    // process.exit(1);
});

// This is a workaround hack for skia-canvas v1.0.0 hanging the plugin on exit (in some cases). Yet it has the best imaging composition performance by far.
process.on('exit', function() {
    TPClient.logIt("WARN","Force terminating the plugin!")
    process.kill(process.pid, 'SIGTERM');
})


// -------------------------------
// Run

TPClient.connect({pluginId})

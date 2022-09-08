import TP from 'touchportal-api'
import sharp from 'sharp'   // for final result image compression
// import { evaluate } from 'mathjs'  // optional math evaluator option, see evaluateValue()
import { BarGraph, Gauge, Transformation, TransformedOverlayImagesIcon, Vect2d } from './modules/interfaces'
import { buildBarGraph } from './modules/simpleBarGraph';
import { buildSimpleRoundGauge } from './modules/simpleRoundGauge';
import { buildTransformedOverlayImagesIcon } from './modules/transformedOverlayImagesIcon';
import { globalImageCache } from './modules/ImageCache'
import { pluginId } from './utils/consts'
const TPClient = new TP.Client();
const WIDTH = 256;

const USE_IMAGE_COMPRESSOR:number   = 1;  // 0 = none; 1 = Sharp
const USE_DYNAMIC_VALUE_EVAL:number = 1;  // 0 = none; 1 = Function; 2 = mathjs

// Options for the 'sharp' lib image compression. These are passed to sharp() when generating PNG results.
// These probably should be user-settable somehow (plugin settings or via Actions) since they can really affect performance vs. quality and CPU usage.
// See imageCache.ts (ImageCacheOptions) or https://sharp.pixelplumbing.com/api-output#png for option descriptions.
const IMAGE_COMPRESSOR_OPTIONS = {
    compressionLevel: 4,   // MP: 4 seems to give the highest effective compression in my tests, no gains with higher levels but does slow down.
    effort: 1,             // MP: 1 actually uses less CPU time than higher values (contrary to what sharp docs suggest) and gives slightly higher compression.
    palette: true          // MP: Again the docs suggest enabling this would be slower but my tests show a significant speed improvement.
}

// For tracking requested icons.
type IconState = { stateCreated:boolean, data:any }
const dyanmicIconStates:Map<string, IconState> = new Map();

// Evaluates a numeric expression within an arbitrary string. Returns zero if evaluation fails.
// Note that the number formats must be "language neutral," meaning always period for decimal separator and no thousands separators.
function evaluateValue(value: string): number {
    let ret: number = 0;
    try {
        if (USE_DYNAMIC_VALUE_EVAL == 1)
            ret = (new Function( `"use strict"; return (${value})`))() || 0;
        // else if (USE_DYNAMIC_VALUE_EVAL == 2)  // requires mathjs import
        //     ret = evaluate(value);
        else
            ret = parseFloat(value);
    }
    catch (e) {
        TPClient.logIt("ERROR", "While evaluating the expression '" + value + "':", e);
    }
    return ret;
}

// Parses and evaluates up to two values out of a string. e.g. "(45 * Math.PI / 2), 20 + 400"
// The values may be separated by colon, semicolon, single quote, or back(tick|quote) [:;'`]; leading and trailing spaces around the separator are ignored.
// Results are assigned to the returned Vect2d's `x` and `y` members respectively.
// If only one value is found in the string then it is assigned to the result's `y` member as well as to `x`.
// If evaluation fails for either value then zero is returned (see also `evaluateValue()`);
function makeVect2dFromValue(value: string): Vect2d {
    let vec: Vect2d = new Vect2d;
    const valPr: string[] = value.split(/\s*(?:;|:|'|`)\s*/, 2)
    vec.x = evaluateValue(valPr[0]);
    vec.y = valPr.length > 1 ? evaluateValue(valPr[1]) : vec.x;
    return vec;
}

TPClient.on("Action",async (message:any, /* hold?:boolean */) => {
    // TPClient.logIt("INFO",`Action ${message.actionId} and hold is ${hold} to Touch Portal`)
    if (!message.data.length)
        return

    // handle any housekeeping, non-image-generating actions first.
    if (message.actionId === 'dynamic_icons_control_command') {
        switch (message.data[0].value) {
            case 'Clear the Source Image Cache':
                globalImageCache.clear()
                return

            default:
                TPClient.logIt("ERROR", "Unknown data value for System Actions:", message.data[0].value)
                return
        }
    }

    const iconName:string = message.data[0].value.trim()
    if (!iconName)
        return

    let iconState = dyanmicIconStates.get(iconName)
    if (!iconState)
        dyanmicIconStates.set(iconName, iconState = { stateCreated: false, data: null })

    let iconData:Buffer | null = null   // for generated image data
    let useCompression = USE_IMAGE_COMPRESSOR   // this could be set at runtime per icon to en/disable compression; eg. if img size is < X

    if (message.actionId === 'generate_simple_round_gauge') {
        const gauge = new Gauge()
        gauge.shadowOn = message.data[1].value === "On" ? true : false
        gauge.shadowColor = message.data[1].value === "On" ? message.data[2].value : ''
        gauge.indicatorColor = message.data[3].value
        gauge.highlightOn = message.data[4].value === "On" ? true : false
        gauge.startingDegree = message.data[5].value !== undefined ? parseFloat(message.data[5].value) : 0
        gauge.value = message.data[6].value
        gauge.capStyle =  message.data[7].value
        gauge.backgroundColor = message.data[8].value
        gauge.counterClockwise = message.data[9].value.toLowerCase() == "counter clockwise" ? true : false

        iconData = await buildSimpleRoundGauge(WIDTH,WIDTH,gauge)
    }
    else if (message.actionId === 'generate_simple_bar_graph') {
        let barGraph = iconState.data
        if( !barGraph ) {
            barGraph = new BarGraph()
            barGraph.values = new Array()
            iconState.data = barGraph
        }
        barGraph.backgroundColorOn = message.data[1].value === "On" ? true : false
        barGraph.backgroundColor = message.data[1].value === "On" ? message.data[2].value : ''
        barGraph.barColor = message.data[3].value
        barGraph.values.push( message.data[4].value !== undefined ? parseFloat(message.data[4].value) : 0 )
        barGraph.barWidth = message.data[5].value !== undefined ? parseInt(message.data[5].value) : 1

        if( barGraph.values.length > ( WIDTH / barGraph.barWidth ) + 1) {
            barGraph.values.shift()
        }
        iconData = await buildBarGraph(WIDTH,WIDTH,barGraph)
        useCompression = 0  // the bar graphs are already small files, compression step just wastes time
    }
    else if (message.actionId.startsWith("dynamic_icons_generate_image_stack_")) {
        // Generic handler for all "image stack" type graphics with (optional) transformations applied.
        const gauge = new TransformedOverlayImagesIcon()
        let i:number = 1  // next data index; we already extracted the icon name from the first [0] data member
        const size = parseInt(message.data[i++].value) || WIDTH
        gauge.size = { width: size, height: size }
        let currentTx: Transformation | null = null
        // all the rest of the incoming data should be structured with a naming convention and be processed dynamically
        for ( ; i < message.data.length; ++i) {
            const data = message.data[i]
            const value = data.value.trim()
            const dataType = data.id.split('_').at(-1)  // last part of the data ID determines its meaning
            if (dataType === 'src') {
                // an image source field starts a new "data set" with the source and any transformation steps which may be in the TP action data
                if (value) {
                    gauge.imageSources.push(value)
                    gauge.transformations.push(currentTx = new Transformation)
                }
                else {
                    // make sure we're not adding transformation steps to any previous source
                    currentTx = null
                }
                continue
            }
            if (!currentTx || !value)
                continue
            switch (dataType) {
                case 'rot':
                    currentTx.rotate = evaluateValue(value)
                    break
                case 'trs':
                    currentTx.translate = makeVect2dFromValue(value)
                    break
                case 'scl':
                    currentTx.scale = makeVect2dFromValue(value)
                    break
                case 'txorder':
                    currentTx.transformOrder = value.split(', ')
                    break
                default:
                    TPClient.logIt("WARN", "Unknown data ID attribute:", data.id)
                    continue
            }
            // TPClient.logIt("DEBUG", message.data[i].value, value)
        }
        iconData = await buildTransformedOverlayImagesIcon(gauge)
    }
    // unknown message ID... shouldn't get here
    else {
        TPClient.logIt("ERROR", "Unknown action for this plugin:", message.actionId)
    }

    // see if we have something to send
    if (iconData) {
        try {
            // check if compression is enabled
            if (useCompression == 1) {
                iconData = await sharp(iconData, { premultiplied: true }).png(IMAGE_COMPRESSOR_OPTIONS).toBuffer()
                if (!iconData) {
                    TPClient.logIt("ERROR", "Generating icon", iconName, "Compressed image is null!")
                    return
                }
            }
            // TPClient.logIt("DEBUG", "Sending", iconState.stateCreated ? "Updated" : "New", "icon named", iconName, "with length", iconData.length)

            // create dynamic TP state for new icons
            if (!iconState.stateCreated) {
                iconState.stateCreated = true
                TPClient.createState(iconName, iconName, "")
            }
            TPClient.stateUpdate(iconName, iconData.toString("base64"))
        }
        catch (e) {
            TPClient.logIt("ERROR", "Generating/sending icon", iconName, '\n', e)
        }
    }

    // clean up if we haven't generated an icon for this name. This is "unlikely"... maybe a waste of time?
    if (!iconState.stateCreated)
        dyanmicIconStates.delete(iconName)

})

TPClient.on("Info", (message?:any) => {
    TPClient.logIt("INFO","Connected to Touch Portal "+JSON.stringify(message))
})

// This is a workaround hack for skia-canvas v1.0.0 hanging the plugin on exit (in some cases). Yet it has the best imaging composition performance by far.
// This should ideally be removed ASAP since it may prevent legitimate exception messages from showing on exit, making diagnostics rather difficult.
process.on('exit', function() {
    TPClient.logIt("WARN","Force terminating the plugin!")
    process.kill(process.pid, 'SIGTERM');
})

TPClient.connect({pluginId})

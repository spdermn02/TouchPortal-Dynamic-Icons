import TP from 'touchportal-api'
import sharp from 'sharp'   // for final result image compression
// import { evaluate } from 'mathjs'  // optional math evaluator option, see evaluateValue()
import { BarGraph, Gauge, DynamicImage, TransformedOverlayImagesIcon, Vect2d, Transformation } from './modules/interfaces'
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

function createTpIconStateIfNeeded(iconState: IconState, iconName: string) {
    if (!iconState.stateCreated) {
        iconState.stateCreated = true
        TPClient.createState(iconName, iconName, "")
    }
}

// Evaluates a numeric expression within an arbitrary string. Returns zero if evaluation fails or value string was empty.
// Note that the number formats must be "language neutral," meaning always period for decimal separator and no thousands separators.
function evaluateValue(value: string): number {
    let ret: number = 0;
    value = value.trim()
    if (!value)
        return ret
    try {
        if (USE_DYNAMIC_VALUE_EVAL == 1)
            ret = (new Function( `"use strict"; return (${value})`))() || 0;
        // else if (USE_DYNAMIC_VALUE_EVAL == 2)  // requires mathjs import
        //     ret = evaluate(value);
        else
            ret = parseFloat(value) || 0;
    }
    catch (e) {
        TPClient.logIt("ERROR", "While evaluating the expression '" + value + "':", e)
    }
    return ret;
}

// Parses and evaluates up to two values out of a string. e.g. "(45 * Math.PI / 2), 20 + 400"
// The values may be separated by colon, semicolon, single quote, or back(tick|quote) [:;'`]; leading and trailing spaces around the separator are ignored.
// Results are assigned to the returned Vect2d's `x` and `y` members respectively.
// If only one value is found in the string then it is assigned to the result's `y` member as well as to `x`.
// If evaluation fails for either value then a zero is used instead (see also `evaluateValue()`); A empty value string produces a default zero-length vector.
function makeVect2dFromValue(value: string): Vect2d {
    let vec: Vect2d = new Vect2d();
    value = value.trim()
    if (!value)
        return vec;
    const valPr: string[] = value.split(/\s*(?:;|:|'|`)\s*/, 2)
    vec.x = evaluateValue(valPr[0]);
    vec.y = valPr.length > 1 && valPr[1].trim() ? evaluateValue(valPr[1]) : vec.x;
    return vec;
}

// Parses a set of consecutive transformation step action data fields into a Transformation object type.
// actionData is the data array; startAt is the index in actionData at which to start iteration.
// Returns a tuple (array) of the resulting Transformation at first position and the number of data fields "consumed" (essentially the ending index) in the second.
function parseTransformationData(actionData: any, startAt: number): [Transformation, number] {
    // the incoming data IDs should be structured with a naming convention
    const tx: Transformation = new Transformation
    let consumed = 0
    for (let i = startAt, e = Math.min(i+4, actionData.length); i < e; ++i) {
        const data = actionData[i]
        const value = data.value.trim()
        const dataType = data.id.split('_').at(-1)  // last part of the data ID determines its meaning
        switch (dataType) {
            case 'rot':
                tx.rotate = evaluateValue(value)
                break
            case 'trs':
                tx.translate = makeVect2dFromValue(value)
                break
            case 'scl':
                tx.scale = makeVect2dFromValue(value)
                break
            case 'skw':
                tx.skew = makeVect2dFromValue(value)
                break
            case 'txorder':
                if (value)
                    tx.transformOrder = value.split(', ')
                break
            default:
                i = e  // end the loop on unknown data id
                continue
        }
        ++consumed
    }
    // console.dir(tx);
    return [tx, consumed];
}

// Parses a set of consecutive data fields which define one or more images, including source (path) with possible transformations.
// The parsed data is saved into a the passed `gauge` object in its `images` array.
// actionData is the data array; startAt is the index in actionData at which to start iteration. imageIndex is the index at which
// to start placing new image(s) in the gauge's image array, or -1 to append to the end.
// TODO: simplify if we get rid of the "dynamic_icons_generate_image_stack_*" actions which have multiple images in one action.
function parseImageActionData(actionData: any, startAt: number, gauge: TransformedOverlayImagesIcon, imageIndex: number = -1) {
    // the incoming data IDs should be structured with a naming convention
    if (imageIndex < 0)
        imageIndex = gauge.images.length
    let currentImg: DynamicImage | null = null
    for (let i = startAt; i < actionData.length; ++i) {
        if (actionData[i].id.endsWith('_src')) {
            // An image source field starts a new "data set" with the source and any transformation steps which may be in the TP action data.
            const value = actionData[i].value.trim()
            if (value.length < 5)  // shortest possible valid image file name would be 5 chars.
                continue
            currentImg = new DynamicImage({source: value})
            // Check for and parse image resize option.
            if (actionData.length - i > 1 && actionData[i+1].id.endsWith('_fit'))
                currentImg.resizeOptions['fit'] = actionData[++i].value.trim()
            // Parse any transformation data fields.
            if (actionData.length - i > 1) {
                const [tx, consumed] = parseTransformationData(actionData, i + 1)
                currentImg.transform = tx
                i += consumed
            }
            // save image data to the icon object
            gauge.images[imageIndex++] = currentImg
        }
    }
}

TPClient.on("Action",async (message:any /*,  hold?:boolean */) => {
    // TPClient.logIt("INFO",`Action ${message.actionId}`);  console.dir(message);
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

    // The icon name is always the first data field in all other actions.
    const iconName:string = message.data[0].value.trim()
    if (!iconName)
        return

    let iconState = dyanmicIconStates.get(iconName)
    if (!iconState)
        dyanmicIconStates.set(iconName, iconState = { stateCreated: false, data: null })

    let iconData:Buffer | null = null   // for generated image data
    let useCompression = USE_IMAGE_COMPRESSOR   // this could be set at runtime per icon to en/disable compression; eg. if img size is < X

    switch (message.actionId) {
        case 'generate_simple_round_gauge': {
            const gauge = new Gauge()
            gauge.shadowOn = message.data[1].value === "On" ? true : false
            gauge.shadowColor = message.data[1].value === "On" ? message.data[2].value : ''
            gauge.indicatorColor = message.data[3].value
            gauge.highlightOn = message.data[4].value === "On" ? true : false
            gauge.startingDegree = message.data[5].value !== undefined ? parseFloat(message.data[5].value) || 180 : 0
            gauge.value = message.data[6].value
            gauge.capStyle =  message.data[7].value
            gauge.backgroundColor = message.data[8].value
            gauge.counterClockwise = message.data[9].value.toLowerCase() == "counter clockwise" ? true : false

            iconData = await buildSimpleRoundGauge(WIDTH,WIDTH,gauge)
            break
        }
        case 'generate_simple_bar_graph': {
            let barGraph = iconState.data
            if( !barGraph ) {
                barGraph = new BarGraph()
                barGraph.values = new Array()
                iconState.data = barGraph
            }
            barGraph.backgroundColorOn = message.data[1].value === "On" ? true : false
            barGraph.backgroundColor = message.data[1].value === "On" ? message.data[2].value : ''
            barGraph.barColor = message.data[3].value
            barGraph.values.push( message.data[4].value !== undefined ? parseFloat(message.data[4].value) || 0 : 0 )
            barGraph.barWidth = message.data[5].value !== undefined ? parseInt(message.data[5].value) || 10 : 1

            if( barGraph.values.length > ( WIDTH / barGraph.barWidth ) + 1) {
                barGraph.values.shift()
            }
            iconData = await buildBarGraph(WIDTH,WIDTH,barGraph)
            useCompression = 0  // the bar graphs are already small files, compression step just wastes time
            break
        }

        case 'dynamic_icons_new_image_stack': {
            // Creates a new "image stack" type icon with given name and size. Images need to be added in following action(s).
            const size = parseInt(message.data[1].value) || WIDTH
            const gauge = new TransformedOverlayImagesIcon({ name: iconName, size: { width: size, height: size } })
            iconState.data = gauge
            // create the TP state now if we haven't yet; this way a user can create the new state at any time, separate from the render action.
            createTpIconStateIfNeeded(iconState, iconName)
            // TPClient.logIt("DEBUG", "Started new image stack named", iconName, "size", gauge.size.width, gauge.size.height)
            break
        }
        case 'dynamic_icons_add_image': {
            // Adds an image source to an existing image stack type icon (created with 'dynamic_icons_new_image_stack' action), with optional transformations applied.
            const gauge = iconState.data
            if (!gauge) {
                TPClient.logIt("ERROR", "Image icon named '" + iconName + "' must first be created before adding images.")
                return
            }
            // The rest of the incoming data should be structured with a naming convention, starting with the image source and followed by other optional data params.
            parseImageActionData(message.data, 1, gauge)
            break
        }
        case 'dynamic_icons_replace_image':  {
            // Replaces or appends an image source at specified index position to an existing image stack type icon, with optional transformations applied. See also "dynamic_icons_add_image" above.
            const gauge = iconState.data
            if (!gauge) {
                TPClient.logIt("ERROR", "Image icon named '" + iconName + "' must first be created before replacing images.")
                return
            }
            const imgIndex = parseInt(message.data[1].value) || 0
            if (imgIndex > 0)
                parseImageActionData(message.data, 2, gauge, imgIndex - 1)
            break
        }
        case 'dynamic_icons_render_image_stack':  {
            // Generates an existing image stack type icon which should be a result of 'dynamic_icons_new_image_stack' + one or more 'dynamic_icons_add_image' actions.
            const gauge = iconState.data
            if (!gauge) {
                TPClient.logIt("ERROR", "Icon named '" + iconName + "' must first be created before generating.")
                return
            }
            iconData = await buildTransformedOverlayImagesIcon(gauge)
            break
        }

        default:
            // Generic handler for all "image stack" type graphics with (optional) transformations applied.  TODO: Remove?
            if (message.actionId.startsWith("dynamic_icons_generate_image_stack_")) {
                const size = parseInt(message.data[1].value) || WIDTH
                const gauge = new TransformedOverlayImagesIcon({ name: iconName, size: { width: size, height: size } })
                // all the rest of the incoming data should be structured with a naming convention and be processed dynamically
                parseImageActionData(message.data, 2, gauge)
                iconData = await buildTransformedOverlayImagesIcon(gauge)
                break
            }
            // unknown message ID... shouldn't get here
            else {
                TPClient.logIt("ERROR", "Unknown action for this plugin:", message.actionId)
                return
            }
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
            createTpIconStateIfNeeded(iconState, iconName)
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

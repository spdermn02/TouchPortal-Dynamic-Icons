import TP from 'touchportal-api'
import {BarGraph, Gauge} from './modules/interfaces'
import { buildBarGraph } from './modules/simpleBarGraph';
import { buildSimpleRoundGauge } from './modules/simpleRoundGauge';
import { pluginId } from './utils/consts'
const TPClient = new TP.Client();
const WIDTH = 256;

const dyanmicIconStates= { } as any;

TPClient.on("Action",async (message:any,hold?:boolean) => {
    TPClient.logIt("INFO",`Action ${message.actionId} and hold is ${hold} to Touch Portal`)
    if( message.actionId === 'generate_simple_round_gauge' ) {
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
        
        const gaugeIcon = await buildSimpleRoundGauge(256,256,gauge);

        if( dyanmicIconStates[message.data[0].value] == undefined ) {
            dyanmicIconStates[message.data[0].value] = 1
            TPClient.createState(message.data[0].value,message.data[0].value,'')
        }
        TPClient.stateUpdate(message.data[0].value,gaugeIcon)
    }
    else if( message.actionId === 'generate_simple_bar_graph') {
        if( dyanmicIconStates[message.data[0].value] == undefined ) {
            const newBarGraph = new BarGraph()
            newBarGraph.values = new Array()
            dyanmicIconStates[message.data[0].value] = newBarGraph
            TPClient.createState(message.data[0].value,message.data[0].value,'')
        }
        const barGraph = dyanmicIconStates[message.data[0].value]
        barGraph.backgroundColorOn = message.data[1].value === "On" ? true : false
        barGraph.backgroundColor = message.data[1].value === "On" ? message.data[2].value : ''
        barGraph.barColor = message.data[3].value
        barGraph.values.push( message.data[4].value !== undefined ? parseFloat(message.data[4].value) : 0 )
        barGraph.barWidth = message.data[5].value !== undefined ? parseInt(message.data[5].value) : 1

        if( barGraph.values.length > ( WIDTH / barGraph.barWidth ) + 1) {
            barGraph.values.shift()
        }
        const graphIcon = await buildBarGraph(256,256,barGraph);
        TPClient.stateUpdate(message.data[0].value,graphIcon)
    }
})

TPClient.on("Info", (message?:any) => {
    TPClient.logIt("INFO","Connected to Touch Portal "+JSON.stringify(message))
})

TPClient.connect({pluginId})
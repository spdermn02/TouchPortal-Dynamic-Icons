import TP from 'touchportal-api'
import {Gauge} from './modules/interfaces'
import { buildRoundGague } from './modules/gauge';
import { pluginId } from './utils/consts'
const TPClient = new TP.Client();

const dyanmicIconStates= { } as any;

TPClient.on("Action",async (message:any,hold?:boolean) => {
    TPClient.logIt("INFO",`Action ${message.type} and hold is ${hold} to Touch Portal`)
    if( message.actionId === 'generate_gauge_icon' ) {
        const gauge = new Gauge();
        gauge.value = message.data[7].value;
        gauge.capStyle =  message.data[8].value;
        gauge.indicatorColor = message.data[4].value;
        gauge.highlightOn = message.data[5].value === "On" ? true : false;;
        gauge.shadowColor = message.data[2].value === "On" ? message.data[3].value : '';
        gauge.shadowOn = message.data[2].value === "On" ? true : false;
        gauge.startingDegree = 0;
        gauge.counterClockwise = false;
        gauge.backgroundColor = message.data[9].value ;
        const gaugeIcon = await buildRoundGague(256,256,gauge);

        if( dyanmicIconStates[message.data[1].value] == undefined ) {
            dyanmicIconStates[message.data[1].value] = 1;
            TPClient.createState(message.data[1].value,message.data[1].value,'');
        }
        TPClient.stateUpdate(message.data[1].value,gaugeIcon);
    }
})

TPClient.on("Info", (message?:any) => {
    TPClient.logIt("INFO","Connected to Touch Portal "+JSON.stringify(message));
})

TPClient.connect({pluginId})
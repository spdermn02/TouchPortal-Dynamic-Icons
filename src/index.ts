import TP from 'touchportal-api'
import { pluginId } from './utils/consts'

const TPClient = new TP.Client();

TPClient.on("Action",(message:any,hold?:boolean) => {
    TPClient.logIt("INFO",`Action ${message.type} and hold is ${hold} to Touch Portal`)
})

TPClient.on("Info", (message?:any) => {
    TPClient.logIt("INFO","Connected to Touch Portal "+JSON.stringify(message));
})

TPClient.connect({pluginId})
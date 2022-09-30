
// hackish way to share the TPClient "logger" with other modules
export var logIt: Function = console.log;
export function setCommonLogger(logger: Function) {
	logIt = logger;
}

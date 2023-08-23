/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
    Inspired by Adrian Hall @ https://adrianhall.github.io/cloud/2019/06/30/building-an-efficient-logger-in-typescript/
*/

import { EventEmitter } from 'events';
import { ILogOptions, ILogEndpoint, LogLevel, LogLevelName, LogLevelValue } from './';
import Logger from './Logger'
//@ts-ignore
const endpointTypes = require('./endpoints');  // used in dynamic eval, TSC optimizes this out if it's an import

var instance: LogManager | null = null;

/** LogManager is a singleton and cannot be created directly. Use the exported `logging()` function. */
class LogManager extends EventEmitter
{
    private options: ILogOptions = {
        modules: {
            '': LogLevel.INFO
        },
        endpoints: {}
    };

    private loggers: Map<string, Logger> = new Map();
    private endpoints: Map<string, ILogEndpoint> = new Map();
    private logger: Logger;

    constructor() {
        super();
        this.logger = this.getLogger('logging');
    }

    get configuration(): ILogOptions { return Object.assign({}, this.options); }
    get haveEndpoints(): boolean { return this.endpoints.size > 0; }

    static instance(): LogManager {
        if (!instance)
            instance = new LogManager();
        return instance;
    }

    haveEndpointId(idStartsWith: string): boolean {
        for (const key of this.endpoints.keys())
            if (key.startsWith(idStartsWith))
                return true;
        return false;
    }

    haveEndpointName(name: string): boolean {
        for (const ep of this.endpoints.values())
            if (ep.name == name)
                return true;
        return false;
    }

    getEndpointById(idStartsWith: string): ILogEndpoint | null {
        for (const [key, value] of this.endpoints)
            if (key.startsWith(idStartsWith))
                return value;
        return null;
    }

    /** Loads configuration from a JSON file's `logging` member object, if any.
     * JSON parsing errors are reported, but a file missing entirely or not having a valid `logging` object at all is ignored. */
    configureFromFile(file: string): LogManager
    {
        if (!require('fs').existsSync(file))
            return this;

        let jscfg: any = {};
        try {
            jscfg = require(file).logging;
            if (typeof jscfg != "object")
                return this;
        }
        catch(e) {
            this.logError("Error logging configuration file'" + file + "': %s", e);
            return this;
        }

        return this.configureFromJsonOrigin(jscfg);
    }

    /** Parses an `ILogOptions` object which was originally in JSON and converts the LogLevel enum names to actual enums.
     * Then calls `configure()` with the modified options object. */
    configureFromJsonOrigin(jsonConfig: any): LogManager
    {
        let gotConfig: boolean = false;
        if (jsonConfig.modules) {
            for (const [key, value] of Object.entries(jsonConfig.modules)) {
                const ll: LogLevel | undefined = LogLevelValue[(value as string).toUpperCase()];
                if (ll != undefined) {
                    jsonConfig.modules[key] = ll;
                    gotConfig = true;
                }
            }
        }
        if (jsonConfig.endpoints) {
            for (const [key, value] of Object.entries(jsonConfig.endpoints)) {
                if (!value || !(value as any).minLevel)
                    continue;
                const ll: LogLevel | undefined = LogLevelValue[(value as any).minLevel.toUpperCase()];
                if (ll != undefined)
                    jsonConfig.endpoints[key].minLevel = ll;
            }
            gotConfig = true;
        }

        return gotConfig ? this.configure(jsonConfig) : this;
    }

    /** Reads configuation options to set minimum module levels and create/register any specified endpoints.
     * Endpoints in the config are specified by their `name`, eg "Console" or "File", and the corresponding classes must be called `${name}Endpoint`,
     * eg. `ConsoleEndpoint` or `FileEndpoint`, and be exported in `./endpoints.ts`.  */
    configure(options: ILogOptions): LogManager
    {
        this.options = Object.assign({}, this.options, options);

        if (this.options.endpoints) {
            for (const [key, value] of Object.entries(this.options.endpoints)) {
                // don't add disabled endpoints
                if (value && value.minLevel == LogLevel.NONE)
                    continue;
                try {
                    const ep = eval(`new endpointTypes.${key}Endpoint()`);
                    if (ep) {
                        ep.options = value;
                        this.registerEndpoint(ep);
                    }
                }
                catch(e: any) {
                    this.logError("Could not load endpoint '%s' with error: %s\n", key, e, e.stack);
                }
            }
        }
        return this;
    }

    /** Adds an endpoint as an output for log messages and configures it based on options found in the current logging configuration (if any).
     * If an endpoint with the same `uid` already exists then it only modifies its configuratin but will not add another instance. */
    registerEndpoint(endpoint: ILogEndpoint): LogManager
    {
        // check if we already have this endpoint
        let ep: ILogEndpoint | undefined = this.findEndpoint(endpoint.uid);
        const found: boolean = !!ep;
        if (!ep)
            ep = endpoint;

        // check if we have a config for this endpoint
        if (ep.options.minLevel == LogLevel.ANY && this.options.endpoints) {
            const epcfg = this.options.endpoints[ep.name];
            if (epcfg)
                ep.options = epcfg;
        }
        // nothing else to do if we already had it
        if (found)
            return this;
        // otherwise add to our list and register the event callback.
        this.endpoints.set(ep.uid, ep);
        return this.on("log", (le) => endpoint?.logEntry(le) );
    }

    /** Returns a `Logger` instance for the given `module` name. If a logger for this module already exists then it is returned, otherwise a new instance is created.
     * If the optional `minLevel` is passed in, it will override any level set via other methods like in the initial logging configuration. */
    getLogger(module: string, minLevel?: LogLevel): Logger
    {
        let logger = this.findLogger(module);
        if (logger) {
            if (minLevel != undefined)
                logger.minLevel = minLevel;
            return logger;
        }

        if (minLevel == undefined)
            minLevel = this.findClosestModuleMatch(module);

        this.logger?.debug("Adding logger %s with level %d", module, LogLevelName[minLevel]);

        logger = new Logger(this, module, minLevel);
        this.loggers.set(module, logger);
        return logger;
    }

    /** Signals all endpoints to shut down. */
    close()
    {
        for (const ep of this.endpoints.values())
            ep.close();
    }

    private findLogger(module: string): Logger | undefined {
        return this.loggers.get(module);
    }

    private findEndpoint(id: string): ILogEndpoint | undefined {
        return this.endpoints.get(id);
    }

    private findClosestModuleMatch(module: string): LogLevel
    {
        let minLevel: LogLevel = LogLevel.NONE;
        let match = '';
        for (const [key, value] of Object.entries(this.options.modules)) {
            if (module.startsWith(key) && key.length >= match.length) {
                minLevel = value;
                match = key;
            }
        }
        return minLevel;
    }

    private logError(message:any, ...args: any[]) {
        if (this.logger && this.haveEndpoints)
            this.logger.error(message, ...args);
        else
            console.error(message, ...args);
    }
}

const logging = LogManager.instance;
export default logging;

/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
import {LogLevel} from "./";

/** This interface defines the overall logging configuration for minimum logging level(s) and endpoints to use.
    An object of this type can be passed to `LogManager`'s `configure()` method or read from JSON data with the corresponding methods. */
export interface ILogOptions {
    /** Minimum logging levels per module eg.  { "": LogLevel.INFO, "tricky-module": LogLevel.DEBUG, ... } */
    modules: { [module: string]: LogLevel },
    /** Endpoint(s) to use and their options. eg. `{ "File": { minLevel: LogLevel.INFO, file: "/var/log/example.txt", ... } }`  */
    endpoints?: { [name: string]: IEndpointOptions | any }
}

/** Defines common options for all endpoints. Some endpoints may extended these options with more specific ones. */
export interface IEndpointOptions {
    minLevel?: LogLevel;         // Minimum level for this endpoint, overrides any per-module or global level.
    formatter?: ILogFormatter;   // Formatter class to use for formatting the final output.
}

/** Defines a logging output endpoint object. */
export interface ILogEndpoint {
    readonly name: string;    // a static name which should match the first part of the class name, like "Console"
    readonly uid: string;     // a unique ID for a particular instance of an endpoint. eg. "FileEndpoint(/var/log/example.txt)"
    options: IEndpointOptions | any;
    logEntry: (logEntry: ILogEntry) => void;
    close: () => void;
}

/** Defines a log message formatter object. */
export interface ILogFormatter {
    format: (logEntry: ILogEntry) => string;
}

/** Defines a log entry object. */
export interface ILogEntry {
    level: LogLevel;
    timestamp: Date;
    module: string;
    location?: string;
    message: any;
    args?: any[]
}

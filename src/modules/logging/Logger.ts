/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
import { EventEmitter } from 'events';
import { ILogEntry, LogLevel } from './';
import { format as nodeFormat } from 'util';

// used for shortening source file paths when reporting caller location.  hackish.
const sourceRootPath = require('path').normalize(__dirname + "/../../");

/** Use `logging.getLogger()` method (from `LogManager`) to get a new instance of a Logger. */
export default class Logger
{
    /** The module name this Logger is for. */
    module: string;
    /** The minimum severity level of messages this logger will output. */
    minLevel: LogLevel;

    /**
     * Main logging method.
     * @param logLevel Message severity.
     * @param message Message body.
     * @param ...args Additional formatting substitution values (like console.log(), et. al.).
     */
    log(logLevel: LogLevel, message: any, ...args: any[]): void { this.log_impl(logLevel, message, ...args); }
    /** Convenience for `log(LogLevel.TRACE, message, ...args)` */
    trace(message: any, ...args: any[]): void    { this.log_impl(LogLevel.TRACE, message, ...args); }
    /** Convenience for `log(LogLevel.DEBUG, message, ...args)` */
    debug(message: any, ...args: any[]): void    { this.log_impl(LogLevel.DEBUG, message, ...args); }
    /** Convenience for `log(LogLevel.INFO, message, ...args)` */
    info(message: any, ...args: any[]): void     { this.log_impl(LogLevel.INFO, message, ...args); }
    /** Convenience for `log(LogLevel.WARNING, message, ...args)` */
    warn(message: any, ...args: any[]): void     { this.log_impl(LogLevel.WARNING, message, ...args); }
    /** Convenience for `log(LogLevel.ERROR, message, ...args)` */
    error(message: any, ...args: any[]): void    { this.log_impl(LogLevel.ERROR, message, ...args); }
    /** Convenience for `log(LogLevel.CRITICAL, message, ...args)`.
     * After logging the message, it also throws an `Error` type exception with the same message
     * and the location of the original call to `critical()` as the error's `cause` property. */
    critical(message: any, ...args: any[]): void { this.log_impl(LogLevel.CRITICAL, message, ...args); }

    /////////////

    private logManager: EventEmitter;

    /** Typically you would not construct a Logger directly but instead use `logging().getLogger()` or `LogManager.instance().getLogger()`. */
    constructor(logManager: EventEmitter, module: string, minLevel: LogLevel) {
        this.logManager = logManager;
        this.module = module;
        this.minLevel = minLevel;
    }

    private async log_impl(logLevel: LogLevel, message: any, ...args: any[]): Promise<void>
    {
        if (logLevel < this.minLevel)
            return;

        const logEntry: ILogEntry = {
            level: logLevel,
            timestamp: new Date(),
            module: this.module,
            message: message,
            args: args.length ? Array.from(args) : undefined,
        };

        // This creates a new stack trace and pulls the caller from it.
        if (logLevel < LogLevel.INFO) {
            const error:any = {};
            // The stack trace will start at the function _before_ this one. Since all the public log functions
            // are proxies for this one, we know they're the next ones up the stack and the one before that will be the caller.
            Error.captureStackTrace(error, this.log_impl);
            // console.dir(error.stack);
            if (error.stack) {
                const sla = error.stack.split("\n", 4);
                // The first line is "Error:" and the 2nd is the log method that was actually called, so we want the 3rd array member.
                if (sla.length > 2)
                    logEntry.location = sla[2].slice(sla[2].indexOf("at ") + 3).replace(sourceRootPath, '');
            }
        }

        this.logManager.emit('log', logEntry);
        if (logLevel == LogLevel.CRITICAL)
            throw new Error(nodeFormat(message, ...args), { cause: logEntry.location });
    }

}

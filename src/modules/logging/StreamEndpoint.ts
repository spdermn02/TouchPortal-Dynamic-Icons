/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
import { Console } from 'console';
import { Writable } from 'stream'
import { ILogEndpoint, ILogEntry, ILogFormatter, IEndpointOptions, LogLevel, logging, Logger, DefaultFormatter } from './';
import { deepAssign } from './utils';

export interface StreamEndpointOptions extends IEndpointOptions {
    outStream?: Writable | null;
    errStream?: Writable | null;
    /** Write TRACE level with a stack dump just like `console.trace()` does. Default is false. */
    traceWithStackDump?: boolean;
    /** Passed to util.inspect() */
    inspectOptions?: any;
}

/** The StreamEndpoint will output to any `stream.Writable` type.
    Separate streams can be used for <= INFO level and >= WARNING level messages (like stdout and stderr).
    It is essentially a wrapper for Node's `Console` class which does the actual output. Any arguments in the log entry are passed
    on to `Console` methods, so formatting works the same way as the various `console.*` functions. If there are no arguments
    then no extra formatting will take place (eg. to pre-format a message using some other method first).

    This endpoint type is mainly useful for subclassing, though it could be used directly as well.
    The Console and File endpoints are subclasses of this one.
*/
export default class StreamEndpoint implements ILogEndpoint
{
    readonly name: string = "Stream";

    protected level: LogLevel = LogLevel.ANY;
    protected formatter: ILogFormatter = new DefaultFormatter();
    protected logger: Logger;
    protected outStream: Writable | null = null;
    protected errStream: Writable | null = null;
    protected traceWithStackDump: boolean = false;

    private cnsl: Console | null = null;

    // c'tor overloads
    constructor(streamOptions?: StreamEndpointOptions);
    constructor(stream: Writable, options?: StreamEndpointOptions);
    constructor(outStream: Writable, errStream: Writable, options?: StreamEndpointOptions);
    // implementation
    constructor(
        streamOptionsOrOut?: StreamEndpointOptions | Writable,
        optionsOrErr?: Writable | StreamEndpointOptions,
        options?: StreamEndpointOptions
    ) {
        this.logger = logging().getLogger('logging');
        const opts: StreamEndpointOptions = {
            outStream: streamOptionsOrOut instanceof Writable ? streamOptionsOrOut : streamOptionsOrOut?.outStream,
            errStream: optionsOrErr instanceof Writable ? optionsOrErr : undefined
        }

        if (optionsOrErr && !(optionsOrErr instanceof Writable))
            deepAssign(opts, optionsOrErr);
        else if (options)
            deepAssign(opts, options);

        this.options = opts;
    }

    get uid(): string { return `${this.name}(${this.outStream},${this.errStream})`; }

    get options(): StreamEndpointOptions {
        return {
            minLevel: this.level,
            formatter: this.formatter,
            outStream: this.outStream,
            errStream: this.errStream,
            traceWithStackDump: this.traceWithStackDump
        };
    }

    set options(options: StreamEndpointOptions) {
        if (typeof options.minLevel == "number")
            this.level = options.minLevel;
        if (options.formatter)
            this.formatter = options.formatter;
        if (typeof options.traceWithStackDump == 'boolean')
            this.traceWithStackDump = options.traceWithStackDump;
        if (options.outStream) {
            this.close();
            this.outStream = options.outStream;
            this.errStream = options.errStream || options.outStream;
            this.cnsl = new Console({
                stdout: this.outStream,
                stderr: this.errStream,
                inspectOptions: options.inspectOptions,
            });
        }
        else if (options.outStream === null) {
            this.close();
        }
    }

    get minLevel(): LogLevel { return this.level; }
    set minLevel(level: LogLevel) { this.options.minLevel = this.level = level; }

    async logEntry(entry: ILogEntry)
    {
        if (!this.cnsl || entry.level < this.level)
            return;

        const msg = this.formatter.format(entry);
        let fn: Function;
        switch (entry.level) {
            case LogLevel.TRACE:
                if (this.traceWithStackDump)
                    fn = this.cnsl.trace;
                else
                    fn = this.cnsl.log;
                break;
            case LogLevel.DEBUG:
            case LogLevel.INFO:
                fn = this.cnsl.log;
                break;
            case LogLevel.WARNING:
            case LogLevel.ERROR:
            case LogLevel.CRITICAL:
                fn = this.cnsl.error;
                break;
            default:
                return;
        }
        if (entry.args && entry.args.length)
            fn.apply(null, [msg, ...entry.args]);
        else
            fn(msg);
    }

    close()
    {
        try {
            if (this.outStream)
                this.outStream.end();
            if (this.errStream)
                this.errStream.end();
        }
        catch { }
        this.cnsl = null;
        this.outStream = null;
        this.errStream = null;
    }

}

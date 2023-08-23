/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
import { createWriteStream, WriteStream, renameSync } from 'fs';
import { stat as fstat, readdir as readdirAsync, rm as rmAsync } from 'fs/promises';
import { resolve as presolve, parse as pparse, join as pjoin } from 'path';
import StreamEndpoint from './StreamEndpoint'
import { IEndpointOptions } from './';
import { formatDateTimeFileStamp } from './utils';

/** Configuration settings for all instances of FileEndpoint. */
export const FileEndpointConfig = {
    /** Default base path for relative log file specs. */
    BasePath: !!process["pkg"] ? require('path').dirname(process.execPath) : process.cwd()
}

/** Settings per instance of the endpoint, extends the generic `IEndpointOptions`. */
export interface FileEndpointOptions extends IEndpointOptions {
    file: string;     // path/name of log file
    maxSize: number;  // max file size in MB
    keep: number;     // # of old logs to keep
}

export default class FileEndpoint extends StreamEndpoint
{
    readonly name: string = "File";

    private file: string = "";
    private stream: WriteStream | null = null;
    private maxSize: number = 20;  // MB
    private keep: number = 7;
    private fileCheckTimer: NodeJS.Timeout | null = null;

    constructor(options?: FileEndpointOptions) {
        super();
        this.options = options;
    }

    get uid(): string { return `FileEndpoint(${this.file})`; }

    get options(): FileEndpointOptions | any {
        return Object.assign(super.options, {
            file: this.file,
            maxSize: this.maxSize / 1024 / 1024,
            keep: this.keep
        });
    }
    set options(options: FileEndpointOptions | any)
    {
        if (!options)
            return;
        if (typeof options.maxSize == "number" && options.maxSize > 0)
            this.maxSize = options.maxSize * 1024 * 1024;
        if (typeof options.keep == "number")
            this.keep = options.keep;

        // save minLevel and formatter options
        super.options = options;

        if (options.file !== undefined) {
            const resolvFile = options.file ? presolve(FileEndpointConfig.BasePath, options.file) : "";
            if (resolvFile != this.file) {
                this.file = resolvFile;
                this.closeFile();
                if (resolvFile)
                    this.openFile();
            }
        }
    }

    write(chunk: any, ...args: any[]) {
        if (this.stream)
            this.stream.write(chunk, ...args);
    }

    private openFile()
    {
        try {
            this.stream = createWriteStream(this.file, { flags: 'a', encoding: 'utf8' });
            super.options = { outStream: this.stream };
            this.stream.on('close', () => { this.closeFile(); });

            if (!this.fileCheckTimer) {
                this.fileCheckTimer = setInterval(() => this.checkFileRotation(), 600000);
                this.fileCheckTimer.unref();
            }
        }
        catch(e: any) {
            this.logger.error("Could not open %s file for writing with error: %s", this.file, e);
            this.stream = null;
        }
    }

    private closeFile()
    {
        if (!this.stream)
            return;

        if (this.outStream)
            super.options = { outStream: null };
        if (!this.stream.closed) {
            try { this.stream.close(); }
            catch(e: any) { this.logger.error("Error closing file: %s", e); }
        }
        this.stream = null;
        if (this.fileCheckTimer)
            clearInterval(this.fileCheckTimer);
        this.fileCheckTimer = null;
    }

    private async checkFileRotation()
    {
        if (!this.stream)
            return;
        const size = (await fstat(this.file)).size;
        if (size && size >= this.maxSize)
            this.rotate();
    }

    private rotate()
    {
        if (!this.stream)
            return;
        const parse = pparse(this.file);
        const newName = `${parse.name}_${formatDateTimeFileStamp(new Date())}${parse.ext}`;
        this.closeFile();
        try {
            renameSync(this.file, presolve(parse.dir, newName));
        }
        catch(e) {
            this.logger?.error("Failed to rename current log file %s with error: %s", this.file, e);
        }
        this.openFile();
        this.logger.info("Log file rotation completed for '%s'; Old log saved as '%s'", parse.base, newName);
        this.cleanOldLogs();
    }

    private async cleanOldLogs()
    {
        let count = 0;
        const parse = pparse(this.file);
        try {
            const files = await readdirAsync(parse.dir);
            for (const file of files) {
                if (file.startsWith(parse.name) && ++count > this.keep) {
                    rmAsync(pjoin(parse.dir, file), { force: true });
                    this.logger.info("Removing old log file %s", file);
                }
            }
        }
        catch(e) {
            this.logger.error("Failed to get listing for log dir '%s' with error: %s", parse.dir, e);
        }
    }

}

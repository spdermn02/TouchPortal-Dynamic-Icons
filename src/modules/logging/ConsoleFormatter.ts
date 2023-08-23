/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
import { ILogEntry, ILogFormatter } from ".";
import { formatTimeLocal as formatDate } from "./utils";
// import ac from 'ansi-colors';

// graphical log level indicators in place of text labels
const LogLevelIcon = [
    " ",    // ALL
    "🟣",   // TRC
    "🔵",   // DBG
    "🟢",   // INF
    "🟡",   // WRN
    "🟠",   // ERR
    "🔴",   // CRT
    " ",    // NUL
];

// terminal color codes for wrapping various parts of the log message
// https://en.m.wikipedia.org/wiki/ANSI_escape_code#Colors
const Theme = {
    timestamp: 95,   // bright magenta
    module:    96,   // bright cyan
    location:  37,   // white
}

const ansiColor = (code: number, str: string): string => { return `\x1b[${code}m${str}\x1b[39m` }

// LVL TIMESTAMP    MODULE              MESSAGE                               LOCATION (if any)
// 🔵 01:39:18.92 [imgcache] Image cache miss for nav_hdg_bug.svg; ...  [@ modules\ImageCache.ts:156:29]
export default class ConsoleFormatter implements ILogFormatter
{
    format(entry: ILogEntry): string
    {
        return (
            `${
                LogLevelIcon[entry.level]
            } ${
                ansiColor(Theme.timestamp, formatDate(entry.timestamp))
            } [${
                ansiColor(Theme.module, entry.module)
            }] ${
                entry.message
            }${
                entry.location ? ansiColor(Theme.location, '  [@ ' + entry.location + ']') : ''
            }`
        );
    }
}

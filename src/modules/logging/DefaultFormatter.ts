/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
import { ILogEntry, ILogFormatter, LogLevelName3 } from ".";
import { formatDateTimeLocal as formatDate } from "./utils";
import { format } from 'util';

//    TIMESTAMP       LVL    MODULE              MESSAGE                               LOCATION (if any)
// 08-22 01:39:18.92 [DBG] [imgcache] Image cache miss for nav_hdg_bug.svg; ...  [@ modules\ImageCache.ts:156:29]
export default class DefaultFormatter implements ILogFormatter
{
    format(entry: ILogEntry): string
    {
        return (
            `${
                formatDate(entry.timestamp)
            } [${
                LogLevelName3[entry.level]
            }] {${
                entry.module
            }} ${
                entry.message
            }${
                entry.location ? '  [@ ' + entry.location + ']' : ''
            }`
        );
    }
}

/** Same as default formatter but first formats the message body and any args using Node's util.format().
    This is what the Console class writer (used in StreamEndpoint and subclasses) already does so it's not necessary
    for those endpoints, but may be for others endpoints types.
    The current args array of the log entry, if any, is cleared after being used in the format() call.
 */
export class MessagePreFormatter extends DefaultFormatter
{
    format(entry: ILogEntry): string
    {
        if (entry.args && entry.args.length) {
            entry.message = format.apply(null, [entry.message, ...entry.args]);
            entry.args = undefined;
        }
        return super.format(entry);
    }
}

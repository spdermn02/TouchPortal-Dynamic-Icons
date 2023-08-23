/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
const n2s = (n: number) => n.toString().padStart(2, '0');

// MM-DD HH:MM:SS.zzz
export function formatDateTimeUTC(ts: Date): string
{
    return `${n2s(ts.getUTCMonth()+1)}-${n2s(ts.getUTCDate())} ${n2s(ts.getUTCHours())}:${n2s(ts.getUTCMinutes())}:${n2s(ts.getUTCSeconds())}.${n2s(ts.getUTCMilliseconds())}`;
}

// MM-DD HH:MM:SS.zzz
export function formatDateTimeLocal(ts: Date): string
{
    return `${n2s(ts.getMonth()+1)}-${n2s(ts.getDate())} ${n2s(ts.getHours())}:${n2s(ts.getMinutes())}:${n2s(ts.getSeconds())}.${n2s(ts.getMilliseconds())}`;
}

// HH:MM:SS.zzz
export function formatTimeLocal(ts: Date): string
{
    return `${n2s(ts.getHours())}:${n2s(ts.getMinutes())}:${n2s(ts.getSeconds())}.${n2s(ts.getMilliseconds())}`;
}

// MMDDTHHMMSS
export function formatDateTimeFileStamp(ts: Date): string
{
    return `${n2s(ts.getMonth()+1)}${n2s(ts.getDate())}T${n2s(ts.getHours())}${n2s(ts.getMinutes())}${n2s(ts.getSeconds())}`;
}

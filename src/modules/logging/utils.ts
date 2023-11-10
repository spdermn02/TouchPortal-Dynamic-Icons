/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/
const n2s = (n: number) => n.toString().padStart(2, '0');
const n2s3 = (n: number) => n.toString().padStart(3, '0');

// MM-DD HH:MM:SS.zzz
export function formatDateTimeUTC(ts: Date): string
{
    return `${n2s(ts.getUTCMonth()+1)}-${n2s(ts.getUTCDate())} ${n2s(ts.getUTCHours())}:${n2s(ts.getUTCMinutes())}:${n2s(ts.getUTCSeconds())}.${n2s3(ts.getUTCMilliseconds())}`;
}

// MM-DD HH:MM:SS.zzz
export function formatDateTimeLocal(ts: Date): string
{
    return `${n2s(ts.getMonth()+1)}-${n2s(ts.getDate())} ${n2s(ts.getHours())}:${n2s(ts.getMinutes())}:${n2s(ts.getSeconds())}.${n2s3(ts.getMilliseconds())}`;
}

// HH:MM:SS.zzz
export function formatTimeLocal(ts: Date): string
{
    return `${n2s(ts.getHours())}:${n2s(ts.getMinutes())}:${n2s(ts.getSeconds())}.${n2s3(ts.getMilliseconds())}`;
}

// MMDDTHHMMSS
export function formatDateTimeFileStamp(ts: Date): string
{
    return `${n2s(ts.getMonth()+1)}${n2s(ts.getDate())}T${n2s(ts.getHours())}${n2s(ts.getMinutes())}${n2s(ts.getSeconds())}`;
}

// A recursive Object.assign(). Not incredibly safe.
export function deepAssign(target: any, ...sources: any[]) {
  for (const source of sources) {
    for (const k in source) {
      let vs = source[k], vt = target[k];
      if (Object(vs) == vs && Object(vt) === vt) {
        target[k] = deepAssign(vt, vs);
        continue;
      }
      target[k] = source[k];
    }
  }
  return target
}

/*
    Simple logging framework.
    Copyright Maxim Paperno, all rights reserved.
    License: MIT
*/

/** Logging severity levels. */
export const enum LogLevel {
    ANY,        // log all levels
    TRACE,
    DEBUG,
    INFO,
    WARNING,
    ERROR,
    CRITICAL,   // throws Error exception after logging
    NONE,       // suppress logging, eg. for an endpoint
}

/** Reverse lookup eg. for parsing json config. */
export const LogLevelValue = {
    "ANY"      : LogLevel.ANY,
    "TRACE"    : LogLevel.TRACE,
    "DEBUG"    : LogLevel.DEBUG,
    "INFO"     : LogLevel.INFO,
    "WARNING"  : LogLevel.WARNING,
    "ERROR"    : LogLevel.ERROR,
    "CRITICAL" : LogLevel.CRITICAL,
    "NONE"     : LogLevel.NONE,
}

/** Full name indexed by value */
export const LogLevelName = [
    "ANY",
    "TRACE",
    "DEBUG",
    "INFO",
    "WARNING",
    "ERROR",
    "CRITICAL",
    "NONE",
];

/** Shorter name (max. 5 chars) indexed by value. */
export const LogLevelNameShort = [
    "ANY",
    "TRACE",
    "DEBUG",
    "INFO",
    "WARN",
    "ERROR",
    "CRIT",
    "NONE",
];

/** Abbreviated 3-character name indexed by value. */
export const LogLevelName3 = [
    "ANY",
    "TRC",
    "DBG",
    "INF",
    "WRN",
    "ERR",
    "CRT",
    "NUL",
];

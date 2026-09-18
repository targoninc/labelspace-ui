export enum LogLevel {
    debug = 0,
    success = 1,
    info = 2,
    warning = 3,
    error = 4,
    critical = 5,
    unknown = 6,
}

const logLevelLabels: Record<number, string> = {
    [LogLevel.debug]: "Debug",
    [LogLevel.success]: "Success",
    [LogLevel.info]: "Info",
    [LogLevel.warning]: "Warning",
    [LogLevel.error]: "Error",
    [LogLevel.critical]: "Critical",
    [LogLevel.unknown]: "Unknown",
};

const logLevelClassNames: Record<number, string> = {
    [LogLevel.debug]: "debug",
    [LogLevel.success]: "success",
    [LogLevel.info]: "info",
    [LogLevel.warning]: "warning",
    [LogLevel.error]: "error",
    [LogLevel.critical]: "critical",
    [LogLevel.unknown]: "unknown",
};

export function getLogLevelLabel(logLevel: number) {
    return logLevelLabels[logLevel] ?? logLevelLabels[LogLevel.unknown];
}

export function getLogLevelClassName(logLevel: number) {
    return logLevelClassNames[logLevel] ?? logLevelClassNames[LogLevel.unknown];
}

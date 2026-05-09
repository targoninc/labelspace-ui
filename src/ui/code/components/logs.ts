import {Log} from "../models/db/tri/Log.ts";
import {Api} from "../api/api.ts";
import {Generics} from "./generic/generics.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {getLogLevelClassName, getLogLevelLabel, LogLevel} from "../enums/LogLevel.ts";
import {notify} from "../functions/notifications.ts";
import {compute, create, signal, when} from "@targoninc/jess";
import {button, input} from "@targoninc/jess-components";

export class Logs {
    static page() {
        const logs = signal<Log[]>([]);
        const loading = signal(false);
        const logLevel = signal("all");
        const message = signal("");
        const startTime = signal("");
        const endTime = signal("");
        const invalidTimeRange = compute((start, end) => !!start && !!end && new Date(start) > new Date(end), startTime, endTime);
        const noResults = compute((entries, isLoading) => entries.length === 0 && !isLoading, logs, loading);
        const logLevelOptions = [
            {id: "all", name: "All levels"},
            {id: LogLevel.debug.toString(), name: getLogLevelLabel(LogLevel.debug)},
            {id: LogLevel.success.toString(), name: getLogLevelLabel(LogLevel.success)},
            {id: LogLevel.info.toString(), name: getLogLevelLabel(LogLevel.info)},
            {id: LogLevel.warning.toString(), name: getLogLevelLabel(LogLevel.warning)},
            {id: LogLevel.error.toString(), name: getLogLevelLabel(LogLevel.error)},
            {id: LogLevel.critical.toString(), name: getLogLevelLabel(LogLevel.critical)},
            {id: LogLevel.unknown.toString(), name: getLogLevelLabel(LogLevel.unknown)},
        ];
        let reloadQueued = false;
        const logLevelSelect = create("select")
            .classes("jess", "log-filter-select")
            .children(
                ...logLevelOptions.map(option => create("option")
                    .attributes("value", option.id)
                    .text(option.name)
                    .build())
            ).build() as HTMLSelectElement;
        logLevelSelect.value = logLevel.value;
        logLevelSelect.onchange = () => {
            logLevel.value = logLevelSelect.value;
            load();
        };

        const load = () => {
            if (invalidTimeRange.value) {
                return;
            }

            if (loading.value) {
                reloadQueued = true;
                return;
            }

            loading.value = true;
            reloadQueued = false;
            Api.getLogs({
                logLevel: logLevel.value === "all" ? undefined : parseInt(logLevel.value, 10),
                message: message.value.trim() || undefined,
                startTime: startTime.value ? new Date(startTime.value).toISOString() : undefined,
                endTime: endTime.value ? new Date(endTime.value).toISOString() : undefined,
            })
                .then(l => logs.value = l)
                .catch((error: Error) => {
                    notify(error.message ?? "Failed to load logs.", NotificationType.error);
                })
                .finally(() => {
                    loading.value = false;
                    if (reloadQueued) {
                        load();
                    }
                });
        };

        const clearFilters = () => {
            logLevel.value = "all";
            logLevelSelect.value = "all";
            message.value = "";
            startTime.value = "";
            endTime.value = "";
            load();
        };

        load();

        return Generics.pageFrame(
            create("div")
                .classes("flex-v", "logs-page")
                .children(
                    Generics.heading(2, "Logs"),
                    create("div")
                        .classes("container", "layer-2", "border", "log-filters")
                        .children(
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    create("label")
                                        .classes("jess", "flex-v", "log-filter-label")
                                        .children(
                                            create("span")
                                                .text("Log level")
                                                .build(),
                                            logLevelSelect
                                        ).build()
                                ).build(),
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    input({
                                        type: "text",
                                        name: "messageFilter",
                                        label: "Message",
                                        placeholder: "Filter by message",
                                        value: message,
                                        onchange: (value) => {
                                            message.value = value;
                                            load();
                                        }
                                    })
                                ).build(),
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    input({
                                        type: "datetime-local",
                                        name: "startTime",
                                        label: "From",
                                        value: startTime,
                                        onchange: (value) => {
                                            startTime.value = value;
                                            load();
                                        }
                                    })
                                ).build(),
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    input({
                                        type: "datetime-local",
                                        name: "endTime",
                                        label: "To",
                                        value: endTime,
                                        onchange: (value) => {
                                            endTime.value = value;
                                            load();
                                        }
                                    })
                                ).build(),
                            create("div")
                                .classes("flex", "center-items", "log-filter-actions")
                                .children(
                                    button({
                                        text: "Clear",
                                        icon: { icon: "clear" },
                                        disabled: loading,
                                        onclick: clearFilters,
                                    }),
                                    when(loading, Generics.loading())
                                ).build()
                        ).build(),
                    when(invalidTimeRange, create("span")
                        .classes("error")
                        .text("Start time must be before end time.")
                        .build()),
                    when(noResults, create("span")
                        .text("No logs found for the current filters.")
                        .build()),
                    Generics.table(
                        ["Time", "Level", "Message"],
                        logs,
                        (log: Log) => {
                            const levelClassName = getLogLevelClassName(log.logLevel);
                            return create("tr")
                                .classes("log-row", `log-${levelClassName}`)
                                .children(
                                    create("td")
                                        .text(`${new Date(log.time).toLocaleString(undefined, {timeZone: "UTC"})} UTC`)
                                        .build(),
                                    create("td")
                                        .children(
                                            create("span")
                                                .classes("log-level-pill", `log-${levelClassName}`)
                                                .text(getLogLevelLabel(log.logLevel))
                                                .build()
                                        ).build(),
                                    create("td")
                                        .classes("log-message")
                                        .title(log.message)
                                        .text(log.message)
                                        .build()
                                ).build();
                        },
                        ["scroll-table"]
                    )
                ).build()
        );
    }
}

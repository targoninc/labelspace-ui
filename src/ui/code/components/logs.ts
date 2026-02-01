import {Log} from "../models/db/tri/Log.ts";
import {Api} from "../api/api.ts";
import {Generics} from "./generic/generics.ts";
import {signal, when} from "@targoninc/jess";

export class Logs {
    static page() {
        const logs = signal<Log[]>([]);
        const loading = signal(false);
        Api.getLogs()
            .then(l => logs.value = l)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            Generics.heading(2, "Logs"),
            when(loading, Generics.loading()),
            Generics.table(
                ["Time", "Level", "Message"],
                logs,
                (log: Log) => Generics.tableRow(
                    new Date(log.time).toLocaleString(undefined, {timeZone: 'UTC'}),
                    log.logLevel,
                    log.message
                )
            )
        );
    }
}
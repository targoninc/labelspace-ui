import {Log} from "../models/db/tri/Log.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {Api} from "../api/api.ts";
import {Generics} from "./generics.ts";
import {ifjs} from "../../fjsc/src/f2.ts";

export class Logs {
    static page() {
        const logs = signal<Log[]>([]);
        const loading = signal(false);
        Api.getLogs()
            .then(l => logs.value = l)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            Generics.heading(2, "Logs"),
            ifjs(loading, Generics.loading()),
            Generics.table(
                ["Time", "Level", "Message"],
                logs,
                (log: Log) => Generics.tableRow(
                    new Date(log.time).toLocaleString(),
                    log.logLevel,
                    log.message
                )
            )
        );
    }
}
import {FJSC} from "../../fjsc";
import {Api} from "../api/api.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {Generics} from "./generics.ts";

export class Migration {
    static dataImport() {
        const loading = signal(false);

        return create("div")
            .classes("flex", "center-items")
            .children(
                FJSC.button({
                    text: "Import data",
                    classes: ["positive"],
                    disabled: loading,
                    onclick: () => {
                        loading.value = true;
                        Api.importData().then(() => {
                            notify("Imported data", NotificationType.success);
                        }).finally(() => loading.value = false);
                    }
                }),
                ifjs(loading, Generics.loading())
            ).build();
    }
}
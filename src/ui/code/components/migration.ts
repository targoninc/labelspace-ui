import {FJSC} from "../../fjsc";
import {Api} from "../api/api.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {Generics} from "./generic/generics.ts";

export class Migration {
    static dataImport() {
        const loading = signal(false);

        return create("div")
            .classes("flex", "center-items")
            .children(
                FJSC.button({
                    text: "Import data",
                    icon: { icon: "database" },
                    disabled: loading,
                    onclick: () => {
                        loading.value = true;
                        Api.importData().then(() => {
                            notify("Imported data", NotificationType.success);
                        }).finally(() => loading.value = false);
                    }
                }),
                FJSC.button({
                    text: "Upload royalties",
                    icon: { icon: "upload" },
                    disabled: loading,
                    onclick: async () => {
                        loading.value = true;

                        async function uploadFile(): Promise<File | null> {
                            return new Promise((resolve, reject) => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = ".csv";
                                input.style.display = "none";

                                input.addEventListener("change", () => {
                                    if (input.files && input.files.length > 0) {
                                        resolve(input.files[0]);
                                    } else {
                                        resolve(null);
                                    }
                                });

                                input.onabort = () => loading.value = false;
                                input.oncancel = () => loading.value = false;

                                document.body.appendChild(input);
                                input.click();

                                input.addEventListener("blur", () => {
                                    document.body.removeChild(input);
                                });
                            });
                        }

                        const file = await uploadFile();
                        if (!file) {
                            loading.value = false;
                            notify("No file selected", NotificationType.error);
                            return;
                        }

                        const content = await file.text();
                        Api.addRoyalties(content).then(() => {
                            notify("Imported data", NotificationType.success);
                        }).finally(() => loading.value = false);
                    }
                }),
                ifjs(loading, Generics.loading())
            ).build();
    }
}
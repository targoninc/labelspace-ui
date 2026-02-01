import {Api} from "../api/api.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {Generics} from "./generic/generics.ts";
import {button, input} from "@targoninc/jess-components";
import {create, InputType, signal, when} from "@targoninc/jess";

export class Migration {
    static dataImport() {
        const loading = signal(false);

        return create("div")
            .classes("flex", "center-items")
            .children(
                button({
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
                button({
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
                when(loading, Generics.loading())
            ).build();
    }

    static quarterlyReport() {
        const loading = signal(false);
        const now = new Date();
        const year = signal(now.getUTCFullYear());
        const quarter = signal(Math.ceil((now.getUTCMonth() + 1) / 4));

        return create("div")
            .classes("flex")
            .children(
                input({
                    value: year,
                    type: InputType.number,
                    onchange: newYear => year.value = newYear,
                    disabled: loading,
                    name: "year",
                    placeholder: "Year"
                }),
                input({
                    value: quarter,
                    attributes: ["min", "1", "max", "4"],
                    type: InputType.number,
                    onchange: newQuarter => quarter.value = newQuarter,
                    disabled: loading,
                    name: "quarter",
                    placeholder: "Quarter"
                }),
                button({
                    text: "Quarterly report",
                    icon: { icon: "analytics" },
                    disabled: loading,
                    onclick: () => {
                        loading.value = true;
                        Api.quarterlyReport(year.value, quarter.value).then((data) => {
                            if (!data) {
                                notify("Failed to generate report", NotificationType.error);
                                return;
                            }

                            // Create a Blob from the CSV string
                            const blob = new Blob([data.data], { type: "text/csv;charset=utf-8;" });

                            // Create a temporary link to trigger a download
                            const link = document.createElement("a");
                            const url = URL.createObjectURL(blob);

                            link.href = url;
                            link.download = "quarterly_report.csv"; // Specify the file name for the download
                            link.style.display = "none";

                            document.body.appendChild(link);
                            link.click();

                            // Cleanup
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);

                            notify("Report downloaded successfully", NotificationType.success);
                        }).finally(() => loading.value = false);
                    }
                }),
            ).build();
    }
}
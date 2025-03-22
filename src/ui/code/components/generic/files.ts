import {create, getValue, ifjs, signalMap, TypeOrSignal} from "../../../fjsc/src/f2";
import {FJSC} from "../../../fjsc";
import {compute, signal, Signal} from "../../../fjsc/src/signals.ts";
import {getFileUrl} from "../../functions/templates.ts";
import {MediaFileType} from "../../enums/MediaFileType.ts";
import {Permissions} from "../../enums/Permissions.ts";
import {currentUser} from "../../state.ts";
import {uploadFile} from "../../functions/media.ts";
import {Api} from "../../api/api.ts";
import {notify} from "../../functions/notifications.ts";
import {NotificationType} from "../../enums/NotificationType.ts";
import {Generics} from "./generics.ts";

export class Files {
    static file(type: MediaFileType, id: Signal<number>, fileName: string, changeable: TypeOrSignal<boolean>, refresh = () => {}) {
        const loading = signal(false);

        return create("div")
            .classes("flex-v", "container", "border", "layer-2")
            .children(
                create("span")
                    .text(fileName)
                    .build(),
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        FJSC.button({
                            icon: {icon: "open_in_new"},
                            text: "Open",
                            classes: ["positive"],
                            disabled: loading,
                            onclick: () => {
                                window.open(getFileUrl(type, id.value, fileName), "_blank");
                            }
                        }),
                        ifjs(changeable, FJSC.button({
                            icon: {icon: "upload"},
                            text: "Replace",
                            disabled: loading,
                            onclick: () => {
                                uploadFile(loading, type, id.value, fileName, "*/*", refresh);
                            }
                        })),
                        ifjs(changeable, FJSC.button({
                            icon: {icon: "delete"},
                            text: "Delete",
                            classes: ["negative"],
                            disabled: loading,
                            onclick: () => {
                                loading.value = true;
                                Api.deleteMedia(type, getValue(id))
                                    .then(() => {
                                        notify("Deleted media", NotificationType.success);
                                        refresh();
                                    })
                                    .finally(() => loading.value = false);
                            }
                        })),
                    ).build()
            ).build();
    }

    static files(files: Signal<string[]>, type: MediaFileType, id: Signal<number>, refresh = () => {}) {
        const hasFileManagementPermission = compute(u => u?.permissions?.some(p => p.name === Permissions.fileManagement) ?? false, currentUser);
        const loading = signal(false);

        return create("div")
            .classes("container", "border", "layer-1", "flex-v")
            .children(
                Generics.heading(2, "Files"),
                signalMap(files, create("div").classes("flex"), fileName => Files.file(type, id, fileName, hasFileManagementPermission, refresh)),
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        ifjs(hasFileManagementPermission, FJSC.button({
                            text: "Add file",
                            icon: {icon: "add"},
                            classes: ["positive"],
                            disabled: loading,
                            onclick: () => {
                                uploadFile(loading, type, id.value, null, "*/*", refresh);
                            }
                        }))
                    ).build()
            ).build();
    }
}
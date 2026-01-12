import {getFileUrl} from "../../functions/templates.ts";
import {MediaFileType} from "../../enums/MediaFileType.ts";
import {Permissions} from "../../enums/Permissions.ts";
import {currentUser} from "../../state.ts";
import {uploadFile} from "../../functions/media.ts";
import {Api} from "../../api/api.ts";
import {notify} from "../../functions/notifications.ts";
import {NotificationType} from "../../enums/NotificationType.ts";
import {Generics} from "./generics.ts";
import {Modals} from "../modals.ts";
import {compute, create, getValue, signal, Signal, signalMap, TypeOrSignal, when} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";
import {AlbumAttachment} from "../../models/db/tri/AlbumAttachment.ts";
import {Album} from "../../models/db/tri/Album.ts";

export class Files {
    static file(type: MediaFileType, attachment: AlbumAttachment, album: Album | null, changeable: TypeOrSignal<boolean>, refresh = () => {}) {
        const loading = signal(false);
        const albumArtists = album?.artists.split(",").map(a => a.trim()) ?? [];
        const visibleTo = signal(attachment.visible_to_artists?.split(",").map(a => a.trim()) ?? []);
        const hasFileManagementPermission = compute(u => u?.permissions?.some(p => p.name === Permissions.fileManagement) ?? false, currentUser);

        return create("div")
            .classes("flex-v", "container", "border", "layer-2")
            .children(
                create("span")
                    .text(attachment.name)
                    .build(),
                when(hasFileManagementPermission, create("div")
                    .classes("flex")
                    .children(
                        ...albumArtists.map(a => button({
                            text: a,
                            classes: [compute((v): string => v.includes(a) ? "active" : "_", visibleTo)],
                            onclick: () => {
                                const old = visibleTo.value;
                                visibleTo.value = old.includes(a) ? old.filter(v => v !== a) : [...old, a];
                                loading.value = true;
                                Api.updateAttachment(attachment.id, visibleTo.value.join(", "))
                                    .then(() => notify("Successfully updated visibility", NotificationType.success))
                                    .catch(() => visibleTo.value = old)
                                    .finally(() => loading.value = false);
                            }
                        })),
                    ).build()),
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        button({
                            icon: {icon: "open_in_new"},
                            text: "Open",
                            classes: ["positive"],
                            disabled: loading,
                            onclick: () => {
                                window.open(getFileUrl(type, attachment.id, attachment.name), "_blank");
                            }
                        }),
                        when(changeable, button({
                            icon: {icon: "upload"},
                            text: "Replace",
                            disabled: loading,
                            onclick: () => {
                                Modals.confirm(() => {
                                    uploadFile(loading, type, attachment.id, attachment.name, "*/*", refresh);
                                }, `Replace file`, `Are you sure you want to replace the file '${attachment.name}'?`);
                            }
                        })),
                        when(changeable, button({
                            icon: {icon: "delete"},
                            text: "Delete",
                            classes: ["negative"],
                            disabled: loading,
                            onclick: () => {
                                Modals.confirm(() => {
                                    loading.value = true;
                                    Api.deleteMedia(type, getValue(attachment.id))
                                        .then(() => {
                                            notify("Deleted file", NotificationType.success);
                                            refresh();
                                        })
                                        .finally(() => loading.value = false);
                                }, `Delete file`, `Are you sure you want to delete the file '${attachment.name}'?`);
                            }
                        })),
                    ).build()
            ).build();
    }

    static albumFiles(type: MediaFileType, album: Signal<Album | null>, refresh = () => {}) {
        const hasFileManagementPermission = compute(u => u?.permissions?.some(p => p.name === Permissions.fileManagement) ?? false, currentUser);
        const loading = signal(false);
        const attachments = compute(a => a?.attachments ?? [], album);

        return create("div")
            .classes("container", "border", "layer-1", "flex-v")
            .children(
                Generics.heading(2, "Files"),
                signalMap(attachments, create("div").classes("flex"),
                        attachment => Files.file(type, attachment, album.value, hasFileManagementPermission, refresh)),
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        when(hasFileManagementPermission, button({
                            text: "Upload file",
                            icon: {icon: "upload"},
                            disabled: loading,
                            onclick: () => uploadFile(loading, type, album.value?.id ?? 0, null, "*/*", refresh)
                        }))
                    ).build()
            ).build();
    }
}
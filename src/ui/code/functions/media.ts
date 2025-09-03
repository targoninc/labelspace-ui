import { MediaUploader } from "../api/mediaUploader";
import { MediaFileType } from "../enums/MediaFileType";
import { NotificationType } from "../enums/NotificationType";
import { notify } from "./notifications";
import {Signal} from "@targoninc/jess";

export function uploadImage(loading: Signal<boolean>, type: MediaFileType, referenceId: number) {
    uploadFile(loading, type, referenceId, "image/*");
}

export function uploadFile(loading: Signal<boolean>, type: MediaFileType, referenceId: number, fileName: string|null = null, accept: string = "*/*", onFinished = () => {}) {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = accept;
    fileInput.onchange = async () => {
        loading.value = true;
        if (!fileInput.files) {
            return;
        }
        let file = fileInput.files![0];

        try {
            await MediaUploader.upload(type, referenceId, file, fileName ?? file.name);
            notify("File updated", NotificationType.success);
            onFinished();
        } catch (e: any) {
            notify(`Failed to upload file: ${e}`, NotificationType.error);
            return;
        } finally {
            loading.value = false;
        }
    };
    fileInput.click();
}
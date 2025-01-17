import { Signal } from "../../fjsc/src/signals";
import { MediaUploader } from "../api/mediaUploader";
import { MediaFileType } from "../enums/MediaFileType";
import { NotificationType } from "../enums/NotificationType";
import { notify } from "./notifications";
import { getImageUrl } from "./templates";

export function uploadImage(loading: Signal<boolean>, type: MediaFileType, referenceId: number) {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.onchange = async () => {
        loading.value = true;
        if (!fileInput.files) {
            return;
        }
        let file = fileInput.files![0];

        try {
            await MediaUploader.upload(type, referenceId, file);
            notify("Image updated", NotificationType.success);
        } catch (e: any) {
            notify(`Failed to upload image: ${e}`, NotificationType.error);
            return;
        } finally {
            loading.value = false;
        }
    };
    fileInput.click();
}
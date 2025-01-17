import {create, ifjs} from "../../fjsc/src/f2";
import {Signal, signal} from "../../fjsc/src/signals.ts";
import {getImageUrl} from "../functions/templates.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {RequestableImageSize} from "./requestableImageSize.ts";
import {ImageSize} from "./imageSize.ts";
import {FJSC} from "../../fjsc/src/FJSC.ts";
import { uploadImage } from "../functions/media.ts";
import { Generics } from "./generics.ts";
import { Api } from "../api/api.ts";
import { NotificationType } from "../enums/NotificationType.ts";
import { notify } from "../functions/notifications.ts";

interface ChangeableImageOptions {
    changeable?: boolean;
    deletable?: boolean;
    afterChange?: () => void;
    size?: ImageSize;
    classes?: string[];
}

export class Images {
    static changeableImage(id: number, hasImage: boolean, type: MediaFileType, options: ChangeableImageOptions, fallback: string = "") {
        const src = signal(fallback);
        if (hasImage) {
            let size: ImageSize = options.size ?? ImageSize.adaptive;
            if (size === ImageSize.adaptive) {
                size = ImageSize.p50;
            } else if (size === ImageSize.fill) {
                size = ImageSize.p200;
            }
            src.value = getImageUrl(type, id, size as unknown as RequestableImageSize);
        }
        const loading = signal(false);

        return create("div")
            .classes("flex-v")
            .children(
                Images.image(src, options.size ?? ImageSize.adaptive, options.classes),
                create("div")
                    .classes("flex")
                    .children(
                        ifjs(options.changeable, FJSC.button({
                            icon: { icon: "upload" },
                            text: "Change",
                            disabled: loading,
                            onclick: () => {
                                uploadImage(loading, type, id);
                            }
                        })),
                        ifjs(options.deletable, FJSC.button({
                            icon: { icon: "delete" },
                            text: "Delete",
                            disabled: loading,
                            onclick: () => {
                                loading.value = true;
                                Api.deleteMedia(type, id).then(() => {
                                    notify("Deleted media", NotificationType.success);
                                }).finally(() => loading.value = false);
                            }
                        })),
                        ifjs(loading, Generics.loading())
                    ).build()
            ).build();
    }

    static image(src: Signal<string>, size: ImageSize, classes: string[] = []) {
        if (!size.includes("%") && !size.includes("em")) {
            (size as string) += "px";
        }

        return create("img")
            .classes(...classes)
            .src(src)
            .style("width", "auto")
            .style("max-width", size)
            .style("height", size)
            .build();
    }
}
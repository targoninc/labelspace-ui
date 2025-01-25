import {create, getValue, ifjs} from "../../fjsc/src/f2";
import {Signal, signal} from "../../fjsc/src/signals.ts";
import {getImageUrl} from "../functions/templates.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {RequestableImageSize} from "./requestableImageSize.ts";
import {ImageSize} from "./imageSize.ts";
import {FJSC} from "../../fjsc";
import { uploadImage } from "../functions/media.ts";
import { Generics } from "./generics.ts";
import { Api } from "../api/api.ts";
import { NotificationType } from "../enums/NotificationType.ts";
import { notify } from "../functions/notifications.ts";

interface ChangeableImageOptions {
    changeable?: boolean|Signal<boolean>;
    deletable?: boolean|Signal<boolean>;
    afterChange?: () => void;
    size?: ImageSize;
    classes?: string[];
}

export class Images {
    static changeableImage(id: number|Signal<number>, hasImage: boolean|Signal<boolean>, type: MediaFileType, options: ChangeableImageOptions, fallback: string = "") {
        const src = signal(fallback);
        if (hasImage instanceof Signal) {
            (hasImage as Signal<boolean>).subscribe(h => {
                if (h) {
                    Images.setSrc(options, getValue(id), src, type);
                }
            });
        } else {
            Images.setSrc(options, getValue(id), src, type);
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
                                uploadImage(loading, type, getValue(id));
                            }
                        })),
                        ifjs(options.deletable, FJSC.button({
                            icon: { icon: "delete" },
                            text: "Delete",
                            disabled: loading,
                            onclick: () => {
                                loading.value = true;
                                Api.deleteMedia(type, getValue(id)).then(() => {
                                    notify("Deleted media", NotificationType.success);
                                }).finally(() => loading.value = false);
                            }
                        })),
                        ifjs(loading, Generics.loading())
                    ).build()
            ).build();
    }

    private static setSrc(options: ChangeableImageOptions, id: number, src: Signal<string>, type: MediaFileType) {
        let size: ImageSize = options.size ?? ImageSize.adaptive;
        if (size === ImageSize.adaptive) {
            size = ImageSize.p50;
        } else if (size === ImageSize.fill) {
            size = ImageSize.p500;
        }
        src.value = getImageUrl(type, (id as number), size as unknown as RequestableImageSize);
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
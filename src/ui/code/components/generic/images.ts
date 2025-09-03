import {getImageUrl} from "../../functions/templates.ts";
import {MediaFileType} from "../../enums/MediaFileType.ts";
import {RequestableImageSize} from "../../enums/requestableImageSize.ts";
import {ImageSize} from "../../enums/imageSize.ts";
import { uploadImage } from "../../functions/media.ts";
import { Generics } from "./generics.ts";
import { Api } from "../../api/api.ts";
import { NotificationType } from "../../enums/NotificationType.ts";
import { notify } from "../../functions/notifications.ts";
import {create, getValue, signal, Signal, when} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";

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
                        when(options.changeable, button({
                            icon: { icon: "upload" },
                            text: "Change",
                            disabled: loading,
                            onclick: () => {
                                uploadImage(loading, type, getValue(id));
                            }
                        })),
                        when(options.deletable, button({
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
                        when(loading, Generics.loading())
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
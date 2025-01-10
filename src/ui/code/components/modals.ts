import {AnyNode, create, ifjs, StringOrSignal} from "../../fjsc/src/f2.ts";
import {Generics} from "./generics.ts";
import {FJSC} from "../../fjsc";
import {addModal, removeLastModal} from "../functions/modals.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {InputType} from "../../fjsc/src/Types.ts";

export class Modals {
    static modalBase(...content: AnyNode[]) {
        return create("div")
            .classes("modal", "container")
            .children(
                ...content
            ).build();
    }

    static confirm(action: Function, title: StringOrSignal, message: StringOrSignal, onCancel: Function = () => {
    }) {
        const loading = signal(false);

        addModal(Modals.modalBase(
            Generics.heading(1, title),
            create("p")
                .text(message)
                .build(),
            create("div")
                .classes("flex", "center-items")
                .children(
                    FJSC.button({
                        text: "Yes",
                        classes: ["positive"],
                        disabled: loading,
                        onclick: async () => {
                            loading.value = true;
                            await action();
                            loading.value = false;
                            removeLastModal();
                        },
                        icon: { icon: "check" },
                    }),
                    FJSC.button({
                        text: "No",
                        classes: ["negative"],
                        disabled: loading,
                        onclick: () => {
                            loading.value = true;
                            onCancel();
                            loading.value = false;
                            removeLastModal();
                        },
                        icon: { icon: "cancel" },
                    }),
                    ifjs(loading, Generics.loading())
                ).build()
        ));
    }

    static input(callback: Function, title: string, inputType: InputType, onCancel: Function = () => {}) {
        const value = signal("");
        const loading = signal(false);

        addModal(Modals.modalBase(
            Generics.heading(1, title),
            create("div")
                .classes("flex-v")
                .children(
                    create("div")
                        .classes("flex", "center-items")
                        .children(
                            FJSC.input({
                                type: inputType,
                                name: "text",
                                value,
                                attributes: ["autocomplete", "off"],
                                onchange: (v) => value.value = v
                            }),
                        ).build(),
                    ifjs(loading, Generics.loading()),
                    create("div")
                        .classes("flex", "center-items")
                        .children(
                            FJSC.button({
                                text: "OK",
                                icon: { icon: "save" },
                                classes: ["positive"],
                                disabled: loading,
                                onclick: async () => {
                                    loading.value = true;
                                    await callback(value.value);
                                    loading.value = false;
                                    removeLastModal();
                                },
                            }),
                            FJSC.button({
                                text: "Cancel",
                                icon: { icon: "cancel" },
                                classes: ["negative"],
                                disabled: loading,
                                onclick: () => {
                                    loading.value = true;
                                    onCancel();
                                    loading.value = false;
                                    removeLastModal();
                                },
                            }),
                            ifjs(loading, Generics.loading())
                        ).build()
                ).build()
        ));
    }
}
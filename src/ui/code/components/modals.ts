import {Generics, vertical} from "./generic/generics.ts";
import {addModal, removeLastModal} from "../functions/modals.ts";
import {Api} from "../api/api.ts";
import {currentUser} from "../state.ts";
import {Totp} from "./totp.ts";
import {AnyNode, create, InputType, Signal, signal, StringOrSignal, when} from "@targoninc/jess";
import {button, InputConfig, input, SelectOption, searchableSelect} from "@targoninc/jess-components";

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
                    button({
                        text: "Yes",
                        classes: ["positive"],
                        disabled: loading,
                        onclick: async () => {
                            loading.value = true;
                            await action();
                            loading.value = false;
                            removeLastModal();
                        },
                        icon: {icon: "check"},
                    }),
                    button({
                        text: "No",
                        classes: ["negative"],
                        disabled: loading,
                        onclick: () => {
                            loading.value = true;
                            onCancel();
                            loading.value = false;
                            removeLastModal();
                        },
                        icon: {icon: "cancel"},
                    }),
                    when(loading, Generics.loading())
                ).build()
        ));
    }

    static input<T>(callback: Function, title: string, inputType: InputType, removeModalAfterCallback = true, onCancel: Function = () => {
    }, inputConfig: InputConfig<T> | {} = {}) {
        const value = signal<T>("" as T);
        const loading = signal(false);
        const id = signal(Math.random().toString(36).substring(7));
        setTimeout(() => {
            document.getElementById(id.value)?.focus();
        });

        addModal(Modals.modalBase(
            Generics.heading(1, title),
            create("div")
                .classes("flex-v")
                .children(
                    create("div")
                        .classes("flex", "center-items")
                        .children(
                            input({
                                ...inputConfig as InputConfig<T>,
                                type: inputType,
                                id,
                                value,
                                attributes: ["autocomplete", "off"],
                                onchange: (v) => value.value = v
                            }),
                        ).build(),
                    Modals.genericModalButtons(loading, callback, value, removeModalAfterCallback, onCancel)
                ).build()
        ));
    }

    private static genericModalButtons<T>(loading: Signal<boolean>, callback: Function, value: Signal<T>, removeModalAfterCallback: boolean, onCancel: Function) {
        return create("div")
            .classes("flex", "center-items")
            .children(
                button({
                    text: "OK",
                    icon: {icon: "save"},
                    classes: ["positive"],
                    disabled: loading,
                    onclick: async () => {
                        loading.value = true;
                        await callback(value.value);
                        loading.value = false;
                        removeModalAfterCallback && removeLastModal();
                    },
                }),
                button({
                    text: "Cancel",
                    icon: {icon: "cancel"},
                    classes: ["negative"],
                    disabled: loading,
                    onclick: async () => {
                        loading.value = true;
                        await onCancel();
                        loading.value = false;
                        removeLastModal();
                    },
                }),
                when(loading, Generics.loading())
            ).build();
    }

    static totpVerificationModal(secret: string, qrDataUrl: string) {
        const token = signal("");
        const error = signal("");

        addModal(Modals.modalBase(
            Generics.heading(1, "TOTP verification"),
            create("div")
                .classes("flex-v")
                .children(
                    Totp.qrCode(qrDataUrl),
                    Generics.heading(2, "Secret"),
                    create("div")
                        .classes("flex", "center-items")
                        .children(
                            create("span")
                                .text(secret)
                                .build()
                        ).build(),
                    vertical(
                        create("div")
                            .classes("flex", "center-items")
                            .children(
                                input({
                                    type: InputType.text,
                                    name: "token",
                                    placeholder: "Token",
                                    attributes: ["autocomplete", "off"],
                                    value: token,
                                    onchange: (v) => token.value = v
                                }),
                            ).build(),
                        when(error, create("span")
                            .classes("red")
                            .text(error)
                            .build()),
                        create("div")
                            .classes("flex", "center-items")
                            .children(
                                button({
                                    text: "Verify",
                                    icon: {icon: "verified"},
                                    classes: ["positive"],
                                    onclick: async (e) => {
                                        if (!token.value) {
                                            return;
                                        }
                                        await Api.verifyTotp(currentUser.value?.id ?? 0, token.value, "totp").then(() => {
                                            removeLastModal();
                                            Api.getUser().then(u => {
                                                currentUser.value = u;
                                            });
                                        }).catch((e) => {
                                            error.value = e.message;
                                        });
                                    }
                                }),
                                button({
                                    text: "Cancel",
                                    icon: {icon: "cancel"},
                                    classes: ["negative"],
                                    onclick: async () => {
                                        removeLastModal();
                                    }
                                }),
                            ).build()
                    ).build()
                ).build()
        ));
    }

    static buttons(options: SelectOption[], title: StringOrSignal, message: StringOrSignal, callback: Function = () => {
    }) {
        addModal(Modals.modalBase(
            Generics.heading(1, title),
            create("div")
                .classes("flex-v")
                .children(
                    create("p")
                        .text(message)
                        .build(),
                    create("div")
                        .classes("flex", "center-items")
                        .children(
                            ...options.map(option => button({
                                text: option.name,
                                icon: {
                                    icon: option.image as StringOrSignal
                                },
                                onclick: () => {
                                    removeLastModal();
                                    callback(option.id);
                                }
                            }))
                        ).build(),
                    create("div")
                        .classes("flex", "center-items")
                        .children(
                            button({
                                text: "Cancel",
                                icon: {icon: "cancel"},
                                classes: ["negative"],
                                onclick: () => {
                                    removeLastModal();
                                }
                            }),
                        ).build()
                ).build()
        ));
    }
}
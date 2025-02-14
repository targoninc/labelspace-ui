import {AnyNode, create, ifjs, StringOrSignal} from "../../fjsc/src/f2.ts";
import {Generics} from "./generic/generics.ts";
import {FJSC} from "../../fjsc";
import {addModal, removeLastModal} from "../functions/modals.ts";
import {signal, Signal} from "../../fjsc/src/signals.ts";
import {InputConfig, InputType, SelectOption} from "../../fjsc/src/Types.ts";
import {Api} from "../api/api.ts";
import {currentUser} from "../state.ts";
import {target} from "../functions/templates.ts";
import {Totp} from "./totp.ts";

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
                        icon: {icon: "check"},
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
                        icon: {icon: "cancel"},
                    }),
                    ifjs(loading, Generics.loading())
                ).build()
        ));
    }

    static input<T>(callback: Function, title: string, inputType: InputType, removeModalAfterCallback = true, onCancel: Function = () => {}, inputConfig: InputConfig<T>|{} = {}) {
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
                            FJSC.input({
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
                FJSC.button({
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
                FJSC.button({
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
                ifjs(loading, Generics.loading())
            ).build();
    }

    static totpVerificationModal(secret: string, qrDataUrl: string) {
        const token = signal("");

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
                    create("div")
                        .classes("flex-v")
                        .children(
                            create("div")
                                .classes("flex", "center-items")
                                .children(
                                    FJSC.input({
                                        type: InputType.text,
                                        name: "token",
                                        placeholder: "Token",
                                        attributes: ["autocomplete", "off"],
                                        value: token,
                                        onchange: (v) => token.value = v
                                    }),
                                ).build(),
                            create("div")
                                .classes("flex", "center-items")
                                .children(
                                    FJSC.button({
                                        text: "Verify",
                                        icon: {icon: "verified"},
                                        classes: ["positive"],
                                        onclick: async (e) => {
                                            if (!token.value) {
                                                return;
                                            }
                                            await Api.verifyTotp(currentUser.value?.id ?? 0, token.value, "totp").then(() => {
                                                Api.getUser().then(u => {
                                                    currentUser.value = u;
                                                });
                                            });
                                            removeLastModal();
                                        }
                                    }),
                                    FJSC.button({
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

    static select(options: SelectOption[], title: StringOrSignal, message: StringOrSignal, label: StringOrSignal, callback: Function = () => {}) {
        const loading = signal(false);
        const selection = signal<any>(null);

        addModal(Modals.modalBase(
            Generics.heading(1, title),
            create("div")
                .classes("flex-v")
                .children(
                    create("p")
                        .text(message)
                        .build(),
                    FJSC.searchableSelect({
                        options: signal(options),
                        value: selection,
                        label
                    }),
                    Modals.genericModalButtons(loading, callback, selection, true, () => {})
                ).build()
        ));
    }
}
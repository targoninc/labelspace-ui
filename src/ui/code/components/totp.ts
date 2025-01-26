import {create, ifjs} from "../../fjsc/src/f2.ts";
import {UserTotp} from "../models/db/tri/UserTotp.ts";
import {Signal} from "../../fjsc/src/signals.ts";
import {FJSC} from "../../fjsc";
import {Modals} from "./modals.ts";
import {Api} from "../api/api.ts";
import {currentUser} from "../state.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {Time} from "../functions/time.ts";

export class Totp {
    static qrCode(dataUrl: string) {
        return create("div")
            .classes("qr-code")
            .children(
                create("img")
                    .attributes("src", dataUrl)
                    .build(),
            ).build();
    }

    static totpMethodInTable(method: UserTotp, loading: Signal<boolean>, userId: Signal<any>) {
        return create("tr")
            .children(
                create("td")
                    .children(
                        create("span")
                            .text(method.name)
                            .build()
                    ).build(),
                create("td")
                    .text(method.verified ? "Yes" : "No")
                    .build(),
                create("td")
                    .text(Time.agoUpdating(new Date(method.created_at)))
                    .build(),
                create("td")
                    .text(Time.agoUpdating(new Date(method.updated_at)))
                    .build(),
                create("td")
                    .children(
                        create("div")
                            .classes("flex", "center-items")
                            .children(
                                ifjs(method.verified, FJSC.button({
                                    text: "Verify",
                                    icon: {icon: "verified"},
                                    classes: ["positive"],
                                    onclick: async () => {
                                        Modals.input<string>(async (token: string) => {
                                            loading.value = true;
                                            await Api.verifyTotp(userId.value, token).then(() => {
                                                Api.getUser().then(u => {
                                                    currentUser.value = u;
                                                });
                                            }).finally(() => loading.value = false);
                                        }, "Verify TOTP method", InputType.text, true, () => {}, {
                                            label: "2FA token"
                                        });
                                    }
                                }), true),
                                FJSC.button({
                                    text: "Delete",
                                    icon: {icon: "delete"},
                                    classes: ["negative"],
                                    onclick: async () => {
                                        if (!method.verified) {
                                            Modals.confirm(async () => {
                                                loading.value = true;
                                                await Api.deleteTotpMethod(method.id, "").then(() => {
                                                    Api.getUser().then(u => {
                                                        currentUser.value = u;
                                                    });
                                                }).finally(() => loading.value = false);
                                            }, "Delete TOTP method", `Are you sure you want to delete TOTP method ${method.name}?`);
                                            return;
                                        }
                                        Modals.input<string>(async (token: string) => {
                                            loading.value = true;
                                            await Api.deleteTotpMethod(method.id, token).then(() => {
                                                Api.getUser().then(u => {
                                                    currentUser.value = u;
                                                });
                                            }).finally(() => loading.value = false);
                                        }, "Delete TOTP method", InputType.text, true, () => {}, {
                                            label: "2FA token"
                                        });
                                    }
                                })
                            ).build(),
                    ).build()
            ).build();
    }
}
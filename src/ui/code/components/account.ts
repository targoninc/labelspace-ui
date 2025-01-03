import {Generics} from "./generics.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {FJSC} from "../../fjsc";
import {Api} from "../api/api.ts";

export class Account {
    static passwordReset() {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("token");

        const password = signal("");
        const password2 = signal("");
        const message = signal("");
        const loading = signal(false);
        const success = signal(false);
        const sendable = compute((p1, p2, l, s) => p1.length > 8 && p2.length > 8 && p1 === p2 && !l && !s, password, password2, loading, success);
        const resetPassword = async () => {
            Api.resetPassword({
                token,
                newPassword: password.value,
                newPasswordConfirm: password2.value
            }).then(() => {
                success.value = true;
                message.value = "Password reset successful. You can close this page.";
                setTimeout(() => {
                    window.close();
                }, 5000);
            }).catch(e => {
                success.value = false;
                message.value = `Password reset failed: ${e.message}`;
            }).finally(() => {
                loading.value = false;
            });
        };

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    create("h1")
                        .text("Password reset")
                        .build(),
                    ifjs(success, Generics.passwordInput(password, "New password"), true),
                    ifjs(success, Generics.passwordInput(password2, "Confirm password"), true),
                    ifjs(sendable, FJSC.button({
                        text: "Reset password",
                        onclick: resetPassword,
                        classes: ["positive"]
                    })),
                    Generics.message(message)
                ).build()
        );
    }
}
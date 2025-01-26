import {Generics} from "./generics.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {FJSC} from "../../fjsc";
import {Api} from "../api/api.ts";
import {currentUser} from "../state.ts";
import {navigate} from "../routing/Router.ts";
import {Inputs} from "./inputs.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {Modals} from "./modals.ts";

export class Account {
    static loginPage() {
        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Login"),
                    Account.login(),
                ).build()
        );
    }

    static login() {
        const username = signal("");
        const password = signal("");
        const filledUsername = compute(u => u.length > 0, username);
        const filledPassword = compute(p => p.length > 0, password);
        const filledBoth = compute((u, p) => u && p, filledUsername, filledPassword);

        const message = signal("");
        const loading = signal(false);
        const login = async () => {
            loading.value = true;

            const actualLogin = () => {
                Api.login({
                    username: username.value,
                    password: password.value
                }).catch(e => {
                    message.value = e.message;
                }).then(async () => {
                    currentUser.value = await Api.getUser();
                    navigate("dashboard");
                }).finally(() => loading.value = false);
            }

            Api.mfaRequest(username.value, password.value)
                .then(async (res) => {
                    if (res.mfa_needed) {
                        Modals.input<string>((token: string) => {
                            Api.verifyTotp(res.userId ?? 0, token).then(actualLogin);
                        }, "MFA verification", InputType.text, true, () => {
                            message.value = "MFA verification cancelled";
                            loading.value = false;
                        }, {
                            name: "mfa-token",
                            label: "MFA token"
                        });
                    } else {
                        actualLogin();
                    }
                }).catch(e => message.value = e.message);
        };
        const forgotPassword = async (e: MouseEvent) => {
            loading.value = true;
            Api.requestPasswordReset(username.value)
                .then(() => message.value = "Password reset email sent.")
                .finally(() => loading.value = false);
        };

        return create("div")
            .classes("flex-v")
            .styles("max-width", "400px")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        Inputs.text(username, "Username", "username"),
                        Inputs.password(password, "Password", "password", async () => {
                            if (filledBoth.value) {
                                await login();
                            }
                        }),
                        create("div")
                            .classes("flex", "center-items")
                            .children(
                                ifjs(filledBoth, FJSC.button({
                                    text: "Login",
                                    icon: {icon: "login"},
                                    disabled: loading,
                                    onclick: login,
                                    classes: ["positive"]
                                })),
                                ifjs(username, FJSC.button({
                                    icon: {icon: "question_mark"},
                                    title: "Send password reset mail",
                                    text: "Reset password",
                                    disabled: loading,
                                    onclick: forgotPassword,
                                })),
                                ifjs(loading, Generics.loading()),
                            ).build(),
                    ).build(),
                Generics.message(message)
            ).build();
    }

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
                message.value = "Password reset successful. You can now login with your new password.";
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
                    Generics.heading(1, "Password reset"),
                    ifjs(success, Inputs.password(password, "New password"), true),
                    ifjs(success, Inputs.password(password2, "Confirm password"), true),
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
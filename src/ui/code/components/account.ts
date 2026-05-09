import {Generics, horizontal, vertical} from "./generic/generics.ts";
import {Api} from "../api/api.ts";
import {Inputs} from "./generic/inputs.ts";
import {login} from "../functions/startLogin.ts";
import {AnyNode, compute, create, InputType, signal, Signal, when} from "@targoninc/jess";
import {button, input} from "@targoninc/jess-components";
import {MfaOption} from "../enums/MfaOption.ts";
import {navigate} from "../routing/Router.ts";
import {webauthnLogin} from "../functions/webauthn.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {CredentialDescriptor} from "@passwordless-id/webauthn/dist/esm/types";

interface LoginData {
    username: string;
    password: string;
    mfaCode: string;
    mfaMethod?: MfaOption;
    mfaOptions: { type: MfaOption }[];
    credentialDescriptors: CredentialDescriptor[];
    userId?: number;
    challenge?: string;
}

type StepFn = (step: Signal<string>, data: Signal<LoginData>) => AnyNode;

export class Account {
    static loginPage() {
        const templateMap: Record<string, StepFn> = {
            login: Account.loginBox,
            "check-mfa": Account.checkMfaBox,
            "mfa-select": Account.mfaSelectBox,
            "mfa-request": Account.mfaRequestBox,
            "logging-in": Account.loggingInBox,
            complete: Account.completeBox,
            "reset-password": Account.resetPasswordBox,
            "password-reset-requested": Account.passwordResetRequestedBox,
            "password-reset": Account.enterNewPasswordBox,
        };

        const altEntryPoints = ["password-reset"];
        let firstStep = "login";
        const matchedAlt = altEntryPoints.find(e => window.location.pathname.includes(e));
        if (matchedAlt) {
            firstStep = matchedAlt;
        }

        const step = signal<string>(firstStep);
        const data = signal<LoginData>({
            username: "",
            password: "",
            mfaCode: "",
            mfaOptions: [],
            credentialDescriptors: [],
        });

        const template = signal(templateMap[step.value](step, data));
        step.subscribe((newStep: string) => {
            template.value = templateMap[newStep](step, data);
        });

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(template)
                .build()
        );
    }

    private static waitingBox(title: string, message: string) {
        return vertical(
            Generics.heading(2, title),
            horizontal(
                Generics.loading(),
                create("span").text(message).build(),
            ).build()
        ).build();
    }

    static loginBox(step: Signal<string>, data: Signal<LoginData>) {
        const username = signal(data.value.username);
        const password = signal(data.value.password);
        const filledBoth = compute((u, p) => u.length > 0 && p.length > 0, username, password);

        username.subscribe(u => data.value = {...data.value, username: u});
        password.subscribe(p => data.value = {...data.value, password: p});

        const tryLogin = () => {
            if (!filledBoth.value) return;
            step.value = "check-mfa";
        };

        return vertical(
            Generics.heading(2, "Login"),
            Inputs.text(username, "Username", "username webauthn"),
            Inputs.password(password, "Password", "password", tryLogin),
            horizontal(
                when(filledBoth, button({
                    text: "Login",
                    icon: {icon: "login"},
                    onclick: tryLogin,
                    classes: ["positive"],
                })),
                button({
                    text: "Forgot password",
                    icon: {icon: "question_mark"},
                    classes: ["flat"],
                    onclick: () => step.value = "reset-password",
                }),
            ).build(),
        ).build();
    }

    static checkMfaBox(step: Signal<string>, data: Signal<LoginData>) {
        Api.getMfaOptions(data.value.username, data.value.password).then(options => {
            if (!options || options.length === 0) {
                step.value = "logging-in";
                return;
            }
            data.value = {...data.value, mfaOptions: options};
            if (options.length === 1) {
                data.value = {...data.value, mfaMethod: options[0].type};
                step.value = "mfa-request";
            } else {
                step.value = "mfa-select";
            }
        }).catch(() => {
            notify("Invalid credentials", NotificationType.error);
            step.value = "login";
        });

        return Account.waitingBox("Checking credentials...", "Please wait");
    }

    static mfaSelectBox(step: Signal<string>, data: Signal<LoginData>) {
        const iconMap: Record<string, string> = {
            [MfaOption.email]: "forward_to_inbox",
            [MfaOption.totp]: "qr_code",
            [MfaOption.webauthn]: "passkey",
        };
        const textMap: Record<string, string> = {
            [MfaOption.email]: "E-Mail",
            [MfaOption.totp]: "TOTP",
            [MfaOption.webauthn]: "Passkey",
        };

        const selectMethod = (method: MfaOption) => {
            data.value = {...data.value, mfaMethod: method};
            step.value = "mfa-request";
        };

        return vertical(
            Generics.heading(2, "Select 2FA method"),
            create("p").text("Please select one of the available methods").build(),
            horizontal(
                ...data.value.mfaOptions.map(o => button({
                    text: textMap[o.type],
                    icon: {icon: iconMap[o.type]},
                    onclick: () => selectMethod(o.type),
                }))
            ).build()
        ).build();
    }

    static mfaRequestBox(step: Signal<string>, data: Signal<LoginData>) {
        const loading = signal(true);
        const message = signal("");
        const mfaCode = signal(data.value.mfaCode ?? "");
        const isWebauthn = data.value.mfaMethod === MfaOption.webauthn;
        const isCodeBased = [MfaOption.email, MfaOption.totp].includes(data.value.mfaMethod!);
        const codeReady = compute(c => c.trim().length > 0, mfaCode);

        mfaCode.subscribe(c => data.value = {...data.value, mfaCode: c});

        Api.mfaRequest(data.value.username, data.value.password, data.value.mfaMethod!).then(res => {
            loading.value = false;
            if (!res.mfa_needed) {
                step.value = "logging-in";
                return;
            }
            data.value = {...data.value, userId: res.userId};
            if (isWebauthn) {
                Api.getWebauthnChallenge().then(async challengeRes => {
                    data.value = {...data.value, challenge: challengeRes.challenge};
                    webauthnLogin(challengeRes.challenge, res.credentialDescriptors ?? [])
                        .then(async verification => {
                            await Api.verifyWebauthn(verification, challengeRes.challenge);
                            step.value = "logging-in";
                        }).catch(e => message.value = e.message ?? "Passkey verification failed");
                }).catch(e => message.value = e.message ?? "Failed to get challenge");
            }
        }).catch(e => {
            loading.value = false;
            message.value = e.message ?? "Failed to send 2FA request";
        });

        const submitCode = () => {
            loading.value = true;
            Api.verifyTotp(data.value.userId ?? 0, data.value.mfaCode ?? "", data.value.mfaMethod)
                .then(() => step.value = "logging-in")
                .catch(e => message.value = e.message ?? "Verification failed")
                .finally(() => loading.value = false);
        };

        return vertical(
            Generics.heading(2, "Two-factor authentication"),
            when(isCodeBased, create("p").text(`Enter the code from ${data.value.mfaMethod}`).build()),
            when(isWebauthn, create("p").text("Follow the prompts on your device to authenticate").build()),
            when(isCodeBased, input<string>({
                type: InputType.text,
                name: "mfa-token",
                label: "2FA token",
                placeholder: "123456",
                value: mfaCode,
                onchange: (v) => mfaCode.value = v,
                onkeydown: (e: KeyboardEvent) => {
                    if (e.key === "Enter" && codeReady.value) {
                        submitCode();
                    }
                }
            })),
            horizontal(
                when(isCodeBased, button({
                    text: "Submit",
                    icon: {icon: "login"},
                    classes: ["positive"],
                    disabled: compute((c, l) => !c || l, codeReady, loading),
                    onclick: submitCode,
                })),
                when(loading, Generics.loading()),
            ).build(),
            Generics.message(message),
        ).build();
    }

    static loggingInBox(step: Signal<string>, data: Signal<LoginData>) {
        const loading = signal(true);
        const username = signal(data.value.username);
        const password = signal(data.value.password);
        const message = signal("");
        login(loading, username, password, message, data.value.challenge);
        return Account.waitingBox("Logging in...", "Please wait");
    }

    static completeBox() {
        navigate("dashboard");
        return Account.waitingBox("Complete", "Redirecting...");
    }

    static resetPasswordBox(step: Signal<string>, data: Signal<LoginData>) {
        const username = signal(data.value.username);
        const loading = signal(false);
        const message = signal("");

        username.subscribe(u => data.value = {...data.value, username: u});

        return vertical(
            Generics.heading(2, "Reset password"),
            Inputs.text(username, "Username or Email", "username"),
            horizontal(
                button({
                    text: "Send reset email",
                    icon: {icon: "send"},
                    classes: ["positive"],
                    disabled: compute((u, l) => u.length === 0 || l, username, loading),
                    onclick: () => {
                        loading.value = true;
                        Api.requestPasswordReset(username.value)
                            .then(() => step.value = "password-reset-requested")
                            .catch(e => message.value = e.message ?? "Failed to send reset email")
                            .finally(() => loading.value = false);
                    },
                }),
                when(loading, Generics.loading()),
                button({
                    text: "Back to login",
                    icon: {icon: "arrow_back"},
                    classes: ["flat"],
                    onclick: () => step.value = "login",
                }),
            ).build(),
            Generics.message(message),
        ).build();
    }

    static enterNewPasswordBox(step: Signal<string>, _data: Signal<LoginData>) {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("token");

        const password = signal("");
        const password2 = signal("");
        const message = signal("");
        const loading = signal(false);
        const success = signal(false);
        const sendable = compute(
            (p1, p2, l, s) => p1.length > 8 && p2.length > 8 && p1 === p2 && !l && !s,
            password, password2, loading, success,
        );

        const doReset = () => {
            loading.value = true;
            Api.resetPassword({
                token,
                newPassword: password.value,
                newPasswordConfirm: password2.value,
            }).then(() => {
                success.value = true;
                message.value = "Password reset successful.";
            }).catch(e => {
                message.value = `Password reset failed: ${e.message}`;
            }).finally(() => {
                loading.value = false;
            });
        };

        return vertical(
            Generics.heading(2, "Enter new password"),
            when(compute(s => !s, success), Inputs.password(password, "New password")),
            when(compute(s => !s, success), Inputs.password(password2, "Confirm password")),
            when(sendable, button({
                text: "Reset password",
                icon: {icon: "lock_reset"},
                onclick: doReset,
                classes: ["positive"],
            })),
            when(success, button({
                text: "Go to login",
                icon: {icon: "arrow_forward"},
                classes: ["positive"],
                onclick: () => step.value = "login",
            })),
            Generics.message(message),
        ).build();
    }

    static passwordResetRequestedBox(step: Signal<string>, _data: Signal<LoginData>) {
        return vertical(
            Generics.heading(2, "Reset email sent"),
            create("p").text("Check your email for the password reset link.").build(),
            button({
                text: "Back to login",
                icon: {icon: "arrow_back"},
                classes: ["positive"],
                onclick: () => step.value = "login",
            }),
        ).build();
    }

}

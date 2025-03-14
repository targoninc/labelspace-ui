import {Signal} from "../../fjsc/src/signals.ts";
import {Api} from "../api/api.ts";
import {currentUser} from "../state.ts";
import {navigate} from "../routing/Router.ts";
import {Modals} from "../components/modals.ts";
import {InputType, SelectOption} from "../../fjsc/src/Types.ts";
import {webauthnLogin} from "./webauthn.ts";
import {CredentialDescriptor} from "@passwordless-id/webauthn/dist/esm/types";
import {User} from "../models/db/tri/User.ts";
import {notify} from "./notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {MfaOption} from "../enums/MfaOption.ts";
import {mfaOptionMap} from "../enums/MfaOptionMapping.ts";

export function login(loading: Signal<boolean>, username: Signal<string>, password: Signal<string>, message: Signal<string>, challenge?: string) {
    loading.value = true;
    Api.login({
        username: username.value,
        password: password.value,
        challenge
    }).then(async () => {
        currentUser.value = await Api.getUser();
        navigate("dashboard");
    }).catch(e => message.value = e.message)
        .finally(() => loading.value = false);
}

function loginWithWebauthn(credentialDescriptors: CredentialDescriptor[] = [], loading: Signal<boolean>, username: Signal<string>, password: Signal<string>, message: Signal<string>) {
    loading.value = true;
    Api.getWebauthnChallenge()
        .then(async (res2) => {
            const challenge = res2.challenge;
            webauthnLogin(challenge, credentialDescriptors)
                .then(async (verification) => {
                    await Api.verifyWebauthn(verification, res2.challenge);
                    login(loading, username, password, message, challenge);
                }).catch(e => message.value = e.message)
                .finally(() => loading.value = false);
        }).catch(e => message.value = e.message)
        .finally(() => loading.value = false);
}

function loginWithTotp(res: {
    mfa_needed: boolean;
    type?: "totp" | "email" | "webauthn";
    credentialDescriptors?: CredentialDescriptor[];
    userId?: number;
    user?: User
}, loading: Signal<boolean>, username: Signal<string>, password: Signal<string>, message: Signal<string>) {
    Modals.input<string>((token: string) => {
        Api.verifyTotp(res.userId ?? 0, token, res.type).then(() => login(loading, username, password, message));
    }, `2FA verification via ${res.type}`, InputType.text, true, () => {
        message.value = "2FA verification cancelled";
        loading.value = false;
    }, {
        name: "mfa-token",
        label: "2FA token"
    });
}

function sendMfaRequest(loading: Signal<boolean>, username: Signal<string>, password: Signal<string>, selected: MfaOption, message: Signal<string>) {
    loading.value = true;
    Api.mfaRequest(username.value, password.value, selected)
        .then(async (res) => {
            if (res.mfa_needed) {
                switch (res.type) {
                    case "email":
                    case "totp":
                        loginWithTotp(res, loading, username, password, message);
                        break;
                    case "webauthn":
                        loginWithWebauthn(res.credentialDescriptors, loading, username, password, message);
                        break;
                }
            } else {
                login(loading, username, password, message);
            }
        }).catch(e => message.value = e.message)
        .finally(() => loading.value = false);
}

export async function startLogin(loading: Signal<boolean>, username: Signal<string>, password: Signal<string>, message: Signal<string>) {
    let options = [];
    try {
        loading.value = true;
        options = await Api.getMfaOptions(username.value, password.value);
        loading.value = false;
        if (options.length === 0) {
            login(loading, username, password, message);
            return;
        }

        if (options.length === 1) {
            sendMfaRequest(loading, username, password, options[0].type, message);
            return;
        }
    } catch (e: any) {
        notify(e, NotificationType.error);
        message.value = e.message;
        loading.value = false;
        return;
    }

    const mappedOptions: SelectOption[] = options.map(o => mfaOptionMap[o.type]);
    Modals.buttons(mappedOptions, "Select a 2FA method", "Please select one of the available options below.", (selected: MfaOption) => {
        if (!selected || options.every(o => o.type !== selected)) {
            notify("No value selected", NotificationType.error);
            return;
        }

        sendMfaRequest(loading, username, password, selected, message);
    });
}

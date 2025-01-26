import {Signal} from "../../fjsc/src/signals.ts";
import {Api} from "../api/api.ts";
import {currentUser} from "../state.ts";
import {navigate} from "../routing/Router.ts";
import {Modals} from "../components/modals.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {webauthnLogin} from "./webauthn.ts";
import {CredentialDescriptor} from "@passwordless-id/webauthn/dist/esm/types";
import {User} from "../models/db/tri/User.ts";

export function login(loading: Signal<boolean>, username: Signal<string>, password: Signal<string>, message: Signal<string>, challenge?: string) {
    loading.value = true;
    Api.login({
        username: username.value,
        password: password.value,
        challenge
    }).catch(e => {
        message.value = e.message;
    }).then(async () => {
        currentUser.value = await Api.getUser();
        navigate("dashboard");
    }).finally(() => loading.value = false);
}

function loginWithWebauthn(credentialDescriptors: CredentialDescriptor[] = [], loading: Signal<boolean>, username: Signal<string>, password: Signal<string>, message: Signal<string>) {
    loading.value = true;
    Api.getWebauthnChallenge().then(async (res2) => {
        const challenge = res2.challenge;
        webauthnLogin(challenge, credentialDescriptors).then(async (verification) => {
            await Api.verifyWebauthn(verification, res2.challenge);
            login(loading, username, password, message, challenge);
        }).catch(e => {
            message.value = e.message;
        }).finally(() => {
            loading.value = false;
        });
    }).catch(e => {
        message.value = e.message;
    });
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

export function startLogin(loading: Signal<boolean>, username: Signal<string>, password: Signal<string>, message: Signal<string>) {
    loading.value = true;

    Api.mfaRequest(username.value, password.value)
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
        }).catch(e => message.value = e.message);
}

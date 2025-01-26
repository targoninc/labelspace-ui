import {client} from '@passwordless-id/webauthn'
import {User} from "../models/db/tri/User.ts";
import {CredentialDescriptor} from "@passwordless-id/webauthn/dist/esm/types";

export async function registerWebauthnMethod(user: User, challenge: string) {
    if (!client.isAvailable()) {
        throw new Error("WebAuthn is not available");
    }

    return await client.register({
        user: {
            id: user.passkey_user_id,
            name: user.username,
            displayName: user.username,
        },
        challenge,
        domain: window.location.hostname,
    });
}

export function webauthnPossible() {
    return client.isAvailable();
}

export function webauthnLogin(challenge: string, allowCredentials: CredentialDescriptor[] = []) {
    return client.authenticate({
        allowCredentials,
        domain: window.location.hostname,
        challenge,
        userVerification: "required",
    });
}
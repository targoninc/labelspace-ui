import {client} from '@passwordless-id/webauthn'
import {User} from "../models/db/tri/User.ts";

export async function registerWebauthnMethod(user: User, challenge: string) {
    if (!client.isAvailable()) {
        throw new Error("WebAuthn is not available");
    }

    return await client.register({
        user: user.username,
        challenge,
        domain: window.location.origin,
        hints: ["hybrid", "client-device", "security-key"],
    });
}
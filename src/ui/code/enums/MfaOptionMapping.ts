import {MfaOption} from "./MfaOption.ts";
import {SelectOption} from "@targoninc/jess-components";

export const mfaOptionMap: Record<MfaOption, SelectOption> = {
    [MfaOption.webauthn]: {
        id: MfaOption.webauthn,
        name: "Passkey",
        image: "passkey"
    },
    [MfaOption.totp]: {
        id: MfaOption.totp,
        name: "TOTP",
        image: "qr_code"
    },
    [MfaOption.email]: {
        id: MfaOption.email,
        name: "E-Mail",
        image: "mail"
    }
}
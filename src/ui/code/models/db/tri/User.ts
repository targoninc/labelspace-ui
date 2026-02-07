import {Usersetting} from "./Usersetting.js";
import {UserEmail} from "./UserEmail.js";
import type {Artist} from "./Artist.ts";
import type {Permission} from "./Permission.ts";
import {UserTotp} from "./UserTotp.ts";
import {PublicKey} from "./PublicKey.ts";

export interface User extends Express.User {
    totp?: UserTotp[];
    permissions?: Permission[];
    artists?: Artist[];
    settings?: Usersetting[];
    id: number;
    username: string;
    legal_name: string;
    country: string;
    state: string;
    mfa_enabled: boolean;
    emails: UserEmail[];
    password_hash: string;
    password_token: string|null;
    verified: boolean;
    verification_status: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
    lastlogin: Date;
    secondlastlogin: Date;
    password_updated_at: Date;
    tos_agreed_at: Date;
    ip: string;
    has_avatar: boolean;
    has_banner: boolean;
    email_mfa_code: string;
    passkey_user_id: string;
    public_keys?: PublicKey[];
    available?: { total: string; paidOut: string; available: string };
}
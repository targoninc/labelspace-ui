import {Usersetting} from "./Usersetting.js";
import {UserEmail} from "./UserEmail.js";
import type {Artist} from "./Artist.ts";
import {Permission} from "./Permission.ts";

export interface User extends Express.User {
    permissions?: Permission[];
    artists?: Artist[];
    settings?: Usersetting[];
    id: number;
    username: string;
    mfa_enabled: boolean;
    emails: UserEmail[];
    password_hash: string;
    displayname: string;
    description: string;
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
}
import {Fetcher} from "./fetcher.ts";
import type {User} from "../models/User.ts";

export class Api {
    static async getUser() {
        return await Fetcher.get<User>("/user/get");
    }

    static async login(user: { username: string; password: string }) {
        return await Fetcher.postWithResponse<User>("/user/actions/login", user);
    }
}
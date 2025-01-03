import {Fetcher} from "./fetcher.ts";
import type {User} from "../models/User.ts";

const base = window.location.origin.includes("localhost") ? "http://localhost:8082" : "https://artists-api.trirecords.eu";

export class Api {
    static async getUser() {
        return await Fetcher.get<User>(base + "/user/get");
    }

    static async login(user: { username: string; password: string }) {
        return await Fetcher.postWithResponse<User>(base + "/user/actions/login", user);
    }
}
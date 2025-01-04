import {Fetcher} from "./fetcher.ts";
import {User} from "../models/db/tri/User.ts";
import {Statistic} from "../models/Statistic.ts";
import {Payment} from "../models/db/finance/Payment.ts";
import {RoyaltyInfo} from "../models/RoyaltyInfo.ts";

const base = window.location.origin.includes("localhost") ? "http://localhost:8090" : "https://artists-api.trirecords.eu";

export class Api {
    static async getUser() {
        return await Fetcher.get<User>(base + "/user/get");
    }

    static async login(user: { username: string; password: string }) {
        return await Fetcher.postWithResponse<User>(base + "/user/actions/login", user);
    }

    static async getUsers() {
        return await Fetcher.get<User[]>(base + "/users/get");
    }

    static async requestPasswordReset(username: string) {
        return await Fetcher.post(base + "/user/actions/request-password-reset", {
            username
        });
    }

    static async resetPassword(param: { token: any; newPassword: string; newPasswordConfirm: string }) {
        return await Fetcher.post(base + "/user/actions/reset-password", param);
    }

    static async logout() {
        return await Fetcher.post(base + "/user/actions/logout");
    }

    static async updateUser(user: Partial<User>) {
        return await Fetcher.post(base + "/user/actions/update", { user });
    }

    static async getRoyaltiesByMonth() {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByMonth");
    }

    static async getRoyaltiesByYear() {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByYear");
    }

    static async getRoyaltiesByTrack() {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByTrack");
    }

    static async getPayments() {
        return await Fetcher.get<Payment[]>(base + "/payments/get");
    }

    static async getAvailablePaymentAmount() {
        return await Fetcher.postWithResponse<RoyaltyInfo>(base + "/payments/available");
    }
}
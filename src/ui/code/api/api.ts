import {Fetcher} from "./fetcher.ts";
import {User} from "../models/db/tri/User.ts";
import {Statistic} from "../models/Statistic.ts";
import {Payment} from "../models/db/finance/Payment.ts";
import {RoyaltyInfo} from "../models/RoyaltyInfo.ts";
import {Log} from "../models/db/tri/Log.ts";
import {Album} from "../models/db/tri/Album.ts";
import {CreateAlbumRequestBody} from "../models/CreateAlbumRequestBody.ts";
import {Track} from "../models/db/tri/Track.ts";
import {UploadTrackRequestBody} from "../models/UploadTrackRequestBody.ts";
import {SearchResult} from "../models/SearchResult.ts";
import { MediaFileType } from "../enums/MediaFileType.ts";
import {Artist} from "../models/db/tri/Artist.ts";
import {AuthenticationJSON, CredentialDescriptor, RegistrationJSON} from "@passwordless-id/webauthn/dist/esm/types";
import {MfaOption} from "../enums/MfaOption.ts";

const base = window.location.origin.includes("localhost") ? "http://localhost:8090" : "https://artists-api.trirecords.eu";

export class Api {
    static baseUrl = base;

    static async getUser() {
        return await Fetcher.get<User>(base + "/user/get");
    }

    static async login(user: { username: string; password: string, challenge?: string }) {
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

    static async getRoyaltiesByMonth(options: { upc?: string; isrc?: string } = {}) {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByMonth", options);
    }

    static async getRoyaltiesByYear() {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByYear");
    }

    static async getRoyaltiesByTrack() {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByTrack");
    }

    static async getRoyaltiesByService(options: { upc?: string; isrc?: string } = {}) {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByService", options);
    }

    static async getRoyaltiesByCountry() {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByCountry");
    }

    static async getPayments() {
        return await Fetcher.get<Payment[]>(base + "/payments/get");
    }

    static async getAvailablePaymentAmount() {
        return await Fetcher.postWithResponse<RoyaltyInfo>(base + "/payments/available");
    }

    static async getLogs() {
        return await Fetcher.get<Log[]>(base + "/logs/get");
    }

    static async getAlbums() {
        return await Fetcher.get<Album[]>(base + "/albums/get");
    }

    static async createAlbum(album: CreateAlbumRequestBody) {
        return await Fetcher.postWithResponse<Album>(base + "/albums/actions/new", album);
    }

    static async importData() {
        return await Fetcher.post(base + "/data/import");
    }

    static async quarterlyReport(year: number, quarter: number) {
        return await Fetcher.postWithResponse<any[]>(base + "/statistics/quarterlyReport", {
            year,
            quarter
        });
    }

    static async addRoyalties(csv: string) {
        return await Fetcher.post(base + "/data/add", {
            type: "royalties",
            data: csv
        });
    }

    static async getRoyaltiesByArtist() {
        return await Fetcher.get<Statistic[]>(base + "/statistics/royaltiesByArtist");
    }

    static async getAlbum(id: number) {
        return await Fetcher.get<Album>(base + "/albums/byId?id=" + id);
    }

    static getTrack(id: number) {
        return Fetcher.get<Track>(base + "/tracks/byId?id=" + id);
    }

    static updateTrack(id: number, track: Partial<Track>) {
        return Fetcher.post(base + "/tracks/actions/update", { id, ...track });
    }

    static requestPayment() {
        return Fetcher.post(base + "/payments/request");
    }

    static updateAlbum(id: number, album: Partial<Album>) {
        return Fetcher.post(base + "/albums/actions/update", { id, ...album });
    }

    static async getTracks() {
        return await Fetcher.get<Track[]>(base + "/tracks/get");
    }

    static createTrack(track: UploadTrackRequestBody) {
        return Fetcher.post(base + "/tracks/create", track);
    }

    static removeTrackFromAlbum(track_id: number, album_id: number) {
        return Fetcher.post(base + "/albums/actions/removeTrack", {
            track_id,
            album_ids: [album_id]
        });
    }

    static searchTracks(q: string) {
        return Fetcher.get<SearchResult[]>(base + "/search/tracks?search=" + q);
    }

    static addTrackToAlbum(track_id: number, album_id: number) {
        return Fetcher.post(base + "/albums/actions/addTrack", {
            track_id,
            album_ids: [album_id]
        });
    }

    static deleteMedia(type: MediaFileType, referenceId: number) {
        return Fetcher.post(base + "/media/delete", {
            type,
            referenceId
        });
    }

    static updateArtist(name: string, artist: Partial<Artist>) {
        return Fetcher.post(base + "/artists/update", {
            ...artist,
            name,
        });
    }

    static async verifyTotp(userId: number, token: string, type?: string) {
        return await Fetcher.post(base + "/totp/verify", {
            userId,
            token,
            type
        });
    }

    static async deleteTotpMethod(id: number, token: string) {
        return await Fetcher.post(base + "/totp/delete", {
            id,
            token
        });
    }

    static addTotpMethod(name: string) {
        return Fetcher.postWithResponse<{
            secret: string;
            qrDataUrl: string;
        }>(base + "/totp/add", {
            name
        });
    }

    static getWebauthnChallenge() {
        return Fetcher.postWithResponse<{
            challenge: string;
        }>(base + "/webauthn/challenge");
    }

    static registerWebauthnMethod(registration: RegistrationJSON, challenge: string, name: string) {
        return Fetcher.post(base + "/webauthn/register", {
            registration,
            challenge,
            name
        });
    }

    static verifyWebauthn(json: AuthenticationJSON, challenge: string) {
        return Fetcher.post(base + "/webauthn/verify", {
            verification: json,
            challenge
        });
    }

    static async deleteWebauthnMethod(key_id: string, challenge: string) {
        return await Fetcher.post(base + "/webauthn/delete", {
            key_id,
            challenge
        });
    }

    static async getMfaOptions(username: string, password: string) {
        return await Fetcher.postWithResponse<{ type: MfaOption }[]>(base + "/mfa/options", {
            username,
            password
        });
    }

    static mfaRequest(username: string, password: string, method: MfaOption) {
        return Fetcher.postWithResponse<{
            mfa_needed: boolean;
            type?: MfaOption;
            credentialDescriptors?: CredentialDescriptor[];
            userId?: number;
            user?: User;
        }>(base + "/mfa/request", {
            username,
            password,
            method
        });
    }

    static createUser(username: string, legal_name: string, country: string, state: string, email: string, temp_password: string) {
        return Fetcher.postWithResponse<User>(base + "/user/actions/create", {
            username,
            legal_name,
            country,
            state,
            email,
            temp_password
        });
    }
}
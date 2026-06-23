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
import {ArtistLink} from "../models/db/tri/ArtistLink.ts";
import {AuthenticationJSON, CredentialDescriptor, RegistrationJSON} from "@passwordless-id/webauthn/dist/esm/types";
import {MfaOption} from "../enums/MfaOption.ts";
import {PaymentStatus} from "../enums/PaymentStatus.ts";

type PublicUiConfig = {
    labelUiUrl: string;
    portalApiUrl: string;
    contactEmail: string;
    labelName: string;
};

let base = "";

export class Api {
    static baseUrl = base;
    static labelUiUrl = "";
    static contactEmail = "";
    static labelName = "LabelSpace";

    private static joinUrl(baseUrl: string, path: string) {
        return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
    }

    static labelUrl(path: string) {
        return this.joinUrl(this.labelUiUrl, path);
    }

    static async initialize() {
        const bootstrapResponse = await fetch("/api-url", {
            credentials: "same-origin",
        });

        if (!bootstrapResponse.ok) {
            throw new Error(`Failed to load backend API URL: ${bootstrapResponse.status} ${bootstrapResponse.statusText}`);
        }

        const bootstrapApiUrl = (await bootstrapResponse.text()).trim();
        if (!bootstrapApiUrl) {
            throw new Error("Backend API URL bootstrap endpoint returned an empty value.");
        }

        const config = await Fetcher.get<PublicUiConfig>(`${bootstrapApiUrl}/config/ui`);
        if (!config?.portalApiUrl || !config.labelUiUrl || !config.contactEmail) {
            throw new Error("Backend UI config response is missing required URLs.");
        }

        base = config.portalApiUrl.trim();
        this.baseUrl = base;
        this.labelUiUrl = config.labelUiUrl.trim();
        this.contactEmail = config.contactEmail.trim();
        this.labelName = config.labelName?.trim() || "LabelSpace";
    }

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

    static async updateSetting(key: string, value: any) {
        return await Fetcher.post(base + "/user/actions/update-setting", { key, value });
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

    static async getPayments(options: {
        status?: PaymentStatus;
        startTime?: string;
        endTime?: string;
        minAmount?: number;
        maxAmount?: number;
        userQuery?: string;
    } = {}) {
        return await Fetcher.get<Payment[]>(base + "/payments/get", options);
    }

    static async getAvailablePaymentAmount() {
        return await Fetcher.postWithResponse<RoyaltyInfo>(base + "/payments/available");
    }

    static async getLogs(options: {
        logLevel?: number;
        message?: string;
        startTime?: string;
        endTime?: string;
        offset?: number;
        limit?: number;
    } = {}) {
        return await Fetcher.get<Log[]>(base + "/logs/get", options);
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

    static getArtistLinks(id: number) {
        return Fetcher.get<ArtistLink[]>(base + "/artists/links/get", {id});
    }

    static createArtistLink(artistId: number, text: string, url: string) {
        return Fetcher.post(base + "/artists/links/create", {
            artistId,
            text,
            url
        });
    }

    static updateArtistLink(id: number, text: string, url: string) {
        return Fetcher.post(base + "/artists/links/update", {
            id,
            text,
            url
        });
    }

    static deleteArtistLink(id: number) {
        return Fetcher.post(base + "/artists/links/delete", {
            id
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
        return Fetcher.post(base + "/user/actions/create", {
            username,
            legal_name,
            country,
            state,
            email,
            temp_password
        });
    }

    static createAttachment(albumId: number, name: string) {
        return Fetcher.postWithResponse<{ attachmentId: number }>(base + "/albums/actions/createAttachment", {
            albumId,
            name
        });
    }

    static deleteAttachment(attachmentId: number) {
        return Fetcher.post(base + "/albums/actions/deleteAttachment", {
            attachmentId
        });
    }

    static updateAttachment(attachmentId: number, visible_to_artists: string) {
        return Fetcher.post(base + "/albums/actions/updateAttachment", {
            attachmentId,
            visible_to_artists
        });
    }

    static sendAlbumNewsletter(id: number) {
        return Fetcher.post(base + "/albums/actions/sendNewsletter", {
            id
        });
    }

    static addTrackLink(id: number, url: string) {
        return Fetcher.post(base + "/tracks/actions/addLink", {
            id, url
        })
    }

    static removeTrackLink(id: number, url: string) {
        return Fetcher.post(base + "/tracks/actions/removeLink", {
            id, url
        });
    }

    static addAlbumLink(id: number, url: string) {
        return Fetcher.post(base + "/albums/actions/addLink", {
            id, url
        })
    }

    static removeAlbumLink(id: number, url: string) {
        return Fetcher.post(base + "/albums/actions/removeLink", {
            id, url
        });
    }

    static createArtist(name: string, linkedUserId: number) {
        return Fetcher.post(base + "/artists/actions/create", {
            name,
            linkedUserId
        });
    }
}

import {NotificationType} from "../enums/NotificationType.ts";
import {notify} from "../functions/notifications.ts";

export class Fetcher {
    private static async handleResponse<T = null>(res: Response, parseOutput = true): Promise<T|null> {
        const text = await res.text();
        if (!res.ok) {
            const json = JSON.parse(text);
            if (json.error) {
                console.error(`Failed POST (${res.status}): ${json.error}`);
                throw new Error(json.error);
            }
            console.error(`Failed POST (${res.status}): ${text}`);
            throw new Error(text);
        }

        if (!parseOutput) {
            return text as T;
        }

        try {
            return JSON.parse(text) as T;
        } catch (e) {
            notify(`Failed to parse response: ${text}`, NotificationType.error);
            throw e;
        }
    }

    static async get<T>(url: string, params: any = {}): Promise<T> {
        const urlWithParams = url + (Object.keys(params).length > 0 ? "?" + new URLSearchParams(params).toString() : "");

        const res = await fetch(urlWithParams, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });

        return await this.handleResponse<T>(res);
    }

    static async post(url: string, body: any = {}): Promise<string> {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(body)
        });

        return await this.handleResponse(res, false);
    }

    static async postWithResponse<T>(url: string, body: any = {}): Promise<T> {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(body)
        });

        return await this.handleResponse<T>(res);
    }
}
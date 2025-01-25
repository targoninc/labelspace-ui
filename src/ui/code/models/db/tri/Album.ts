import {User} from "./User.js";
import type {Track} from "./Track.ts";

export interface Album {
    earnings?: number;
    tracks?: Track[];
    user?: User;
    id: number;
    title: string;
    upc: string;
    release_date: Date;
    created_at: Date;
    updated_at: Date;
    visibility: string;
    secretcode: string;
    has_cover: boolean;
    price: number;
    artists: string;
}
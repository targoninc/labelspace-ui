import {Album} from "./Album.js";
import {User} from "./User.js";

export interface Track {
    repost_user_id?: number;
    user?: User;
    comments?: Comment[];
    albums?: Album[];
    notifications?: Notification[];
    id: number;
    user_id: number;
    title: string;
    isrc: string;
    artistname: string;
    upc: string;
    credits: string;
    loudness_data: string;
    genre: string;
    version: string;
    versionid: number;
    length: number;
    description: string;
    release_date: Date;
    updated_at: Date;
    created_at: Date;
    plays: number;
    secretcode: string;
    monetization: boolean;
    price: number;
    has_cover: boolean;
    processed: boolean;
}
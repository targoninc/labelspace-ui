import {Album} from "./Album.js";
import {User} from "./User.js";

export interface Track {
    repost_user_id?: number;
    user?: User;
    comments?: Comment[];
    album?: Album;
    notifications?: Notification[];
    id: number;
    album_id?: number;
    title: string;
    artists: string;
    isrc: string;
    credits: string;
    loudness_data: string;
    genre: string;
    length: number;
    release_date: Date;
    updated_at: Date;
    created_at: Date;
    price: number;
    has_cover: boolean;
    processed: boolean;
    link_spotify: string;
    link_youtube: string;
    link_soundcloud: string;
    link_applemusic: string;
    link_bandcamp: string;
    link_lyda: string;
}
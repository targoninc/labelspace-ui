import {User} from "./User.js";
import type {Track} from "./Track.ts";
import {AlbumAttachment} from "./AlbumAttachment.ts";
import {Link} from "./Link.ts";

export interface Album {
    links: Link[];
    attachments?: AlbumAttachment[];
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
    campaign_sent: boolean;
    price: number;
    artists: string;
}
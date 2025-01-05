import {User} from "./User.js";
import {Track} from "./Track.ts";

export interface Album {
    tracks?: Track[];
    user?: User;
    id: number;
    user_id: number;
    title: string;
    description: string;
    upc: string;
    release_date: Date;
    created_at: Date;
    updated_at: Date;
    visibility: string;
    secretcode: string;
    has_cover: boolean;
    price: number;
}
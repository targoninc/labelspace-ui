import {User} from "../models/db/tri/User.ts";

export interface Route {
    icon?: string;
    path: string;
    title?: string;
    pathParams?: string[];
    aliases?: string[];
    template: Function;
    allowWithoutLogin?: boolean;
    showInNav?: (user: User|null) => boolean;
}
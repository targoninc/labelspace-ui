import {Permission} from "../models/db/tri/Permission.ts";
import {User} from "../models/db/tri/User.ts";

export interface Route {
    icon?: string;
    path: string;
    title?: string;
    pathParams?: string[];
    aliases?: string[];
    template: Function;
    showInNav?: (user: User, permissions: Permission[]) => boolean;
}
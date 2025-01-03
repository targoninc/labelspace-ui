import {signal} from "../fjsc/src/signals.ts";
import {Router} from "./routing/Router.ts";
import {Route} from "./routing/Route.ts";
import {User} from "./models/db/tri/User.ts";

export const currentUser = signal<User|null>(null);

export const userLoading = signal(true);

export const router = signal<Router|null>(null);

export const currentRoute = signal<Route|null>(null);
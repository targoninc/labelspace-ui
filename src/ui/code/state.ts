import {compute, signal} from "../fjsc/src/signals.ts";
import type {User} from "./models/User.ts";
import {Router} from "./routing/Router.ts";
import {Route} from "./routing/Route.ts";

export const currentUser = signal<User|null>(null);

export const router = signal<Router|null>(null);

export const currentRoute = signal<Route|null>(null);
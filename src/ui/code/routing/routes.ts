import {Route} from "./Route.ts";
import {Generics} from "../components/generics.ts";
import {Account} from "../components/account.ts";

export const routes: Route[] = [
    {
        path: "404",
        title: "404",
        aliases: ["error", "not-found"],
        template: Generics.notFound
    },
    {
        path: "password-reset",
        title: "Password reset",
        template: Account.passwordReset
    }
];
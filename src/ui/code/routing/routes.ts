import {Route} from "./Route.ts";
import {Generics} from "../components/generics.ts";

export const routes: Route[] = [
    {
        path: "404",
        title: "404",
        aliases: ["error", "not-found"],
        template: Generics.notFound
    }
];
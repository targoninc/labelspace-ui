import {signal} from "../../fjsc/src/signals.ts";
import {Generics} from "./generics.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {User} from "../models/db/tri/User.ts";
import {Api} from "../api/api.ts";

export class Users {
    static listPage() {
        const users = signal<User[]>([]);
        const loading = signal(false);
        Api.getUsers()
            .then(u => users.value = u)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            ifjs(loading, Generics.loading()),
            Generics.heading(2, "Users"),
            Generics.list(
                users,
                (user: User) => Users.user(user)
            )
        )
    }

    static user(user: User) {
        return create("div")
            .classes("flex")
            .children(
                Generics.heading(3, `@${user.username}`),
            ).build();
    }
}
import {compute, signal} from "../../fjsc/src/signals.ts";
import {Generics} from "./generics.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {User} from "../models/db/tri/User.ts";
import {Api} from "../api/api.ts";
import {Artist} from "../models/db/tri/Artist.ts";
import {currentUser} from "../state.ts";

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
            .classes("flex", "space-outwards")
            .children(
                Generics.heading(3, `@${user.username}`),
                create("span")
                    .text(user.artists?.map(a => a.name).join(", "))
                    .build()
            ).build();
    }

    static profile() {
        const artists = compute(u => u?.artists ?? [], currentUser);
        const headers = ["Artist", "Legal name"];

        return Generics.pageFrame(
            Generics.heading(2, "Profile"),
            Generics.heading(3, "Your artists"),
            Generics.table(
                headers,
                artists,
                (artist: Artist) => create("tr")
                    .children(
                        create("td")
                            .text(artist.name)
                            .build(),
                        Generics.privateText(artist.legal_name)
                    ).build()
            )
        );
    }
}
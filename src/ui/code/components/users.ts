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
            Generics.table(
                ["Username", "Artists"],
                users,
                (user: User) => Users.userInTable(user)
            )
        )
    }

    static userInTable(user: User) {
        return create("tr")
            .children(
                create("td")
                    .text(`@${user.username}`)
                    .build(),
                create("td")
                    .text(user.artists?.map(a => a.name).join(", ") ?? "No artists")
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
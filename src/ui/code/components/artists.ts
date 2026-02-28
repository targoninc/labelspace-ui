import {compute, create, Signal, signal, when} from "@targoninc/jess";
import {link} from "d3";
import {Artist} from "../models/db/tri/Artist.ts";
import {Generics} from "./generic/generics.ts";
import {Inputs} from "./generic/inputs.ts";
import {button} from "@targoninc/jess-components";
import {Api} from "../api/api.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {User} from "../models/db/tri/User.ts";

export class Artists {
    static createSection(users: Signal<User[]>) {
        const name = signal("");
        const linkedUserId = signal<number>(0);
        const loading = signal(false);
        const artists$ = signal<Artist[]>([]);
        const disabled = compute((a, u, l, artists) => {
            const nameFound = artists.some(artist => artist.name === a);
            return !a || !u || l || nameFound;
        }, name, linkedUserId, loading, artists$);

        return Generics.collapsibleContainer(1, "Create new artist", "Hide form", [
            Generics.heading(2, "Create new artist"),
            Inputs.text(name, "Artist name", "name"),
            Inputs.number(linkedUserId, "Linked user ID", "linkedUserId"),
            create("div")
                .classes("flex", "center-items")
                .children(
                    button({
                        text: "Create artist",
                        icon: {icon: "add"},
                        classes: ["positive"],
                        disabled: disabled,
                        onclick: () => {
                            loading.value = true;
                            Api.createArtist(
                                name.value,
                                linkedUserId.value!
                            ).then(() => {
                                notify("Artist created", NotificationType.success);
                                Api.getUsers().then(u => users.value = u);
                                name.value = "";
                                linkedUserId.value = 0;
                            }).catch(e => {
                                notify(`Error: ${e.message}`, NotificationType.error);
                            }).finally(() => loading.value = false);
                        }
                    }),
                    when(loading, Generics.loading())
                ).build()
        ]);
    }
}
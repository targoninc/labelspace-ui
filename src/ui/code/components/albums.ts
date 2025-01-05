import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {Album} from "../models/db/tri/Album.ts";
import {Api} from "../api/api.ts";
import {Generics} from "./generics.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {navigate} from "../routing/Router.ts";
import {FJSC} from "../../fjsc";
import {Inputs} from "./inputs.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {Route} from "../routing/Route.ts";
import {currency} from "../functions/formatters.ts";
import {Track} from "../models/db/tri/Track.ts";

export class Albums {
    static page() {
        const albums = signal<Album[]>([]);
        const loading = signal(false);
        Api.getAlbums()
            .then(a => albums.value = a)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Albums"),
                    Albums.createSection(),
                    ifjs(loading, Generics.loading()),
                    Generics.table(
                        ["Title", "Release date"],
                        albums,
                        (album: Album) => create("tr")
                            .onclick(() => navigate(`/album/${album.id}`))
                            .children(
                                create("td")
                                    .text(album.title)
                                    .build(),
                                create("td")
                                    .text(new Date(album.release_date).toLocaleString())
                                    .build(),
                            ).build()
                    )
                ).build()
        );
    }

    private static createSection() {
        return create("div")
            .classes("flex")
            .children(
                FJSC.button({
                    text: "Create album",
                    classes: ["positive"],
                    onclick: () => {
                        navigate("/new-album");
                    }
                })
            ).build();
    }

    static createPage() {
        const title = signal("");
        const upc = signal("");
        const release_date = signal(new Date());
        const price = signal(10);
        const anyEmpty = compute((t, u, r, p) => t === "" || u === "" || r === "" || p === 0, title, upc, release_date, price);

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Create album"),
                    Inputs.text(title, "Title", "title"),
                    Inputs.text(upc, "UPC", "upc"),
                    Inputs.date(release_date, "Release date", "release_date"),
                    Inputs.number(price, "Price", "price"),
                    FJSC.button({
                        text: "Create",
                        classes: ["positive"],
                        disabled: anyEmpty,
                        onclick: () => {
                            Api.createAlbum({
                                title: title.value,
                                upc: upc.value,
                                release_date: release_date.value,
                                price: price.value,
                            }).then(() => {
                                notify("Album created", NotificationType.success);
                                navigate("/albums");
                            }).catch(e => {
                                console.error(e);
                            });
                        }
                    })
                ).build(),
        );
    }

    static albumPage(route: Route, params: any) {
        const album = signal<Album|null>(null);
        const loading = signal(false);
        Api.getAlbum(params.id ?? 0)
            .then(a => album.value = a)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Album"),
                    ifjs(loading, Generics.loading()),
                    ifjs(album, Albums.album(album))
                ).build()
        );
    }

    static album(value: Signal<Album | null>) {
        const title = compute(a => a?.title ?? "Album", value);
        const upc = compute(a => a?.upc ?? "No UPC", value);
        const releaseDate = compute(a => new Date(a?.release_date), value);
        const price = compute(a => a?.price ?? 0, value);
        const tracks = compute(a => a?.tracks ?? [], value);

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        Inputs.text(title, "Title", "title"),
                        Inputs.text(upc, "UPC", "upc"),
                        Inputs.date(releaseDate, "Release date", "release_date"),
                        Inputs.number(price, "Price", "price"),
                    ).build(),
                Generics.table(
                    ["Track", "Price"],
                    tracks,
                    (track: Track) => create("tr")
                        .onclick(() => navigate("/track/" + track.id))
                        .children(
                            create("td")
                                .text(track.title)
                                .build(),
                            create("td")
                                .text(currency(track.price))
                                .build(),
                        ).build()
                )
            ).build();
    }
}
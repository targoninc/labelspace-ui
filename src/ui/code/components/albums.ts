import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {Album} from "../models/db/tri/Album.ts";
import {Api} from "../api/api.ts";
import {Generics} from "./generics.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {navigate, reload} from "../routing/Router.ts";
import {FJSC} from "../../fjsc";
import {Inputs} from "./inputs.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {Route} from "../routing/Route.ts";
import {currency} from "../functions/formatters.ts";
import {Track} from "../models/db/tri/Track.ts";
import {currentUser} from "../state.ts";
import {Permissions} from "../enums/Permissions.ts";
import {Tab} from "../models/tab.ts";
import {Tracks} from "./tracks.ts";

export class Albums {
    static page() {
        const canManageReleases = compute(u => !!(u && u.permissions?.some(p => p.name === Permissions.releaseManagement)), currentUser);
        const tabs: Tab[] = [
            {
                key: "albums",
                text: "Albums",
                icon: "album"
            },
            {
                key: "tracks",
                text: "Tracks",
                icon: "graphic_eq"
            }
        ];
        const tab$ = signal(tabs[0].key);

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.tabSelector(tab$, tabs),
                    Generics.tabContents(tab$, {
                        "albums": () => Albums.albumsTab(canManageReleases),
                        "tracks": () => Tracks.tracksTab(canManageReleases)
                    })
                ).build()
        );
    }

    static albumsTab(canManageReleases: Signal<boolean>) {
        const albums = signal<Album[]>([]);
        const count = compute(a => a.length + " Albums", albums);
        const loading = signal(false);
        Api.getAlbums()
            .then(a => albums.value = a)
            .finally(() => loading.value = false);

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(2, count),
                ifjs(canManageReleases, Albums.createSection()),
                ifjs(loading, Generics.loading()),
                Generics.table(
                    ["Title", "Release date"],
                    albums,
                    (album) => create("tr")
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
            ).build();
    }

    private static createSection() {
        return create("div")
            .classes("flex")
            .children(
                FJSC.button({
                    text: "Create album",
                    icon: {icon: "add"},
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
        const anyEmpty = compute((t, u, r, p) => t === "" || u === "" || r === null || p === 0, title, upc, release_date, price);
        if (!currentUser.value?.permissions?.some(p => p.name === Permissions.releaseManagement)) {
            return Generics.pageFrame(
                create("div")
                    .classes("flex-v")
                    .children(
                        Generics.heading(2, "Not allowed"),
                        create("p")
                            .text("You are not allowed to create albums.")
                            .build()
                    ).build()
            );
        }

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
                                navigate("/releases");
                            }).catch(e => {
                                console.error(e);
                            });
                        }
                    })
                ).build(),
        );
    }

    static albumPage(route: Route, params: any) {
        const album = signal<Album | null>(null);
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

    static album(album: Signal<Album | null>) {
        const title = compute(a => a?.title ?? "Album", album);
        const upc = compute(a => a?.upc ?? "No UPC", album);
        const releaseDate = compute(a => new Date(a?.release_date ?? new Date().toISOString()), album);
        const price = compute(a => a?.price ?? 0, album);
        const tracks = compute(a => a?.tracks ?? [], album);
        const id = compute(a => a?.id ?? 0, album);
        const noneChanged = compute((t, u, r, p) => {
            return t === album.value?.title && u === album.value?.upc && r.getTime() === new Date(album.value?.release_date).getTime() && p === album.value?.price;
        }, title, upc, releaseDate, price);

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
                        FJSC.button({
                            text: "Update",
                            icon: {icon: "save"},
                            classes: ["positive"],
                            disabled: noneChanged,
                            onclick: () => {
                                Api.updateAlbum(id.value, {
                                    title: title.value,
                                    upc: upc.value,
                                    release_date: releaseDate.value,
                                    price: price.value,
                                }).then(() => {
                                    notify("Album updated", NotificationType.success);
                                    reload();
                                }).catch((e: any) => {
                                    console.error(e);
                                });
                            }
                        })
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
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {Album} from "../models/db/tri/Album.ts";
import {Api} from "../api/api.ts";
import {Generics} from "./generics.ts";
import {create, ifjs, nullElement} from "../../fjsc/src/f2.ts";
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
import {Tab} from "../models/Tab.ts";
import {Tracks} from "./tracks.ts";
import {Modals} from "./modals.ts";
import {SearchResult} from "../models/SearchResult.ts";
import {getImageUrl, target} from "../functions/templates.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {Statistic} from "../models/Statistic.ts";
import {Statistics} from "./statistics.ts";
import {dayFrom, today} from "../functions/dates.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {RequestableImageSize} from "./requestableImageSize.ts";
import {Images} from "./images.ts";
import {ImageSize} from "./imageSize.ts";

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
        const filter = signal("");
        const filteredAlbums = compute((a, f) => a.filter(a => {
            return a.title.toLowerCase().includes(f.toLowerCase()) ||
                a.artists.toLowerCase().includes(f.toLowerCase());
        }), albums, filter);
        const count = compute(a => a.length + " Albums", filteredAlbums);
        const loading = signal(false);
        Api.getAlbums()
            .then(a => albums.value = a)
            .finally(() => loading.value = false);

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(2, count),
                Albums.listActions(canManageReleases, filter),
                ifjs(loading, Generics.loading()),
                Generics.table(
                    ["Cover", "Title", "Release date", "Tracks"],
                    filteredAlbums,
                    (album) => create("tr")
                        .children(
                            create("td")
                                .children(
                                    Generics.image(getImageUrl(MediaFileType.albumCover, album.id, RequestableImageSize.s50))
                                ).build(),
                            create("td")
                                .children(
                                    Generics.link("/album/" + album.id, album.title)
                                ).build(),
                            create("td")
                                .text(new Date(album.release_date).toLocaleString())
                                .build(),
                            create("td")
                                .text(album.tracks?.length ?? 0)
                                .build(),
                        ).build(),
                    ["scroll-table"]
                )
            ).build();
    }

    private static listActions(canManageReleases: Signal<boolean>, filter: Signal<string>) {
        return create("div")
            .classes("flex")
            .children(
                ifjs(canManageReleases, FJSC.button({
                    text: "Create album",
                    icon: {icon: "add"},
                    classes: ["positive"],
                    onclick: () => {
                        navigate("/new-album");
                    }
                })),
                FJSC.input({
                    type: InputType.text,
                    name: "filter",
                    placeholder: "Filter",
                    value: filter,
                    onkeydown: (e) => {
                        setTimeout(() => {
                            filter.value = target(e).value;
                        }, 10);
                    },
                }),
            ).build();
    }

    static createPage() {
        const title = signal("");
        const upc = signal("");
        const artists = signal("");
        const release_date = signal(today());
        const price = signal(10);
        const anyEmpty = compute((t, u, a, r, p) => t === "" || u === "" || a === "" || r === null || p === 0, title, upc, artists, release_date, price);
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
                    Inputs.text(artists, "Artists", "artists"),
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
                                release_date: new Date(release_date.value),
                                price: price.value,
                                artists: artists.value,
                            }).then((album) => {
                                notify("Album created", NotificationType.success);
                                navigate(`/album/${album.id}`);
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
        const load = () => {
            loading.value = true;
            Api.getAlbum(params.id ?? 0)
                .then(a => album.value = a)
                .finally(() => loading.value = false);
        }
        load();

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Album"),
                    ifjs(loading, Generics.loading()),
                    ifjs(album, Albums.album(album, load)),
                    ifjs(album, Albums.albumStatistics(album))
                ).build()
        );
    }

    static albumStatistics(album: Signal<Album | null>) {
        const loading = signal(false);
        const stats = signal<Statistic[]>([]);
        const upc = compute(a => a?.upc ?? "No UPC", album);
        const template = compute(s => {
            if (s.length === 0) {
                return nullElement();
            }
            return Statistics.royaltiesByMonthChart(s.map(s => s.label), s.map(s => s.value));
        }, stats);
        const load = () => {
            loading.value = true;
            Api.getRoyaltiesByMonth({ upc: upc.value })
                .then(s => stats.value = s)
                .finally(() => loading.value = false);
        };
        upc.subscribe(load);
        load();

        return create("div")
            .classes("flex-v", "statistic")
            .children(
                ifjs(loading, Generics.loading()),
                template
            ).build();
    }

    static album(album: Signal<Album | null>, load: Function) {
        const title = compute(a => a?.title ?? "Album", album);
        const upc = compute(a => a?.upc ?? "No UPC", album);
        const releaseDate = compute(a => {
            return dayFrom(a?.release_date ?? new Date());
        }, album);
        const price = compute(a => a?.price ?? 0, album);
        const tracks = compute(a => a?.tracks ?? [], album);
        const id = compute(a => a?.id ?? 0, album);
        const noneChanged = compute((t, u, r, p) => {
            return t === album.value?.title && u === album.value?.upc && new Date(r).getTime() === new Date(album.value?.release_date).getTime() && p === album.value?.price;
        }, title, upc, releaseDate, price);
        const loading = signal(false);
        const search = signal("");
        const searchResults = signal<SearchResult[]>([]);
        let timeout: Timer;
        const debounce = 250;
        search.subscribe(q => {
            timeout && clearTimeout(timeout);
            if (!q || q.trim().length === 0) {
                return;
            }
            timeout = setTimeout(() => {
                Api.searchTracks(q)
                    .then(results => searchResults.value = results)
                    .finally();
            }, debounce);
        });
        const hasImage = compute(a => a?.has_cover ?? false, album);

        return create("div")
            .classes("flex")
            .children(
                create("div")
                    .classes("flex-v")
                    .children(
                        Images.changeableImage(id, hasImage, MediaFileType.albumCover, {
                            changeable: true,
                            deletable: true,
                            size: ImageSize.p500
                        }),
                    ).build(),
                create("div")
                    .classes("flex-v", "flex-grow")
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
                                    disabled: compute((l, n) => l || n, loading, noneChanged),
                                    onclick: () => {
                                        Api.updateAlbum(id.value, {
                                            title: title.value,
                                            upc: upc.value,
                                            release_date: new Date(releaseDate.value),
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
                    ).build(),
                create("div")
                    .classes("flex-v", "flex-grow")
                    .children(
                        Generics.table(
                            ["Track", "Price", "Actions"],
                            tracks,
                            (track: Track) => create("tr")
                                .children(
                                    create("td")
                                        .children(
                                            Generics.link("/track/" + track.id, track.title)
                                        ).build(),
                                    create("td")
                                        .text(currency(track.price))
                                        .build(),
                                    create("td")
                                        .children(
                                            FJSC.button({
                                                icon: { icon: "link_off" },
                                                disabled: loading,
                                                onclick: () => {
                                                    Modals.confirm(() => {
                                                        loading.value = true;
                                                        Api.removeTrackFromAlbum(track.id, album.value?.id ?? 0).then(() => {
                                                            load();
                                                        }).finally(() => loading.value = false);
                                                    }, "Remove track from album", "Are you sure you want to remove this track from the album?");
                                                }
                                            }),
                                        ).build()
                                ).build()
                        ),
                        Generics.divider(),
                        FJSC.input({
                            type: InputType.text,
                            name: "search",
                            label: "Add tracks",
                            placeholder: "Search",
                            value: search,
                            onkeydown: (e) => {
                                setTimeout(() => {
                                    search.value = target(e).value;
                                }, 10);
                            }
                        }),
                        Generics.table(
                            ["Title", "Artists", "Actions"],
                            searchResults,
                            (track) => create("tr")
                                .children(
                                    create("td")
                                        .children(
                                            Generics.link("/track/" + track.id, track.display)
                                        ).build(),
                                    create("td")
                                        .text(track.subtitle)
                                        .build(),
                                    create("td")
                                        .children(
                                            FJSC.button({
                                                icon: { icon: "add_link" },
                                                disabled: loading,
                                                onclick: () => {
                                                    loading.value = true;
                                                    const add = () => {
                                                        Api.addTrackToAlbum(track.id, album.value?.id ?? 0).then(() => {
                                                            load();
                                                        }).finally(() => loading.value = false);
                                                    }

                                                    Api.getTrack(track.id)
                                                        .then(track => {
                                                            if (track.album_id) {
                                                                Modals.confirm(add, "Conflict", "This track is already in an album. Do you want to add it to this album? This will remove it from the other album.");
                                                            } else {
                                                                add();
                                                            }
                                                        });
                                                }
                                            }),
                                        ).build()
                                ).build()
                        ),
                    ).build(),
            ).build();
    }
}
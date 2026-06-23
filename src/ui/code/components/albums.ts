import {Album} from "../models/db/tri/Album.ts";
import {Api} from "../api/api.ts";
import {Generics, horizontal, vertical} from "./generic/generics.ts";
import {navigate, reload} from "../routing/Router.ts";
import {Inputs} from "./generic/inputs.ts";
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
import {Statistics} from "./statistics.ts";
import {dayFrom, today, toUTCDate} from "../functions/dates.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {RequestableImageSize} from "../enums/requestableImageSize.ts";
import {Images} from "./generic/images.ts";
import {ImageSize} from "../enums/imageSize.ts";
import {Time} from "../functions/time.ts";
import {Files} from "./generic/files.ts";
import {compute, create, InputType, Signal, signal, signalMap, when} from "@targoninc/jess";
import {button, input, toggle} from "@targoninc/jess-components";

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
        const filteredUpcoming = compute(a => a.filter(a => !a.release_date || new Date(a.release_date).getTime() > new Date().getTime()), filteredAlbums);
        const filteredReleased = compute(a => a.filter(a => new Date(a.release_date).getTime() <= new Date().getTime()), filteredAlbums);
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
                when(loading, Generics.loading()),
                create("div")
                    .classes("scroll-table")
                    .children(
                        Generics.heading(3, "Unreleased"),
                        signalMap(filteredUpcoming, horizontal(), album => Albums.albumCard(album)),
                        Generics.heading(3, "Released"),
                        signalMap(filteredReleased, horizontal(), album => Albums.albumCard(album)),
                    ).build()
            ).build();
    }

    private static albumCard(album: Album) {
        return vertical(
            Generics.image(getImageUrl(MediaFileType.albumCover, album.id, RequestableImageSize.s100)),
            Generics.link("/album/" + album.id, album.title),
            create("span")
                .text(`${new Date(album.release_date).toLocaleDateString(undefined, {timeZone: 'UTC'})}`)
                .build(),
            create("span")
                .text(`${album.tracks?.length ?? 0} track${(album.tracks?.length === 1) ? "" : "s"}`)
                .build()
        ).onclick(() => {
            navigate("/album/" + album.id);
        }).classes("container", "layer-2", "album-card").build();
    }

    private static listActions(canManageReleases: Signal<boolean>, filter: Signal<string>) {
        return create("div")
            .classes("flex")
            .children(
                when(canManageReleases, button({
                    text: "Create album",
                    icon: {icon: "add"},
                    classes: ["positive"],
                    onclick: () => {
                        navigate("/new-album");
                    }
                })),
                input({
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
                .classes("flex-v", "auth-box")
                .children(
                    Generics.heading(2, "Create album"),
                    Inputs.text(title, "Title", "title"),
                    Inputs.text(upc, "UPC", "upc"),
                    Inputs.text(artists, "Artists", "artists"),
                    Inputs.date(release_date, "Release date", "release_date"),
                    Inputs.number(price, "Price", "price"),
                    button({
                        text: "Create",
                        icon: { icon: "add" },
                        classes: ["positive"],
                        disabled: anyEmpty,
                        onclick: () => {
                            Api.createAlbum({
                                title: title.value,
                                upc: upc.value,
                                release_date: toUTCDate(new Date(release_date.value)),
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
        const album$ = signal<Album | null>(null);
        const loading = signal(false);
        const earnings = compute(a => a?.earnings ?? 0, album$);
        const hasFileManagementPermission = compute(u => u?.permissions?.some(p => p.name === Permissions.fileManagement) ?? false, currentUser);
        const hasReleaseManagementPermission = compute(u => u?.permissions?.some(p => p.name === Permissions.releaseManagement) ?? false, currentUser);
        const canView = compute((a, user, hasPermission) =>
            a?.artists.split(",").some(art => user?.artists?.some(art2 => art2.name === art.trim())) || hasPermission, album$, currentUser, hasFileManagementPermission);
        const load = () => {
            loading.value = true;
            Api.getAlbum(params.id ?? 0)
                .then(a => album$.value = a)
                .finally(() => loading.value = false);
        }
        load();

        return Generics.pageFrame(
            horizontal(
                vertical(
                    when(loading, Generics.loading()),
                    when(album$, Albums.album(album$, hasReleaseManagementPermission, load)),
                ).classes("flex-grow"),
                vertical(
                    when(hasReleaseManagementPermission, Generics.container(1, [
                        vertical(
                            Inputs.serviceLinks(album$, "album"),
                            Albums.campaignSection(album$),
                        )
                    ])),
                    when(canView, Files.albumFiles(album$, load)),
                    Generics.earnings(earnings),
                    when(album$, Albums.albumStatistics(album$))
                )
            ).build()
        );
    }

    static albumStatistics(album: Signal<Album | null>) {
        const upc = compute(a => a?.upc ?? "No UPC", album);
        const options = compute(a => {
            return {upc: a};
        }, upc);

        return vertical(
            Statistics.singleStatistic("Royalties by month", Api.getRoyaltiesByMonth, Statistics.royaltiesByMonthChart, null, options),
            Statistics.singleStatistic("Royalties by service", Api.getRoyaltiesByService, Statistics.royaltiesByServiceChart, null, options),
        ).build();
    }

    static album(album: Signal<Album | null>, hasReleaseManagementPermission: Signal<boolean>, load: Function) {
        const title = compute(a => a?.title ?? "Album", album);
        const upc = compute(a => a?.upc ?? "No UPC", album);
        const releaseDate = compute(a => {
            return dayFrom(a?.release_date ?? new Date());
        }, album);
        const price = compute(a => a?.price ?? 0, album);
        const artists = compute(a => a?.artists ?? "Unknown artists", album);
        const tracks = compute(a => a?.tracks ?? [], album);
        const id = compute(a => a?.id ?? 0, album);
        const noneChanged = compute((t, u, r, p, a) => {
            const currentReleaseDate = album.value?.release_date ? dayFrom(album.value.release_date) : "";

            return t === album.value?.title
                && u === album.value?.upc
                && dayFrom(r) === currentReleaseDate
                && p === album.value?.price
                && a === album.value?.artists;
        }, title, upc, releaseDate, price, artists);
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
        const triRecordsLink = compute(a => Api.labelUrl(`/album/${a?.id}`), album);

        return vertical(
            vertical(
                horizontal(
                    Generics.heading(2, compute((a, t) => `${a} - ${t}`, artists, title)),
                    button({
                        text: "Open on Tri Records",
                        icon: {icon: "open_in_new"},
                        classes: ["positive"],
                        onclick: () => {
                            window.open(triRecordsLink.value, "_blank");
                        }
                    }),
                ).classes("center-items", "split-flex"),
                when(hasReleaseManagementPermission, vertical(
                    Images.changeableImage(id, hasImage, MediaFileType.albumCover, {
                        changeable: false,
                        deletable: false,
                        size: ImageSize.p100
                    }),
                    Generics.heading(2, title),
                    Generics.heading(3, artists),
                    Generics.property("UPC", upc),
                    Generics.property("Release date", releaseDate),
                    Generics.property("Price", currency(price)),
                ).build(), true),
                when(hasReleaseManagementPermission, Albums.albumDetailsEditor(id, hasImage, title, artists, upc, releaseDate, price, loading, noneChanged)),
            ).build(),
            create("div")
                .classes("flex-v", "container", "border")
                .children(
                    Albums.tracksTable(tracks, hasReleaseManagementPermission, loading, album, load),
                    Generics.divider(),
                    when(hasReleaseManagementPermission, Albums.addTracksSection(search, searchResults, loading, album, load)),
                ).build(),
        ).classes("flex-grow").build();
    }

    private static albumDetailsEditor(id: Signal<any>, hasImage: Signal<any>, title: Signal<any>, artists: Signal<any>, upc: Signal<any>, releaseDate: Signal<string>, price: Signal<any>, loading: Signal<boolean>, noneChanged: Signal<boolean>) {
        return Generics.container(0, [
            vertical(
                Images.changeableImage(id, hasImage, MediaFileType.albumCover, {
                    changeable: true,
                    deletable: true,
                    size: ImageSize.p50
                }),
                Inputs.text(title, "Title", "title"),
                Inputs.text(artists, "Artists", "artists"),
                Inputs.text(upc, "UPC", "upc"),
                Inputs.date(releaseDate, "Release date", "release_date"),
                Inputs.number(price, "Price", "price"),
                button({
                    text: "Update",
                    icon: {icon: "save"},
                    classes: ["positive", "fit-content"],
                    disabled: compute((l, n) => l || n, loading, noneChanged),
                    onclick: () => {
                        Api.updateAlbum(id.value, {
                            title: title.value,
                            upc: upc.value,
                            release_date: toUTCDate(new Date(releaseDate.value)),
                            price: price.value,
                            artists: artists.value,
                        }).then(() => {
                            notify("Album updated", NotificationType.success);
                            reload();
                        }).catch((e: any) => {
                            console.error(e);
                        });
                    }
                })
            ).build()
        ]);
    }

    private static tracksTable(tracks: Signal<any>, hasReleaseManagementPermission: Signal<any>, loading: Signal<boolean>, album: Signal<Album | null>, load: Function) {
        return Generics.table(
            ["Track", "Length", "Earnings", "Actions"],
            tracks,
            (track: Track) => create("tr")
                .children(
                    create("td")
                        .children(
                            Generics.link("/track/" + track.id, track.title)
                        ).build(),
                    create("td")
                        .text(Time.toTimeFromSeconds(track.length))
                        .build(),
                    create("td")
                        .text(currency(track.earnings))
                        .build(),
                    create("td")
                        .children(
                            when(hasReleaseManagementPermission, button({
                                icon: {icon: "link_off"},
                                disabled: loading,
                                onclick: () => {
                                    Modals.confirm(() => {
                                        loading.value = true;
                                        Api.removeTrackFromAlbum(track.id, album.value?.id ?? 0).then(() => {
                                            load();
                                        }).finally(() => loading.value = false);
                                    }, "Remove track from album", "Are you sure you want to remove this track from the album?");
                                }
                            })),
                        ).build()
                ).build()
        );
    }

    private static campaignSection(album: Signal<Album | null>) {
        const hasNewsLetterPermission = compute(u => u?.permissions?.some(p => p.name === Permissions.sendNewsletters) ?? false, currentUser);
        const canSend = compute(a => {
            const firstTrack = a?.tracks && a.tracks.length > 0 ? a.tracks[0] : null;
            if (!firstTrack) {
                return false;
            }

            const links = [
                firstTrack.link_spotify,
                firstTrack.link_lyda,
                firstTrack.link_applemusic,
                firstTrack.link_bandcamp,
                firstTrack.link_youtube,
                firstTrack.link_soundcloud,
            ].filter(l => l && l.trim() !== "");
            if (links.length < 5 || !a) {
                return false;
            }

            const albumReleaseDate = new Date(a.release_date).getTime();
            const firstTrackReleaseDate = new Date(firstTrack.release_date).getTime();
            return !a.campaign_sent
                && albumReleaseDate <= new Date().getTime()
                && firstTrackReleaseDate <= new Date().getTime();
        }, album);
        const sentText = compute((a): string => a?.campaign_sent ? "Release newsletter has been sent" : "No release newsletter has been sent", album);

        return horizontal(
            when(hasNewsLetterPermission, button({
                text: "Send release newsletter",
                icon: {icon: "send"},
                disabled: compute(c => !c, canSend),
                onclick: () => {
                    Modals.confirm(() => {
                        Api.sendAlbumNewsletter(album.value?.id ?? 0)
                            .then(() => {
                                notify("Newsletter sending done", NotificationType.success);
                                reload();
                            });
                    }, "Send release newsletter", "Are you sure you want to send the release newsletter for this album?");
                }
            })),
            create("span")
                .text(sentText)
                .build()
        ).classes("center-items")
    }

    private static addTracksSection(search: Signal<string>, searchResults: Signal<SearchResult[]>, loading: Signal<boolean>, album: Signal<Album | null>, load: Function) {
        return create("div")
            .classes("flex-v")
            .children(
                input({
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
                                    button({
                                        icon: {icon: "add_link"},
                                        disabled: loading,
                                        onclick: () => {
                                            loading.value = true;
                                            Api.addTrackToAlbum(track.id, album.value?.id ?? 0).then(() => {
                                                load();
                                            }).finally(() => loading.value = false);
                                        }
                                    }),
                                ).build()
                        ).build()
                ),
            ).build();
    }
}

import {Api} from "../api/api.ts";
import {Generics, horizontal, vertical} from "./generic/generics.ts";
import {Track} from "../models/db/tri/Track.ts";
import {Route} from "../routing/Route.ts";
import {Inputs} from "./generic/inputs.ts";
import {notify} from "../functions/notifications.ts";
import {navigate} from "../routing/Router.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {currentUser} from "../state.ts";
import {Permissions} from "../enums/Permissions.ts";
import {ServiceLink} from "../models/ServiceLink.ts";
import {LinkServices} from "../enums/LinkServices.ts";
import {Genre} from "../enums/Genre.ts";
import {getImageUrl, target} from "../functions/templates.ts";
import {Statistic} from "../models/Statistic.ts";
import {Statistics} from "./statistics.ts";
import {dayFrom, today, toUTCDate} from "../functions/dates.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {RequestableImageSize} from "../enums/requestableImageSize.ts";
import {Images} from "./generic/images.ts";
import {ImageSize} from "../enums/imageSize.ts";
import {Time} from "../functions/time.ts";
import {currency} from "../functions/formatters.ts";
import {compute, create, InputType, nullElement, signal, Signal, signalMap, when} from "@targoninc/jess";
import {button, input, searchableSelect} from "@targoninc/jess-components";

export class Tracks {
    static trackPage(route: Route, params: any) {
        const track = signal<Track | null>(null);
        const loading = signal(false);
        Api.getTrack(params.id ?? 0)
            .then(a => track.value = a)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    when(loading, Generics.loading()),
                    when(track, Tracks.track(track))
                ).build()
        );
    }

    private static track(track$: Signal<Track | null>) {
        const title = compute(t => t?.title ?? "Track", track$);
        const isrc = compute(t => t?.isrc ?? "No ISRC", track$);
        const releaseDate = compute(t => {
            return dayFrom(t?.release_date ?? new Date());
        }, track$);
        const artists = compute(t => t?.artists ?? "Unknown artists", track$);
        const price = compute(t => t?.price ?? 0, track$);
        const earnings = compute(t => t?.earnings ?? 0, track$);
        const albums = compute(t => t?.albums ?? [], track$);
        const id = compute(t => t?.id ?? 0, track$);
        const hasImage = compute(t => t?.has_cover ?? false, track$);
        const hasReleaseManagementPermission = compute(u => u?.permissions?.some(p => p.name === Permissions.releaseManagement) ?? false, currentUser);
        const length = compute(t => t?.length ?? 0, track$);
        const genre = compute(t => t?.genre ?? "", track$);
        const genres = Object.values(Genre).map((genre: string) => {
            return {
                name: genre.charAt(0).toUpperCase() + genre.slice(1),
                id: genre
            };
        });
        const credits = compute(t => t?.credits ?? "", track$);
        const triRecordsLink = compute(t => Api.labelUrl(`/track/${t?.id}`), track$);

        return horizontal(
            vertical(
                horizontal(
                    Generics.heading(2, compute((a, t) => `${a} - ${t}`, artists, title)),
                    button({
                        text: "Open on Tri Records",
                        icon: {icon: "open_in_new"},
                        classes: ["positive"],
                        onclick: () => window.open(triRecordsLink.value, "_blank")
                    }),
                ).classes("center-items", "split-flex"),
                horizontal(
                    create("span")
                        .text("In")
                        .build(),
                    signalMap(
                        albums,
                        horizontal(),
                        a => Generics.link(`/album/${a?.id}`, a?.title ?? "Unknown album")),
                ).build(),
                Images.changeableImage(id, hasImage, MediaFileType.trackCover, {
                    changeable: hasReleaseManagementPermission,
                    deletable: hasReleaseManagementPermission,
                    size: ImageSize.p50
                }),
                when(hasReleaseManagementPermission, vertical(
                    Generics.heading(2, title),
                    Generics.heading(3, artists),
                    Generics.property("ISRC", isrc),
                    Generics.property("Release date", releaseDate),
                    Generics.property("Price", currency(price)),
                    Generics.property("Length", compute(l => Time.toTimeFromSeconds(l), length)),
                ).build(), true),
                when(hasReleaseManagementPermission, Generics.container(1, [
                    vertical(
                        Tracks.trackProperties(title, artists, credits, releaseDate, isrc, genres, genre, length, price),
                        button({
                            text: "Update track",
                            classes: ["positive", "fit-content"],
                            icon: {icon: "save"},
                            onclick: () => {
                                Api.updateTrack(track$.value?.id ?? 0, {
                                    title: title.value,
                                    isrc: isrc.value,
                                    release_date: toUTCDate(new Date(releaseDate.value)),
                                    price: price.value,
                                    length: length.value,
                                    credits: credits.value,
                                    genre: genre.value,
                                    artists: artists.value,
                                }).then(() => {
                                    notify("Track updated", NotificationType.success);
                                    navigate("/track/" + track$.value?.id);
                                }).catch(e => {
                                    console.error(e);
                                });
                            }
                        }),
                    ).build()
                ])),
            ).classes("flex-grow").build(),
            vertical(
                when(hasReleaseManagementPermission, Generics.container(1, [
                    Inputs.serviceLinks(track$, "track")
                ])),
                Generics.earnings(earnings),
                when(track$, Tracks.trackStatistics(track$))
            )
        ).build();
    }

    static trackStatistics(track: Signal<Track | null>) {
        const loading = signal(false);
        const stats = signal<Statistic[]>([]);
        const isrc = compute(a => a?.isrc ?? "No ISRC", track);
        const template = compute(s => {
            if (s.length === 0) {
                return nullElement();
            }
            return Statistics.royaltiesByMonthChart(s.map(s => s.label), s.map(s => s.value));
        }, stats);
        const load = () => {
            loading.value = true;
            Api.getRoyaltiesByMonth({isrc: isrc.value})
                .then(s => stats.value = s)
                .finally(() => loading.value = false);
        };
        isrc.subscribe(load);
        load();

        return create("div")
            .classes("flex-v", "statistic")
            .children(
                when(loading, Generics.loading()),
                template
            ).build();
    }

    static tracksTab(canManageReleases: Signal<boolean>) {
        const tracks = signal<Track[]>([]);
        const filter = signal("");
        const filteredTracks = compute((a, f) => a.filter(a => {
            return a.title.toLowerCase().includes(f.toLowerCase()) ||
                a.artists.toLowerCase().includes(f.toLowerCase());
        }), tracks, filter);
        const count = compute(a => a.length + " Tracks", filteredTracks);
        const loading = signal(false);
        Api.getTracks()
            .then(a => tracks.value = a)
            .finally(() => loading.value = false);

        return vertical(
            Generics.heading(2, count),
            Tracks.tracksTabActions(canManageReleases, filter),
            when(loading, Generics.loading()),
            Generics.table(
                ["Cover", "Title", "Release date"],
                filteredTracks,
                (track) => create("tr")
                    .onclick(() => navigate(`/track/${track.id}`))
                    .children(
                        create("td")
                            .children(
                                Generics.image(getImageUrl(MediaFileType.trackCover, track.id, RequestableImageSize.s50))
                            ).build(),
                        create("td")
                            .children(
                                Generics.link("/track/" + track.id, track.title)
                            ).build(),
                        create("td")
                            .text(Time.localDate(track.release_date))
                            .build(),
                    ).build(),
                ["scroll-table"]
            )
        ).build();
    }

    private static tracksTabActions(canManageReleases: Signal<boolean>, filter: Signal<string>) {
        return horizontal(
            when(canManageReleases, button({
                text: "Create track",
                icon: {icon: "add"},
                classes: ["positive"],
                onclick: () => {
                    navigate("/new-track");
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
        if (!currentUser.value?.permissions?.some(p => p.name === Permissions.releaseManagement)) {
            return Generics.pageFrame(
                vertical(
                    Generics.heading(2, "Not allowed"),
                    create("p")
                        .text("You are not allowed to create tracks.")
                        .build()
                ).build()
            );
        }

        const title = signal("");
        const artists = signal("");
        const isrc = signal("");
        const credits = signal("");
        const release_date = signal(today());
        const price = signal(1);
        const genre = signal<string>("");
        const length = signal(0);
        const genres = Object.values(Genre).map((genre: string) => {
            return {
                name: genre.charAt(0).toUpperCase() + genre.slice(1),
                id: genre
            };
        });
        const anyEmpty = compute((t, u, r, p) => t === "" || u === "" || r === null || p === 0, title, artists, release_date, price);

        return Generics.pageFrame(
            vertical(
                Generics.heading(2, "Create track"),
                Tracks.trackProperties(title, artists, credits, release_date, isrc, genres, genre, length, price),
                button({
                    text: "Create",
                    icon: { icon: "add" },
                    classes: ["positive", "fit-content"],
                    disabled: anyEmpty,
                    onclick: () => {
                        Api.createTrack({
                            title: title.value,
                            artists: artists.value,
                            release_date: toUTCDate(new Date(release_date.value)),
                            price: price.value,
                            isrc: isrc.value,
                            credits: credits.value,
                            genre: genre.value,
                            length: length.value,
                        }).then(() => {
                            notify("Track created", NotificationType.success);
                            navigate("/releases");
                        }).catch(e => {
                            console.error(e);
                        });
                    }
                })
            ).build(),
        );
    }

    private static trackProperties(title: Signal<string>, artists: Signal<string>, credits: Signal<string>, release_date: Signal<string>, isrc: Signal<string>, genres: {
        name: string;
        id: string
    }[], genre: Signal<string>, length: Signal<number>, price: Signal<number>) {
        return vertical(
            Inputs.text(title, "Title", "title"),
            Inputs.text(artists, "Artists", "artists"),
            Inputs.text(credits, "Credits", "credits"),
            Inputs.date(release_date, "Release date", "release_date"),
            Inputs.text(isrc, "ISRC", "isrc"),
            searchableSelect({
                label: "Genre",
                options: signal(genres),
                value: genre,
                onchange: (v) => {
                    genre.value = v;
                }
            }),
            Inputs.number(length, "Length", "length"),
            Inputs.number(price, "Price", "price"),
        ).build();
    }
}

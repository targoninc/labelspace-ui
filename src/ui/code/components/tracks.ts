import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {Api} from "../api/api.ts";
import {Generics} from "./generics.ts";
import {create, ifjs, nullElement} from "../../fjsc/src/f2.ts";
import {Track} from "../models/db/tri/Track.ts";
import {Route} from "../routing/Route.ts";
import {Inputs} from "./inputs.ts";
import {FJSC} from "../../fjsc";
import {notify} from "../functions/notifications.ts";
import {navigate} from "../routing/Router.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {currentUser} from "../state.ts";
import {Permissions} from "../enums/Permissions.ts";
import {ServiceLink} from "../models/ServiceLink.ts";
import {LinkServices} from "../enums/LinkServices.ts";
import {Genre} from "../enums/Genre.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {getImageUrl, target} from "../functions/templates.ts";
import {Statistic} from "../models/Statistic.ts";
import {Statistics} from "./statistics.ts";
import {dayFrom, today} from "../functions/dates.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {RequestableImageSize} from "./requestableImageSize.ts";
import {Images} from "./images.ts";
import {ImageSize} from "./imageSize.ts";

export class Tracks {
    static trackPage(route: Route, params: any) {
        const track = signal<Track|null>(null);
        const loading = signal(false);
        Api.getTrack(params.id ?? 0)
            .then(a => track.value = a)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Track"),
                    ifjs(loading, Generics.loading()),
                    ifjs(track, Tracks.track(track))
                ).build()
        );
    }

    private static track(track$: Signal<Track | null>) {
        const title = compute(t => t?.title ?? "Track", track$);
        const isrc = compute(t => t?.isrc ?? "No ISRC", track$);
        const releaseDate = compute(t => {
            return dayFrom(t?.release_date ?? new Date());
        }, track$);
        const price = compute(t => t?.price ?? 0, track$);
        const notChanged = signal(true);
        title.subscribe(t => notChanged.value = t === track$.value?.title);
        isrc.subscribe(t => notChanged.value = t === track$.value?.isrc);
        releaseDate.subscribe(t => notChanged.value = t === dayFrom(track$.value?.release_date ?? new Date()));
        price.subscribe(t => notChanged.value = t === track$.value?.price);
        const id = compute(t => t?.id ?? 0, track$);
        const hasImage = compute(t => t?.has_cover ?? false, track$);

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex")
                    .children(
                        create("div")
                            .classes("flex-v")
                            .children(
                                Images.changeableImage(id, hasImage, MediaFileType.trackCover, {
                                    changeable: true,
                                    deletable: true,
                                    size: ImageSize.p500
                                }),
                            ).build(),
                        create("div")
                            .classes("flex-v", "flex-grow")
                            .children(
                                Inputs.text(title, "Title", "title"),
                                Inputs.text(isrc, "ISRC", "isrc"),
                                Inputs.date(releaseDate, "Release date", "release_date"),
                                Inputs.number(price, "Price", "price"),
                                FJSC.button({
                                    text: "Update track",
                                    classes: ["positive"],
                                    disabled: notChanged,
                                    onclick: () => {
                                        Api.updateTrack(track$.value?.id ?? 0, {
                                            title: title.value,
                                            isrc: isrc.value,
                                            release_date: new Date(releaseDate.value),
                                            price: price.value,
                                        }).then(() => {
                                            notify("Track updated", NotificationType.success);
                                            navigate("/track/" + track$.value?.id);
                                        }).catch(e => {
                                            console.error(e);
                                        });
                                    }
                                }),
                            ).build(),
                    ).build(),
                ifjs(track$, Tracks.trackStatistics(track$)),
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
            Api.getRoyaltiesByMonth({ isrc: isrc.value })
                .then(s => stats.value = s)
                .finally(() => loading.value = false);
        };
        isrc.subscribe(load);
        load();

        return create("div")
            .classes("flex-v", "statistic")
            .children(
                ifjs(loading, Generics.loading()),
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

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(2, count),
                Tracks.tracksTabActions(canManageReleases, filter),
                ifjs(loading, Generics.loading()),
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
                                .text(new Date(track.release_date).toLocaleString())
                                .build(),
                        ).build(),
                    ["scroll-table"]
                )
            ).build();
    }

    private static tracksTabActions(canManageReleases: Signal<boolean>, filter: Signal<string>) {
        return create("div")
            .classes("flex")
            .children(
                ifjs(canManageReleases, FJSC.button({
                    text: "Create track",
                    icon: {icon: "add"},
                    classes: ["positive"],
                    onclick: () => {
                        navigate("/new-track");
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
        if (!currentUser.value?.permissions?.some(p => p.name === Permissions.releaseManagement)) {
            return Generics.pageFrame(
                create("div")
                    .classes("flex-v")
                    .children(
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
        const serviceLinks = signal<ServiceLink[]>([]);
        const genre = signal<string>("");
        const genres = Object.values(Genre).map((genre: string) => {
            return {
                name: genre.charAt(0).toUpperCase() + genre.slice(1),
                id: genre
            };
        });
        const anyEmpty = compute((t, u, r, p) => t === "" || u === "" || r === null || p === 0, title, artists, release_date, price);

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Create track"),
                    Inputs.text(title, "Title", "title"),
                    Inputs.text(artists, "Artists", "artists"),
                    Inputs.date(release_date, "Release date", "release_date"),
                    Inputs.text(isrc, "ISRC", "isrc"),
                    FJSC.searchableSelect({
                        label: "Genre",
                        options: signal(genres),
                        value: genre,
                        onchange: (v) => {
                            genre.value = v;
                        }
                    }),
                    Inputs.text(credits, "Credits", "credits"),
                    Inputs.number(price, "Price", "price"),
                    Inputs.serviceLinks(serviceLinks),
                    FJSC.button({
                        text: "Create",
                        classes: ["positive"],
                        disabled: anyEmpty,
                        onclick: () => {
                            const links = serviceLinks.value;

                            Api.createTrack({
                                title: title.value,
                                artists: artists.value,
                                release_date: release_date.value,
                                price: price.value,
                                isrc: isrc.value,
                                credits: credits.value,
                                genre: genre.value,
                                link_spotify: links.find(l => l.service === LinkServices.spotify)?.link ?? "",
                                link_youtube: links.find(l => l.service === LinkServices.youtube)?.link ?? "",
                                link_soundcloud: links.find(l => l.service === LinkServices.soundcloud)?.link ?? "",
                                link_applemusic: links.find(l => l.service === LinkServices.applemusic)?.link ?? "",
                                link_bandcamp: links.find(l => l.service === LinkServices.bandcamp)?.link ?? "",
                                link_lyda: links.find(l => l.service === LinkServices.lyda)?.link ?? "",
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
}
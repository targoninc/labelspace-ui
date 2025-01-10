import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {Api} from "../api/api.ts";
import {Generics} from "./generics.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {Track} from "../models/db/tri/Track.ts";
import {Route} from "../routing/Route.ts";
import {Inputs} from "./inputs.ts";
import {FJSC} from "../../fjsc";
import {notify} from "../functions/notifications.ts";
import {navigate} from "../routing/Router.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {currentUser} from "../state.ts";
import {Permissions} from "../enums/Permissions.ts";

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
        const releaseDate = compute(t => new Date(t?.release_date), track$);
        const price = compute(t => t?.price ?? 0, track$);
        const notChanged = signal(true);
        title.subscribe(t => notChanged.value = t === track$.value?.title);
        isrc.subscribe(t => notChanged.value = t === track$.value?.isrc);
        releaseDate.subscribe(t => notChanged.value = t === track$.value?.release_date);
        price.subscribe(t => notChanged.value = t === track$.value?.price);

        return create("div")
            .classes("flex-v")
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
                            release_date: releaseDate.value,
                            price: price.value,
                        }).then(() => {
                            notify("Track updated", NotificationType.success);
                            navigate("/track/" + track$.value?.id);
                        }).catch(e => {
                            console.error(e);
                        });
                    }
                })
            ).build();
    }

    static tracksTab(canManageReleases: Signal<boolean>) {
        const tracks = signal<Track[]>([]);
        const count = compute(a => a.length + " Tracks", tracks);
        const loading = signal(false);
        Api.getTracks()
            .then(a => tracks.value = a)
            .finally(() => loading.value = false);

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(2, count),
                ifjs(canManageReleases, Tracks.createSection()),
                ifjs(loading, Generics.loading()),
                Generics.table(
                    ["Title", "Release date"],
                    tracks,
                    (track) => create("tr")
                        .onclick(() => navigate(`/track/${track.id}`))
                        .children(
                            create("td")
                                .text(track.title)
                                .build(),
                            create("td")
                                .text(new Date(track.release_date).toLocaleString())
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
                    text: "Create track",
                    icon: {icon: "add"},
                    classes: ["positive"],
                    onclick: () => {
                        navigate("/new-track");
                    }
                })
            ).build();
    }

    static createPage() {
        const title = signal("");
        const artists = signal("");
        const isrc = signal("");
        const credits = signal("");
        const release_date = signal(new Date());
        const price = signal(1);
        const anyEmpty = compute((t, u, r, p) => t === "" || u === "" || r === null || p === 0, title, artists, release_date, price);
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
                    Inputs.text(artists, "Artists", "artists"),
                    Inputs.date(release_date, "Release date", "release_date"),
                    Inputs.text(isrc, "ISRC", "isrc"),
                    Inputs.text(credits, "Credits", "credits"),
                    Inputs.number(price, "Price", "price"),
                    FJSC.button({
                        text: "Create",
                        classes: ["positive"],
                        disabled: anyEmpty,
                        onclick: () => {
                            Api.createTrack({
                                title: title.value,
                                artists: artists.value,
                                release_date: release_date.value.toISOString(),
                                price: price.value,
                                isrc: isrc.value,
                                credits: credits.value,
                                genre: "",
                                visibility: "",
                                link_spotify: "",
                                link_youtube: "",
                                link_soundcloud: "",
                                link_applemusic: "",
                                link_bandcamp: "",
                                link_lyda: ""
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
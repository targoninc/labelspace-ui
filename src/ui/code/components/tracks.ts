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
}
import {ServiceLink} from "../../models/ServiceLink.ts";
import {LinkServices} from "../../enums/LinkServices.ts";
import {Generics, vertical} from "./generics.ts";
import {linkPath} from "../../functions/formatters.ts";
import {notify} from "../../functions/notifications.ts";
import {NotificationType} from "../../enums/NotificationType.ts";
import {button, icon, input, searchableSelect, SelectOption, textarea} from "@targoninc/jess-components";
import {compute, create, InputType, signal, Signal, signalMap} from "@targoninc/jess";
import {Track} from "../../models/db/tri/Track.ts";
import {TrackLink} from "../../models/db/tri/TrackLink.ts";
import {Api} from "../../api/api.ts";
import {AlbumLink} from "../../models/db/tri/AlbumLink.ts";

export class Inputs {
    static password(password: Signal<string>, placeholder: string = "Password", name: string = "password", onEnter: Function = () => {
    }) {
        return input<string>({
            type: InputType.password,
            name,
            label: placeholder,
            placeholder,
            value: password,
            attributes: ["autocomplete", name],
            onchange: (v) => {
                password.value = v;
            },
            onkeydown: e => {
                if (e.key === "Enter") {
                    onEnter();
                }
            }
        });
    }

    static longtext(value: Signal<string>, label: string, name: string) {
        return textarea({
            name,
            label,
            value,
            attributes: ["autocomplete", name],
            onchange: (v) => {
                value.value = v;
            }
        });
    }

    static text(value: Signal<string>, label: string, name: string) {
        return input<string>({
            type: InputType.text,
            name,
            label,
            value,
            attributes: ["autocomplete", name],
            onchange: (v) => {
                value.value = v;
            }
        });
    }

    static date(value: Signal<string>, label: string, name: string) {
        return input<string>({
            type: InputType.date,
            name,
            label,
            value,
            attributes: ["autocomplete", name],
            onchange: (v) => {
                value.value = v;
            }
        });
    }

    static number(value: Signal<number>, label: string, name: string) {
        return input<number>({
            type: InputType.number,
            name,
            label,
            value,
            attributes: ["autocomplete", name],
            onchange: (v) => {
                value.value = v;
            }
        });
    }

    static serviceLinks(track$: Signal<Track | null>) {
        const newLink = signal("");
        const links = compute(t => t?.links ?? [], track$);
        const loading = signal(false);
        const refresh = () => {
            if (loading.value) {
                return;
            }
            loading.value = true;
            Api.getTrack(track$.value!.id)
                .then(t => track$.value = t)
                .finally(() => loading.value = false);
        }

        return vertical(
            signalMap(links, vertical(), link => Inputs.trackLink(track$, link, refresh)),
            Generics.container(2, [
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        input({
                            type: InputType.url,
                            name: "link",
                            label: "Link",
                            placeholder: "https://lyda.app/track/",
                            attributes: ["autocomplete", "link"],
                            value: newLink,
                            onchange: (v) => newLink.value = v
                        }),
                        button({
                            text: "Add link",
                            icon: {icon: "add"},
                            classes: ["positive"],
                            disabled: compute((tl, n) => tl.some(l => n && l.host === new URL(n).host) && newLink.value.trim() !== "", links, newLink),
                            onclick: () => {
                                Api.addTrackLink(track$.value!.id, newLink.value)
                                    .then(() => {
                                        notify("Link added", NotificationType.success);
                                        newLink.value = "";
                                        refresh();
                                    })
                                    .catch(() => {
                                        notify("Failed to add link", NotificationType.error);
                                    });
                            }
                        })
                    ).build()
            ]),
        ).build();
    }

    static trackLink(track$: Signal<Track | null>, link: TrackLink, refresh: () => void) {
        const serviceMap: Record<string, LinkServices> = {
            "open.spotify.com": LinkServices.spotify,
            "music.apple.com": LinkServices.applemusic,
            "soundcloud.com": LinkServices.soundcloud,
            "trirecords.bandcamp.com": LinkServices.bandcamp,
            "lyda.app": LinkServices.lyda,
            "tidal.com": LinkServices.tidal,
            "youtube.com": LinkServices.youtube,
            "www.youtube.com": LinkServices.youtube,
            "youtu.be": LinkServices.youtube,
        }
        const service = serviceMap[link.host] ?? link.host;

        return create("div")
            .classes("flex", "center-items", "service-link", service)
            .children(
                create("span")
                    .text(`${service}${linkPath(link.url)}`)
                    .onclick(() => {
                        navigator.clipboard.writeText(link.url);
                        notify("Copied to clipboard", NotificationType.success);
                    }).build(),
                icon({
                    icon: "delete",
                    classes: ["clickable-icon"],
                    title: "Remove link",
                    onclick: () => {
                        Api.removeTrackLink(track$.value!.id, link.url)
                            .then(() => {
                                notify("Link removed", NotificationType.success);
                                refresh();
                            })
                            .catch(() => {
                                notify("Failed to remove link", NotificationType.error);
                            });
                    }
                })
            ).build();
    }
}

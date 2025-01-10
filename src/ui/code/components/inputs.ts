import {compute, signal, Signal} from "../../fjsc/src/signals.ts";
import {FJSC} from "../../fjsc";
import {InputType, SelectOption} from "../../fjsc/src/Types.ts";
import {ServiceLink} from "../models/ServiceLink.ts";
import {create, signalMap} from "../../fjsc/src/f2.ts";
import {LinkServices} from "../enums/LinkServices.ts";
import {Generics} from "./generics.ts";
import {linkPath} from "../functions/formatters.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";

export class Inputs {
    static password(password: Signal<string>, placeholder: string = "Password", name: string = "password") {
        return FJSC.input<string>({
            type: InputType.password,
            name,
            label: placeholder,
            placeholder,
            value: password,
            attributes: ["autocomplete", name],
            onchange: (v) => {
                password.value = v;
            }
        });
    }

    static text(value: Signal<string>, label: string, name: string) {
        return FJSC.input<string>({
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

    static date(value: Signal<Date>, label: string, name: string) {
        return FJSC.input<Date>({
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
        return FJSC.input<number>({
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

    static serviceLinks(serviceLinks: Signal<ServiceLink[]>) {
        const link = signal("");
        const type = signal("");
        const options: SelectOption[] = Object.values(LinkServices).map(s => ({
            name: s,
            id: s
        }));

        return create("div")
            .classes("flex-v")
            .children(
                signalMap(serviceLinks, create("div").classes("flex", "center-items"), link => Inputs.editableServiceLink(link, serviceLinks)),
                Generics.container(2, [
                    create("div")
                        .classes("flex", "center-items")
                        .children(
                            FJSC.searchableSelect({
                                options: signal(options),
                                label: "Service",
                                value: type,
                                onchange: (v) => type.value = v
                            }),
                            FJSC.input({
                                type: InputType.url,
                                name: "link",
                                label: "Link",
                                placeholder: "https://open.spotify.com/track/",
                                attributes: ["autocomplete", "link"],
                                value: link,
                                onchange: (v) => link.value = v
                            }),
                            FJSC.button({
                                text: "Add link",
                                icon: { icon: "add" },
                                classes: ["positive"],
                                disabled: compute((sl, t) => sl.some(l => l.service === t), serviceLinks, type),
                                onclick: () => {
                                    serviceLinks.value = [...serviceLinks.value, {
                                        service: type.value,
                                        link: link.value
                                    }];
                                }
                            })
                        ).build()
                ]),
            ).build();
    }

    static editableServiceLink(link: ServiceLink, serviceLinks: Signal<ServiceLink[]>) {
        return create("div")
            .classes("flex", "center-items", "service-link", link.service)
            .children(
                create("span")
                    .text(`${link.service}${linkPath(link.link)}`)
                    .onclick(() => {
                        navigator.clipboard.writeText(link.link);
                        notify("Copied to clipboard", NotificationType.success);
                    })
                    .build(),
                FJSC.icon({
                    icon: "delete",
                    classes: ["clickable-icon"],
                    title: "Remove link",
                    onclick: () => {
                        serviceLinks.value = serviceLinks.value.filter(l => l.service !== link.service);
                    }
                })
            ).build();
    }
}

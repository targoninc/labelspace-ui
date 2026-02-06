import {ServiceLink} from "../../models/ServiceLink.ts";
import {LinkServices} from "../../enums/LinkServices.ts";
import {Generics, vertical} from "./generics.ts";
import {linkPath} from "../../functions/formatters.ts";
import {notify} from "../../functions/notifications.ts";
import {NotificationType} from "../../enums/NotificationType.ts";
import {button, icon, input, searchableSelect, SelectOption, textarea} from "@targoninc/jess-components";
import {compute, create, InputType, signal, Signal, signalMap} from "@targoninc/jess";

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

    static serviceLinks(serviceLinks: Signal<ServiceLink[]>) {
        const link = signal("");
        const type = signal("");
        const options: SelectOption[] = Object.values(LinkServices).map(s => ({
            name: s,
            id: s
        }));

        return vertical(
            signalMap(serviceLinks, vertical(), link => Inputs.editableServiceLink(link, serviceLinks)),
            Generics.container(2, [
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        searchableSelect({
                            options: compute(links => options.filter(o => !links.some(l => l.service === o.id)), serviceLinks),
                            label: "Service",
                            value: type,
                            onchange: (v) => type.value = v
                        }),
                        input({
                            type: InputType.url,
                            name: "link",
                            label: "Link",
                            placeholder: "https://open.spotify.com/track/",
                            attributes: ["autocomplete", "link"],
                            value: link,
                            onchange: (v) => link.value = v
                        }),
                        button({
                            text: "Add link",
                            icon: {icon: "add"},
                            classes: ["positive"],
                            disabled: compute((sl, t) => sl.some(l => l.service === t), serviceLinks, type),
                            onclick: () => {
                                serviceLinks.value = [...serviceLinks.value, {
                                    service: type.value,
                                    link: link.value
                                }];
                                link.value = "";
                                type.value = "";
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
                icon({
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

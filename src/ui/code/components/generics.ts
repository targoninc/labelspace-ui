import {AnyElement, create, StringOrSignal} from "../../fjsc/src/f2.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import type {NavItem} from "../models/NavItem.ts";
import {compute} from "../../fjsc/src/signals.ts";
import {currentRoute} from "../state.ts";
import {navigate} from "../routing/Router.ts";

export class Generics {
    static notFound() {
        return Generics.pageFrame(
            create("h1")
                .text("404")
                .build()
        );
    }

    static pageFrame(content: AnyElement) {
        return create("div")
            .classes("container", "flex-v")
            .children(
                Generics.nav(),
                create("div")
                    .classes("container", "border", "layer-1")
                    .children(content)
            ).build();
    }

    static nav() {
        const navItems: NavItem[] = [
            {
                text: "Home",
                path: "/",
                icon: "home"
            },
        ]

        return create("nav")
            .classes("container", "border", "layer-1")
            .children(
                ...navItems.map(item => Generics.navItem(item))
            ).build();
    }

    static icon(icon: StringOrSignal) {
        return create("i")
            .classes("material-symbols-outlined")
            .text(icon)
            .build();
    }

    static navItem(item: NavItem) {
        const active = compute(r => r && r.path === item.path, currentRoute);
        const activeClass = compute((a): string => a ? "active" : "_", active);

        return create("a")
            .classes("button", "flex", "center-items", activeClass)
            .href(item.path)
            .target("_blank")
            .onclick((e: MouseEvent) => {
                if (e.button === 0) {
                    e.preventDefault();
                    navigate(item.path);
                }
            })
            .children(
                Generics.icon(item.icon),
                create("span")
                    .text(item.text)
                    .build()
            ).build();
    }

    static notification(type: NotificationType = NotificationType.success, text = "Success!") {
        return create("div")
            .classes("notification", type)
            .text(text)
            .build();
    }
}
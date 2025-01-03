import {AnyElement, create} from "../../fjsc/src/f2.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import type {NavItem} from "../models/NavItem.ts";
import {compute} from "../../fjsc/src/signals.ts";
import {currentRoute} from "../state.ts";

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

    static navItem(item: NavItem) {
        const active = compute(r => r && r.path === item.path, currentRoute);
        const activeClass = compute((a): string => a ? "active" : "_", active);

        return create("a")
            .classes("nav-item", activeClass)
            .children(
                create("img")
                    .classes("nav-item-icon", "inline-icon", "svg")
                    .src(item.icon)
                    .alt(item.text)
                    .build(),
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
import {AnyElement, AnyNode, create, ifjs, signalMap, StringOrSignal} from "../../fjsc/src/f2.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import type {NavItem} from "../models/NavItem.ts";
import {compute, signal, Signal} from "../../fjsc/src/signals.ts";
import {currentRoute, currentUser, userLoading} from "../state.ts";
import {navigate, reload} from "../routing/Router.ts";
import {Api} from "../api/api.ts";
import {FJSC} from "../../fjsc";
import {Account} from "./account.ts";
import {User} from "../models/db/tri/User.ts";

export class Generics {
    static notFound() {
        return Generics.pageFrame(
            create("h1")
                .text("404")
                .build()
        );
    }

    static pageFrame(...content: (AnyElement|Signal<AnyElement>)[]) {
        return create("div")
            .classes("container", "flex-v")
            .children(
                Generics.nav(),
                Generics.container(1, content)
            ).build();
    }

    static container(layer: number, content: (AnyElement|Signal<AnyElement>)[]) {
        return create("div")
            .classes("container", "border", "layer-" + layer)
            .children(...content)
            .build();
    }

    static nav() {
        const navItems: NavItem[] = [
            {
                text: "Home",
                path: "/",
                icon: "home"
            },
        ];
        const loginShown = compute((u, l) => !u && !l, currentUser, userLoading);

        return create("nav")
            .classes("container", "border", "layer-1", "flex", "split-flex", "center-items")
            .children(
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        Generics.image("/images/LOGO256.png", ["header-logo"]),
                        create("h1")
                            .children(
                                create("b").text("Tri").build(),
                                create("span").text("Records").build(),
                            ).build(),
                        ...navItems.map(item => Generics.navItem(item))
                    ).build(),
                ifjs(loginShown, Account.navLogin()),
                ifjs(userLoading, Generics.loading()),
                ifjs(currentUser, Generics.navUser(currentUser))
            ).build();
    }

    static message(message: Signal<string>) {
        return ifjs(message, create("span")
            .text(message)
            .build());
    }

    static image(src: StringOrSignal, extraClasses: StringOrSignal[] = []) {
        return create("img")
            .classes(...extraClasses)
            .src(src)
            .build();
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
            .classes("notification", "container", "border", type)
            .text(text)
            .build();
    }

    static list<T>(entries: Signal<T[]>, template: (entry: T) => AnyElement) {
        return create("div")
            .classes("container", "layer-2")
            .children(
                signalMap(entries, create("div").classes("flex-v"), template)
            ).build();
    }

    private static navUser(currentUser: Signal<User | null>) {
        const username = compute(u => `@${u?.username}`, currentUser);

        return create("div")
            .classes("flex", "center-items")
            .children(
                Generics.heading(3, username),
                FJSC.button({
                    text: "Logout",
                    classes: ["negative"],
                    onclick: async () => {
                        await Api.logout();
                        currentUser.value = null;
                        reload();
                    }
                })
            ).build();
    }

    static loading() {
        return create("div")
            .classes("loading")
            .build();
    }

    static heading(level: number, text: StringOrSignal) {
        return create(`h${level}`)
            .text(text)
            .build();
    }
}
import {AnyElement, create, ifjs, nullElement, signalMap, StringOrSignal} from "../../fjsc/src/f2.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {compute, signal, Signal} from "../../fjsc/src/signals.ts";
import {Nav} from "./nav.ts";
import {Route} from "../routing/Route.ts";
import {Account} from "./account.ts";
import {Users} from "./users.ts";
import {User} from "../models/db/tri/User.ts";
import {Permissions} from "../enums/Permissions.ts";
import {currentUser, userLoading} from "../state.ts";
import type {NavItem} from "../models/NavItem.ts";
import {Statistics} from "./statistics.ts";
import {Payments} from "./payments.ts";
import {Logs} from "./logs.ts";
import {Albums} from "./albums.ts";
import {Tracks} from "./tracks.ts";
import {Tab} from "../models/tab.ts";
import {FJSC} from "../../fjsc";

export class Generics {
    static notFound() {
        return Generics.pageFrame(
            create("h1")
                .text("404")
                .build()
        );
    }
    static nav() {
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
                        ...routes.filter(r => r.showInNav !== undefined)
                            .map(r => {
                                const show = compute(u => r.showInNav && r.showInNav(u), currentUser);
                                return ifjs(show, Nav.navItem(<NavItem>{
                                    text: r.title,
                                    path: r.path,
                                    icon: r.icon,
                                }));
                            })
                    ).build(),
                ifjs(loginShown, Account.navLogin()),
                ifjs(userLoading, Generics.loading()),
                ifjs(currentUser, Nav.navUser(currentUser))
            ).build();
    }

    static pageFrame(...content: (AnyElement|Signal<AnyElement>)[]) {
        return create("div")
            .classes("container", "flex-v")
            .children(
                Generics.nav(),
                Generics.container(1, content)
            ).build();
    }

    static container(layer: number, content: (AnyElement|Signal<AnyElement>)[], extraClasses: string[] = []) {
        return create("div")
            .classes("container", "border", "layer-" + layer, ...extraClasses)
            .children(...content)
            .build();
    }

    static message(message: StringOrSignal) {
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

    static notification(type: NotificationType = NotificationType.success, text = "Success!") {
        return create("div")
            .classes("notification", "container", "border", type)
            .text(text)
            .build();
    }

    static list<T>(entries: Signal<T[]>|T[], template: (entry: T) => AnyElement) {
        if (entries instanceof Signal) {
            return create("div")
                .classes("container", "layer-2")
                .children(
                    signalMap(entries, create("div").classes("flex-v"), template)
                ).build();
        }

        return create("div")
            .classes("container", "layer-2", "flex-v")
            .children(
                ...entries.map(template)
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

    static table<T>(headers: StringOrSignal[], entries: Signal<T[]>|T[], rowTemplate: (entry: T) => AnyElement) {
        if (entries instanceof Signal) {
            return create("table")
                .classes("container", "layer-2")
                .children(
                    create("thead")
                        .children(
                            create("tr")
                                .children(
                                    ...headers.map(c => create("th").text(c).build())
                                ).build()
                        ).build(),
                    signalMap(entries, create("tbody"), rowTemplate)
                ).build();
        }

        return create("table")
            .classes("container", "layer-2")
            .children(
                create("thead")
                    .children(
                        create("tr")
                            .children(
                                ...headers.map(c => create("th").text(c).build())
                            ).build()
                    ).build(),
                create("tbody")
                    .children(
                        ...entries.map(rowTemplate)
                    ).build()
            ).build();
    }

    static privateText(text: string) {
        const hidden = signal(true);

        return create("span")
            .classes("privateText")
            .onclick(() => hidden.value = !hidden.value)
            .children(
                ifjs(hidden, create("span")
                    .text(text)
                    .build(), true),
                ifjs(hidden, create("span")
                    .text("*".repeat(text.length))
                    .build())
            ).build();
    }

    static tableRow(...data: any[]) {
        return create("tr")
            .children(
                ...data.map(d => create("td").text(d).build())
            ).build();
    }

    static tabSelector(tab$: Signal<string>, tabs: Tab[]) {
        return create("div")
            .classes("flex", "center-items")
            .children(
                ...tabs.map(tab => {
                    const activeClass = compute((t): string => t === tab.key ? "active" : "_", tab$);

                    return FJSC.button({
                        text: tab.text,
                        icon: { icon: tab.icon },
                        classes: [activeClass],
                        onclick: () => {
                            tab$.value = tab.key;
                        }
                    })
                })
            ).build();
    }

    static tabContents(tab$: Signal<string>, templateMap: Record<string, Function>) {
        const template = compute(t => {
            if (templateMap[t]) {
                return templateMap[t]();
            }
            return nullElement();
        }, tab$);

        return create("div")
            .children(template)
            .build();
    }
}

export const routes: Route[] = [
    {
        path: "404",
        title: "404",
        aliases: ["error", "not-found"],
        template: Generics.notFound,
        allowWithoutLogin: true
    },
    {
        path: "password-reset",
        title: "Password reset",
        template: Account.passwordReset,
        allowWithoutLogin: true
    },
    {
        path: "users",
        title: "Users",
        template: Users.listPage,
        icon: "group",
        showInNav: (u: User) => u && (u.permissions?.some(p => p.name === Permissions.userManagement) ?? false)
    },
    {
        path: "profile",
        title: "Profile",
        template: Users.profile,
        icon: "person",
        showInNav: (u: User) => !!u
    },
    {
        path: "dashboard",
        title: "Dashboard",
        template: Statistics.page,
        icon: "analytics",
        showInNav: (u: User) => !!u
    },
    {
        path: "payments",
        title: "Payments",
        template: Payments.page,
        icon: "receipt",
        showInNav: (u: User) => !!u
    },
    {
        path: "logs",
        title: "Logs",
        template: Logs.page,
        icon: "history",
        showInNav: (u: User) => u && (u.permissions?.some(p => p.name === Permissions.canViewLogs) ?? false)
    },
    {
        path: "releases",
        title: "Releases",
        template: Albums.page,
        icon: "album",
        showInNav: (u: User) => u && (u.permissions?.some(p => p.name === Permissions.releaseManagement) ?? false)
    },
    {
        path: "new-album",
        title: "New album",
        template: Albums.createPage,
        icon: "album",
        showInNav: () => false
    },
    {
        path: "new-track",
        title: "New track",
        template: Tracks.createPage,
        icon: "graphic_eq",
        showInNav: () => false
    },
    {
        path: "album",
        pathParams: ["id"],
        title: "Album",
        template: Albums.albumPage,
        icon: "album",
        showInNav: () => false
    },
    {
        path: "track",
        pathParams: ["id"],
        title: "Track",
        template: Tracks.trackPage,
        icon: "album",
        showInNav: () => false
    }
];
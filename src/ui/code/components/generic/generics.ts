import {NotificationType} from "../../enums/NotificationType.ts";
import {Nav} from "../nav.ts";
import {Route} from "../../routing/Route.ts";
import {Account} from "../account.ts";
import {Users} from "../users.ts";
import {Permissions} from "../../enums/Permissions.ts";
import {currentRoute, currentUser, userLoading} from "../../state.ts";
import type {NavItem} from "../../models/NavItem.ts";
import {Statistics} from "../statistics.ts";
import {Payments} from "../payments.ts";
import {Logs} from "../logs.ts";
import {Albums} from "../albums.ts";
import {Tracks} from "../tracks.ts";
import {Tab} from "../../models/Tab.ts";
import {navigate} from "../../routing/Router.ts";
import {currency} from "../../functions/formatters.ts";
import {
    AnyElement,
    compute,
    create, DomNode,
    nullElement,
    signal,
    Signal,
    signalMap,
    StringOrSignal, TypeOrSignal,
    when
} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";

export class Generics {
    static notFound() {
        return Generics.pageFrame(
            create("h1")
                .text("404")
                .build()
        );
    }

    static nav() {
        const loginShown = compute((u, l, r) => !u && !l && r?.path !== "login", currentUser, userLoading, currentRoute);

        return create("nav")
            .classes("container", "layer-1", "flex", "split-flex", "center-items")
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
                                return when(show, Nav.navItem(<NavItem>{
                                    text: r.title,
                                    path: r.path,
                                    icon: r.icon,
                                }));
                            })
                    ).build(),
                when(loginShown, button({
                    text: "Login",
                    icon: { icon: "login" },
                    classes: ["positive"],
                    onclick: () => {
                        navigate("/login");
                    }
                })),
                when(userLoading, Generics.loading()),
                when(currentUser, Nav.navUser(currentUser))
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

    static container(layer: number, content: (AnyElement|Signal<AnyElement>|DomNode)[], extraClasses: string[] = []) {
        return create("div")
            .classes("container", "border", "layer-" + layer, ...extraClasses)
            .children(...content)
            .build();
    }

    static message(message: StringOrSignal) {
        return when(message, create("span")
            .text(message)
            .build());
    }

    static image(src: StringOrSignal, extraClasses: StringOrSignal[] = []) {
        return create("img")
            .classes(...extraClasses)
            .src(src)
            .build();
    }

    static icon(icon: StringOrSignal, onclick: Function = () => {}) {
        return create("i")
            .classes("material-symbols-outlined")
            .text(icon)
            .onclick(onclick)
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

    static heading(level: number, text: StringOrSignal, mono: boolean = false) {
        return create(`h${level}`)
            .classes(mono ? "monospace" : "_")
            .text(text)
            .build();
    }

    static table<T>(headers: StringOrSignal[], entries: Signal<T[]>|T[], rowTemplate: (entry: T) => AnyElement, classes: StringOrSignal[] = []) {
        return create("div")
            .classes("table-wrapper", ...classes)
            .children(
                Generics.tableInternal(entries, headers, rowTemplate)
            ).build();
    }

    private static tableInternal<T>(entries: Signal<T[]> | T[], headers: StringOrSignal[], rowTemplate: (entry: T) => AnyElement) {
        if (entries instanceof Signal) {
            return create("table")
                .classes("container")
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
                when(hidden, create("span")
                    .text(text)
                    .build(), true),
                when(hidden, create("span")
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

                    return button({
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

    static link(url: StringOrSignal, title: StringOrSignal) {
        const urlSignal: Signal<string> = url.constructor === Signal ? url : signal(url as string);
        const isRemote = compute(u => !!(u && u.includes("http")), urlSignal);

        return create("div")
            .classes("link-container")
            .children(
                create("a")
                    .classes("underline")
                    .href(url)
                    .target("_blank")
                    .title(url)
                    .text(title)
                    .onclick(e => {
                        if (!isRemote.value && e.button === 0) {
                            e.preventDefault();
                            navigate(urlSignal.value);
                        }
                    }).build()
            ).build();
    }

    static divider() {
        return create("hr")
            .build();
    }

    static earnings(number: Signal<number>) {
        return Generics.heading(2, compute(c => `Total Earnings: ${c}`, currency(number) as Signal<string>));
    }

    static property(name: string, value: any|Signal<any>) {
        return create("div")
            .classes("flex", "center-items")
            .children(
                create("b")
                    .text(name)
                    .build(),
                create("span")
                    .text(value)
                    .build(),
            ).build();
    }

    static pill(text: string, classes: string[]) {
        return create("span")
            .classes("pill", ...classes)
            .text(text)
            .build();
    }

    static collapsibleContainer(level: number, closedText: string, openText: string, children: (HTMLElement | SVGElement)[]) {
        const open = signal(false);

        return create("div")
            .classes("collapsible-container", "container", "border", "layer-" + level)
            .children(
                button({
                    text: compute((o): string => o ? openText : closedText, open),
                    icon: {
                        icon: compute((o): string => o ? "expand_less" : "expand_more", open)
                    },
                    classes: ["flat"],
                    onclick: () => open.value = !open.value
                }),
                when(open, create("div")
                    .classes("collapsible-content", "flex-v", "gap-8px")
                    .children(...children)
                    .build())
            ).build();
    }
}

export function horizontal(...children: (TypeOrSignal<AnyElement> | DomNode)[]) {
    return create("div")
        .classes("flex")
        .children(...children);
}

export function vertical(...children: (TypeOrSignal<AnyElement> | DomNode)[]) {
    return create("div")
        .classes("flex-v")
        .children(...children);
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
        path: "login",
        aliases: ["/", "password-reset"],
        title: "Login",
        template: Account.loginPage,
        allowWithoutLogin: true
    },
    {
        path: "users",
        title: "Users",
        template: Users.usersPage,
        icon: "group",
        showInNav: (u) => !!u && (u.permissions?.some(p => p.name === Permissions.userManagement) ?? false)
    },
    {
        path: "profile",
        aliases: ["settings"],
        title: "Profile",
        template: Users.profile,
        icon: "person",
        showInNav: (u) => !!u
    },
    {
        path: "dashboard",
        title: "Dashboard",
        template: Statistics.page,
        icon: "analytics",
        showInNav: (u) => !!u
    },
    {
        path: "payments",
        title: "Payments",
        template: Payments.page,
        icon: "receipt",
        showInNav: (u) => !!u
    },
    {
        path: "logs",
        title: "Logs",
        template: Logs.page,
        icon: "history",
        showInNav: (u) => !!u && (u.permissions?.some(p => p.name === Permissions.canViewLogs) ?? false)
    },
    {
        path: "releases",
        title: "Releases",
        template: Albums.page,
        icon: "album",
        showInNav: (u) => !!u
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
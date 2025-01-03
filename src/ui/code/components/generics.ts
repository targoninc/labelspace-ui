import {AnyElement, create, StringOrSignal} from "../../fjsc/src/f2.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import type {NavItem} from "../models/NavItem.ts";
import {compute} from "../../fjsc/src/signals.ts";
import {currentRoute, currentUser} from "../state.ts";
import {navigate} from "../routing/Router.ts";
import {Api} from "../api/api.ts";
import {FJSC} from "../../fjsc";
import {InputType} from "../../fjsc/src/Types.ts";

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
            .classes("container", "border", "layer-1", "flex", "split-flex")
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
                Generics.navLogin()
            ).build();
    }

    static navLogin() {
        const user = {
            username: "",
            password: ""
        };
        const login = async () => {
            await Api.login(user);
            currentUser.value = await Api.getUser();
            navigate("home");
        };

        return create("div")
            .classes("flex", "center-items")
            .children(
                FJSC.input<string>({
                    type: InputType.text,
                    name: "username",
                    placeholder: "Username",
                    value: user.username,
                    attributes: ["autocomplete", "username"],
                    onchange: (v) => {
                        user.username = v;
                    }
                }),
                FJSC.input<string>({
                    type: InputType.password,
                    name: "password",
                    placeholder: "Password",
                    value: user.password,
                    attributes: ["autocomplete", "password"],
                    onchange: (v) => {
                        user.password = v;
                    }
                }),
                FJSC.button({
                    text: "Login",
                    onclick: login,
                    classes: ["positive"]
                })
            ).build();
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
            .classes("notification", type)
            .text(text)
            .build();
    }
}
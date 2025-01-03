import {AnyElement, create, ifjs, signalMap, StringOrSignal} from "../../fjsc/src/f2.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import type {NavItem} from "../models/NavItem.ts";
import {compute, signal, Signal} from "../../fjsc/src/signals.ts";
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
        const username = signal("");
        const password = signal("");
        const filledUsername = compute(u => u.length > 0, username);
        const filledPassword = compute(p => p.length > 0, password);
        const filledBoth = compute((u, p) => u && p, filledUsername, filledPassword);

        const message = signal("");
        const login = async () => {
            await Api.login({
                username: username.value,
                password: password.value
            });
            currentUser.value = await Api.getUser();
            navigate("home");
        };
        const forgotPassword = async (e: MouseEvent) => {
            await Api.requestPasswordReset(username.value);
            message.value = "Password reset email sent.";
        };

        return create("div")
            .classes("flex-v")
            .children(
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        FJSC.input<string>({
                            type: InputType.text,
                            name: "username",
                            placeholder: "Username",
                            value: username,
                            attributes: ["autocomplete", "username"],
                            onchange: (v) => {
                                username.value = v;
                            }
                        }),
                        Generics.passwordInput(password),
                        ifjs(filledBoth, FJSC.button({
                            text: "Login",
                            onclick: login,
                            classes: ["positive"]
                        })),
                        ifjs(username, FJSC.button({
                            icon: { icon: "question_mark" },
                            title: "Send password reset mail",
                            onclick: forgotPassword,
                            classes: ["material-symbols-outlined", "negative"]
                        }))
                    ).build(),
                Generics.message(message)
            ).build();
    }

    static message(message: Signal<string>) {
        return ifjs(message, create("span")
            .text(message)
            .build());
    }

    static passwordInput(password: Signal<string>, placeholder: string = "Password") {
        return FJSC.input<string>({
            type: InputType.password,
            name: "password",
            placeholder,
            value: password,
            attributes: ["autocomplete", "password"],
            onchange: (v) => {
                password.value = v;
            }
        });
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
}
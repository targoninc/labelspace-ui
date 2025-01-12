import {compute, Signal} from "../../fjsc/src/signals.ts";
import {currentRoute} from "../state.ts";
import {create} from "../../fjsc/src/f2.ts";
import type {NavItem} from "../models/NavItem.ts";
import {Generics} from "./generics.ts";
import {navigate, reload} from "../routing/Router.ts";
import {User} from "../models/db/tri/User.ts";
import {FJSC} from "../../fjsc";
import {Api} from "../api/api.ts";

export class Nav {
    static navUser(currentUser: Signal<User | null>) {
        const username = compute(u => `@${u?.username}`, currentUser);

        return create("div")
            .classes("flex", "center-items")
            .children(
                Generics.heading(3, username),
                FJSC.button({
                    text: "Logout",
                    icon: { icon: "logout" },
                    classes: ["negative"],
                    onclick: async () => {
                        await Api.logout();
                        currentUser.value = null;
                        navigate("login");
                    }
                })
            ).build();
    }

    static navItem(item: NavItem) {
        const active = compute(r => r && r.path === item.path, currentRoute);
        const activeClass = compute((a): string => a ? "active" : "_", active);

        return create("a")
            .classes("button", "flex", "center-items", activeClass)
            .href(window.location.origin + "/" + item.path)
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
}
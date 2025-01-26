import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {Generics} from "./generics.ts";
import {create, ifjs, signalMap} from "../../fjsc/src/f2.ts";
import {User} from "../models/db/tri/User.ts";
import {Api} from "../api/api.ts";
import {Artist} from "../models/db/tri/Artist.ts";
import {currentUser} from "../state.ts";
import {Inputs} from "./inputs.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {notify} from "../functions/notifications.ts";
import {FJSC} from "../../fjsc";
import {Permissions} from "../enums/Permissions.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {reload} from "../routing/Router.ts";
import {Images} from "./images.ts";
import {ImageSize} from "./imageSize.ts";
import {Time} from "../functions/time.ts";
import {Modals} from "./modals.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {UserTotp} from "../models/db/tri/UserTotp.ts";
import {Totp} from "./totp.ts";
import {removeLastModal} from "../functions/modals.ts";

export class Users {
    static listPage() {
        if (!currentUser.value?.permissions?.some(p => p.name === Permissions.userManagement)) {
            return Generics.pageFrame(
                Generics.heading(2, "Access denied"),
            );
        }

        const users = signal<User[]>([]);
        const loading = signal(false);
        Api.getUsers()
            .then(u => users.value = u)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            ifjs(loading, Generics.loading()),
            Generics.heading(2, "Users"),
            Generics.table(
                ["Username", "Artists", "Last login", "Permissions"],
                users,
                (user: User) => Users.userInTable(user)
            )
        )
    }

    static userInTable(user: User) {
        return create("tr")
            .children(
                create("td")
                    .text(user.username)
                    .build(),
                create("td")
                    .text(user.artists?.map(a => a.name).join(", ") ?? "No artists")
                    .build(),
                create("td")
                    .text(user.lastlogin ? Time.agoUpdating(new Date(user.lastlogin), true) : "--")
                    .build(),
                create("td")
                    .text(user.permissions?.map(p => p.name).join(", ") ?? "No permissions")
                    .build()
            ).build();
    }

    static profile() {
        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Profile"),
                    Users.personalData(),
                    Users.mfa(),
                    Users.yourArtists()
                ).build()
        );
    }

    static mfa() {
        const methods = compute(u => u?.totp ?? [], currentUser);
        const userId = compute(u => u?.id ?? 0, currentUser);
        const loading = signal(false);

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(2, "Multi-factor authentication"),
                Generics.table(
                    ["Name", "Verified", "Created", "Updated", "Actions"],
                    methods,
                    (method) => Totp.totpMethodInTable(method, loading, userId)
                ),
                FJSC.button({
                    text: "Add TOTP method",
                    icon: {icon: "add"},
                    classes: ["positive", "fit-content"],
                    onclick: async () => {
                        Modals.input(async (name: string) => {
                            loading.value = true;
                            await Api.addTotpMethod(name).then((res) => {
                                removeLastModal();
                                Modals.totpVerificationModal(res.secret, res.qrDataUrl);
                            }).finally(() => loading.value = false);
                        }, "Add TOTP method", InputType.text, false);
                    }
                })
            ).build();
    }

    private static yourArtists() {
        const artists = compute(u => u?.artists ?? [], currentUser);

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(2, "Your artists"),
                signalMap(artists, create("div").classes("flex-v"), a => {
                    const description = signal(a.description ?? "");
                    const anyInvalid = compute((d) => {
                        return d === a.description;
                    }, description);
                    const loading = signal(false);

                    return Generics.container(1, [
                        create("div")
                            .classes("flex")
                            .children(
                                Images.changeableImage(a.id, a.has_logo, MediaFileType.artistLogo, {
                                    changeable: true,
                                    deletable: false,
                                    afterChange: reload,
                                    size: ImageSize.p100,
                                    classes: ["artist-logo"]
                                }, "/images/LOGO512.png"),
                                create("div")
                                    .classes("flex-v")
                                    .children(
                                        Generics.link("https://trirecords.eu/artist/" + a.name, a.name),
                                        Inputs.longtext(description, "Description", "description"),
                                        FJSC.button({
                                            text: "Update",
                                            icon: { icon: "save" },
                                            classes: ["positive"],
                                            disabled: compute((a, l) => a || l, anyInvalid, loading),
                                            onclick: () => {
                                                Api.updateArtist(a.name, <Partial<Artist>>{
                                                    description: description.value
                                                }).then(() => {
                                                    notify("Updated artist", NotificationType.success);
                                                    Api.getUser().then(u => {
                                                        currentUser.value = u;
                                                    });
                                                })
                                                .finally(() => loading.value = false);
                                            }
                                        })
                                    ).build()
                            ).build()
                    ]);
                })
            ).build();
    }

    static personalData() {
        const user = compute(u => u, currentUser);
        const legalName = compute(u => u?.legal_name ?? "", user);
        const country = compute(u => u?.country ?? "", user);
        const state = compute(u => u?.state ?? "", user);
        const changed = compute((u, l, c, s) => {
            return l !== u?.legal_name || c !== u?.country || s !== u?.state;
        }, user, legalName, country, state);
        const message = signal("");
        const loading = signal(false);
        const disabled = compute((c, l) => !c || l, changed, loading);
        const emails = compute(u => u?.emails ??  [], user);

        return Generics.container(1, [
            Generics.heading(3, "Personal Data"),
            Inputs.password(legalName, "Legal name", "legal_name"),
            Inputs.text(country, "Country", "country"),
            Inputs.text(state, "State", "state"),
            create("div")
                .classes("flex", "center-items")
                .children(
                    FJSC.button({
                        text: "Save",
                        icon: { icon: "save" },
                        classes: ["positive"],
                        disabled: disabled,
                        onclick: () => {
                            loading.value = true;
                            Api.updateUser(<Partial<User>>{
                                legal_name: legalName.value,
                                country: country.value,
                                state: state.value,
                            }).then(() => {
                                notify("Saved", NotificationType.success);
                                Api.getUser().then(u => {
                                    currentUser.value = u;
                                });
                            }).catch(e => {
                                message.value = e.message;
                            }).finally(() => {
                                loading.value = false;
                            });
                        }
                    }),
                    ifjs(loading, Generics.loading())
                ).build(),
            Generics.message(message),
            Generics.table(
                ["Email", "Primary", "Verified", "Actions"],
                emails,
                (email) => create("tr")
                    .children(
                        create("td")
                            .children(
                                Generics.privateText(email.email)
                            ).build(),
                        create("td")
                            .text(email.primary ? "Yes" : "No")
                            .build(),
                        create("td")
                            .text(email.verified ? "Yes" : "No")
                            .build(),
                        create("td")
                            .build()
                    ).build(),
            ),
        ], ["flex-v"]);
    }
}
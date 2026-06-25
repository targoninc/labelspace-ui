import {Generics, horizontal, vertical} from "./generic/generics.ts";
import {User} from "../models/db/tri/User.ts";
import {Api} from "../api/api.ts";
import {Artist} from "../models/db/tri/Artist.ts";
import {currentUser} from "../state.ts";
import {Inputs} from "./generic/inputs.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {notify} from "../functions/notifications.ts";
import {Permissions} from "../enums/Permissions.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {reload} from "../routing/Router.ts";
import {Images} from "./generic/images.ts";
import {ImageSize} from "../enums/imageSize.ts";
import {Time} from "../functions/time.ts";
import {Modals} from "./modals.ts";
import {UserTotp} from "../models/db/tri/UserTotp.ts";
import {Totp} from "./totp.ts";
import {registerWebauthnMethod, webauthnLogin} from "../functions/webauthn.ts";
import {
    CredentialDescriptor,
    ExtendedAuthenticatorTransport,
    RegistrationJSON
} from "@passwordless-id/webauthn/dist/esm/types";
import {PublicKey} from "../models/db/tri/PublicKey.ts";
import {PermissionIcons} from "../enums/PermissionIcons.ts";
import {addModal, removeLastModal} from "../functions/modals.ts";
import {compute, create, InputType, Signal, signal, signalMap, when} from "@targoninc/jess";
import {Permission} from "../models/db/tri/Permission.ts";
import {button, checkbox, input} from "@targoninc/jess-components";
import {ArtistLink} from "../models/db/tri/ArtistLink.ts";
import {Artists} from "./artists.ts";

export class Users {
    static usersPage() {
        if (!currentUser.value?.permissions?.some(p => p.name === Permissions.userManagement)) {
            return Generics.pageFrame(
                Generics.heading(2, "Access denied"),
            );
        }

        const users = signal<User[]>([]);
        const loading = signal(false);
        Api.getUsers()
            .then(u => users.value = u?.sort((a, b) => parseFloat(b.available?.total ?? "0") - parseFloat(a.available?.total ?? "0")) ?? [])
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            vertical(
                when(loading, Generics.loading()),
                Generics.heading(2, "Users"),
                horizontal(
                    Users.createSection(users),
                    Artists.createSection(users),
                ),
                Generics.table(
                    ["ID", "Username", "Artists", "Last login", "Email addresses", "TOTP methods", "Passkeys", "Earned", "Paid", "Available", "Permissions"],
                    users,
                    (user: User) => Users.userInTable(user)
                )
            ).build(),
        )
    }

    static userInTable(user: User) {
        const permissions = user.permissions?.map(p => p.name) ?? [];

        return create("tr")
            .children(
                create("td")
                    .text(user.id)
                    .build(),
                create("td")
                    .text(user.username)
                    .build(),
                create("td")
                    .children(
                        horizontal(
                            ...user.artists?.map(a => Generics.link(Api.labelUrl(`/artist/${a.name}`), a.name)) ?? []
                        )
                    ).build(),
                create("td")
                    .text(user.lastlogin ? Time.agoUpdating(new Date(user.lastlogin), true) : "--")
                    .build(),
                create("td").text(user.emails?.length ?? 0).build(),
                create("td").text(user.totp?.length ?? 0).build(),
                create("td").text(user.public_keys?.length ?? 0).build(),
                create("td").children(
                    Generics.heading(3, `$${user.available?.total ?? "0"}`, true)
                ).build(),
                create("td").children(
                    Generics.heading(3, `$${user.available?.paidOut ?? "0"}`, true)
                ).build(),
                create("td").children(
                    Generics.heading(3, `$${user.available?.available ?? "0"}`, true)
                ).build(),
                create("td")
                    .children(
                        create("button")
                            .classes("jess", "flex", "align-children")
                            .children(
                                create("span")
                                    .text("Edit"),
                                ...permissions.map(p => horizontal(
                                    Generics.icon(PermissionIcons[p as Permissions], p)
                                )),
                            ).onclick(() => {
                            Users.permissionsEditor(user);
                        }).build()
                    ).build()
            ).build();
    }

    static profile() {
        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Profile"),
                    when(currentUser, Generics.loading(), true),
                    when(currentUser, create("div")
                        .classes("flex-v")
                        .children(
                            Users.personalData(),
                            Users.totpSection(),
                            Users.devicesSection(),
                            Users.yourArtists()
                        ).build())
                ).build()
        );
    }

    static totpSection() {
        const totpMethods = compute(u => u?.totp ?? [], currentUser);
        const hasMethods = compute(m => m.length > 0, totpMethods);
        const userId = compute(u => u?.id ?? 0, currentUser);
        const loading = signal(false);

        return Generics.container(1, [
            vertical(
                Generics.heading(2, "TOTP methods"),
                when(hasMethods, create("span")
                    .text("You have no TOTP methods configured")
                    .build(), true),
                when(hasMethods, Users.totpDevices(totpMethods, loading, userId)),
                button({
                    text: "Add TOTP method",
                    icon: {icon: "add"},
                    classes: ["positive", "fit-content"],
                    onclick: async () => {
                        Modals.input(async (name: string) => {
                            loading.value = true;
                            await Api.addTotpMethod(name).then((res) => {
                                if (!res) {
                                    return;
                                }
                                Api.getUser().then(u => {
                                    currentUser.value = u;
                                });
                                removeLastModal();
                                Modals.totpVerificationModal(res.secret, res.qrDataUrl);
                            }).finally(() => loading.value = false);
                        }, "Add TOTP method", InputType.text, false, () => {
                        }, {
                            label: "TOTP method name"
                        });
                    }
                })
            ).build()
        ]);
    }

    private static totpDevices(totpMethods: Signal<UserTotp[]>, loading: Signal<boolean>, userId: Signal<any>) {
        return signalMap(totpMethods, create("div").classes("flex"), method => Totp.totpMethodInTable(method, loading, userId));
    }

    static devicesSection() {
        const public_keys = compute(u => u?.public_keys ?? [], currentUser);
        const hasCredentials = compute(m => m.length > 0, public_keys);
        const loading = signal(false);
        const message = signal("");

        return Generics.container(1, [
            vertical(
                Generics.heading(2, "Passkeys"),
                when(hasCredentials, create("span")
                    .text("You have no passkeys configured")
                    .build(), true),
                when(hasCredentials, vertical(
                    signalMap(public_keys, create("div").classes("flex"), key => create("div")
                        .classes("flex-v", "card")
                        .children(
                            create("div")
                                .classes("flex", "center-items")
                                .children(
                                    Generics.heading(2, key.name),
                                ).build(),
                            create("span")
                                .text(compute(t => `Created ${t}`, Time.agoUpdating(new Date(key.created_at), true)))
                                .build(),
                            Users.webAuthNActions(loading, key, message)
                        ).build()),
                ).build()),
                button({
                    text: "Add passkey",
                    icon: {icon: "add"},
                    classes: ["positive", "fit-content"],
                    disabled: loading,
                    onclick: async () => {
                        Modals.input(async (name: string) => {
                            loading.value = true;
                            await Api.getWebauthnChallenge().then(async (res) => {
                                if (!res) {
                                    return;
                                }
                                const user = currentUser.value;
                                if (!user) {
                                    return;
                                }
                                let registration: RegistrationJSON;
                                try {
                                    registration = await registerWebauthnMethod(user, res.challenge);
                                } catch (e: any) {
                                    notify(`Error: ${e.message}`, NotificationType.error);
                                    return;
                                }
                                Api.registerWebauthnMethod(registration, res.challenge, name).then(() => {
                                    removeLastModal();
                                    Api.getUser().then(u => {
                                        currentUser.value = u;
                                    });
                                    notify("Successfully registered passkey", NotificationType.success);
                                }).finally(() => loading.value = false);
                            }).catch(() => loading.value = false);
                        }, "Add passkey", InputType.text, false, () => {
                        }, {
                            label: "Passkey name"
                        });
                    }
                })
            ).build()
        ]);
    }

    private static webAuthNActions(loading: Signal<boolean>, key: PublicKey, message: Signal<string>) {
        return create("div")
            .classes("flex", "center-items")
            .children(
                button({
                    text: "Delete",
                    icon: {icon: "delete"},
                    classes: ["negative"],
                    disabled: loading,
                    onclick: () => {
                        loading.value = true;
                        Api.getWebauthnChallenge().then(async (res2) => {
                            if (!res2) {
                                return;
                            }
                            const challenge = res2.challenge;
                            const cred: CredentialDescriptor = {
                                id: key.key_id,
                                transports: key.transports.split(",") as ExtendedAuthenticatorTransport[]
                            };
                            webauthnLogin(challenge, [cred]).then(async (verification) => {
                                await Api.verifyWebauthn(verification, res2.challenge);
                                await Api.deleteWebauthnMethod(key.key_id, res2.challenge);
                                Api.getUser().then(u => {
                                    currentUser.value = u;
                                });
                            }).catch(e => {
                                message.value = e.message;
                            }).finally(() => {
                                loading.value = false;
                            });
                        }).catch(e => {
                            message.value = e.message;
                        });
                    }
                }),
                Generics.message(message)
            ).build();
    }

    private static yourArtists() {
        const artists = compute(u => u?.artists ?? [], currentUser);

        return vertical(
            Generics.heading(2, "Your artists"),
            signalMap(artists, vertical(), Users.artist)
        ).build();
    }

    private static artist(a: Artist) {
        const description = signal(a.description ?? "");
        const noChanges = compute((d) => {
            return d === a.description;
        }, description);
        const loading = signal(false);

        return Generics.container(1, [
            horizontal(
                vertical(
                    Images.changeableImage(a.id, a.has_logo, MediaFileType.artistLogo, {
                        changeable: true,
                        deletable: false,
                        afterChange: reload,
                        size: ImageSize.p100,
                        classes: ["artist-logo"]
                    }, "/images/LOGO512.png"),
                    vertical(
                        Generics.link(Api.labelUrl(`/artist/${a.name}`), a.name),
                        Inputs.longtext(description, "Description", "description"),
                        horizontal(
                            button({
                                text: "Update",
                                icon: {icon: "save"},
                                classes: ["positive"],
                                disabled: compute((a, l) => a || l, noChanges, loading),
                                onclick: () => {
                                    Api.updateArtist(a.name, <Partial<Artist>>{
                                        description: description.value
                                    }).then(() => {
                                        notify("Updated artist", NotificationType.success);
                                        Api.getUser().then(u => {
                                            currentUser.value = u;
                                        });
                                    }).finally(() => loading.value = false);
                                }
                            }),
                            when(noChanges, button({
                                text: "Revert",
                                icon: {icon: "undo"},
                                classes: ["warning"],
                                onclick: () => {
                                    description.value = a.description ?? "";
                                }
                            }), true)
                        )
                    ),
                ),
                Users.artistLinks(a)
            ).build()
        ]);
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
        const mailLoading = signal(false);
        const disabled = compute((c, l) => !c || l, changed, loading);
        const emails = compute(u => u?.emails ?? [], user);
        const paypalMailSetting = compute(u => u?.settings?.find(s => s.key === 'paypalMail'), currentUser);
        const paypalMail = compute(s => s?.value ?? "", paypalMailSetting);

        return vertical(
            Generics.heading(3, "Personal Data"),
            Inputs.password(legalName, "Legal name", "legal_name"),
            Inputs.text(country, "Country", "country"),
            Inputs.text(state, "State", "state"),
            create("div")
                .classes("flex", "center-items")
                .children(
                    button({
                        text: "Save",
                        icon: {icon: "save"},
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
                    when(loading, Generics.loading())
                ).build(),
            Generics.message(message),
            Generics.table(
                ["Email", "Primary", "Verified"],
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
                            .build()
                    ).build(),
            ),
            vertical(
                input({
                    type: InputType.password,
                    name: "paypalMail",
                    placeholder: "Paypal mail",
                    label: "Paypal mail",
                    value: paypalMail,
                    disabled: mailLoading,
                    onchange: (v) => paypalMail.value = v
                }),
                horizontal(
                    button({
                        text: "Save",
                        icon: {icon: "save"},
                        classes: ["positive"],
                        disabled: mailLoading,
                        onclick: () => {
                            mailLoading.value = true;
                            Api.updateSetting("paypalMail", paypalMail.value).then(() => {
                                notify("Paypal mail updated", NotificationType.success);
                                Api.getUser().then(u => {
                                    currentUser.value = u;
                                });
                            }).catch(e => {
                                notify("Failed to update paypal mail: " + e.message, NotificationType.error);
                            }).finally(() => {
                                mailLoading.value = false;
                            });
                        }
                    })
                )
            ).classes("card"),
            horizontal(
                Generics.heading(3, "Password"),
                button({
                    icon: {icon: "password"},
                    title: "Send password reset mail",
                    text: "Change password",
                    disabled: loading,
                    onclick: () => {
                        const name = currentUser.value?.username;
                        if (name) {
                            Api.requestPasswordReset(name)
                                .then(() => notify("Password reset email sent.", NotificationType.success))
                                .finally(() => loading.value = false);
                        }
                    },
                })
            ).classes("card", "align-children"),
        ).build();
    }

    private static createSection(users: Signal<User[]>) {
        const username = signal("");
        const legal_name = signal("");
        const country = signal("");
        const state = signal("");
        const email = signal("");
        const temp_password = signal("");
        const loading = signal(false);
        const disabled = compute((u, legal, c, e, t, l, usrs) => {
            const usernameFound = usrs.some(user => user.username === u);
            return !u || !legal || !c || !e || t.length < 16 || l || usernameFound;
        }, username, legal_name, country, email, temp_password, loading, users);

        return Generics.collapsibleContainer(1, "Create new user", "Hide form", [
            Generics.heading(2, "Create new user"),
            Inputs.text(username, "Username", "username"),
            Inputs.text(legal_name, "Legal name", "legal_name"),
            Inputs.text(country, "Country", "country"),
            Inputs.text(state, "State", "state"),
            Inputs.text(email, "Email", "email"),
            Inputs.password(temp_password, "Temporary password", "temp_password"),
            create("div")
                .classes("flex", "center-items")
                .children(
                    button({
                        text: "Create user",
                        icon: {icon: "add"},
                        classes: ["positive"],
                        disabled: disabled,
                        onclick: () => {
                            loading.value = true;
                            Api.createUser(
                                username.value,
                                legal_name.value,
                                country.value,
                                state.value,
                                email.value,
                                temp_password.value
                            ).then(() => {
                                notify("User created", NotificationType.success);
                                Api.getUsers().then(u => users.value = u ?? []);
                                username.value = "";
                                legal_name.value = "";
                                country.value = "";
                                state.value = "";
                                email.value = "";
                                temp_password.value = "";
                            }).catch(e => {
                                notify(`Error: ${e.message}`, NotificationType.error);
                            }).finally(() => loading.value = false);
                        }
                    }),
                    when(loading, Generics.loading())
                ).build()
        ]);
    }

    private static artistLinks(a: Artist) {
        const links = signal<ArtistLink[]>([]);
        const loading = signal(false);

        const update = () => {
            loading.value = true;
            Api.getArtistLinks(a.id)
                .then(l => links.value = l ?? [])
                .finally(() => loading.value = false);
        }
        update();

        const newLinkText = signal("");
        const newLinkUrl = signal("");

        return vertical(
            signalMap(
                links,
                vertical(),
                l => Users.artistLink(l, loading, update),
            ),
            horizontal(
                input({
                    name: "newLinkText",
                    type: InputType.text,
                    value: newLinkText,
                    label: "Text",
                    onchange: val => newLinkText.value = val
                }),
                input({
                    name: "newLinkUrl",
                    type: InputType.text,
                    value: newLinkUrl,
                    label: "URL",
                    onchange: val => newLinkUrl.value = val
                }),
                button({
                    text: "New link",
                    icon: {icon: "add"},
                    classes: ["align-end", "positive"],
                    disabled: compute((l, t, u) => l.length >= 10 || !t || !u || t.length === 0 || u.length <= 9, links, newLinkText, newLinkUrl),
                    onclick: () => {
                        loading.value = true;
                        Api.createArtistLink(a.id, newLinkText.value, newLinkUrl.value)
                            .then(() => {
                                newLinkText.value = "";
                                newLinkUrl.value = "";
                                update();
                            }).finally(() => loading.value = false);
                    }
                }),
                when(loading, Generics.loading()),
            ).classes("center-items"),
        )
    }

    private static artistLink(l: ArtistLink, loading: Signal<boolean>, update: () => void) {
        const text = signal(l.text);
        const url = signal(l.url);
        const hasChanges = compute((t, u) => t !== l.text || u !== l.url, text, url);

        const save = () => {
            loading.value = true;
            Api.updateArtistLink(l.id, text.value, url.value)
                .then(() => {
                    l.text = text.value;
                    l.url = url.value;
                })
                .finally(() => loading.value = false);
        }

        return horizontal(
            input({
                name: `linkText-${l.id}`,
                type: InputType.text,
                disabled: loading,
                value: text,
                label: "Text",
                onchange: val => text.value = val
            }),
            input({
                name: `linkUrl-${l.id}`,
                type: InputType.url,
                disabled: loading,
                value: url,
                label: "URL",
                onchange: val => url.value = val
            }),
            button({
                text: "Delete",
                icon: {icon: "delete"},
                disabled: loading,
                classes: ["align-end", "negative"],
                onclick: () => {
                    Modals.confirm(() => {
                        loading.value = true;
                        Api.deleteArtistLink(l.id)
                            .then(() => update())
                            .finally(() => loading.value = false);
                    }, "Delete link", `Are you sure you want to delete the link '${l.text}'?`);
                }
            }),
            when(hasChanges, button({
                text: "Save",
                icon: {icon: "save"},
                disabled: loading,
                onclick: save
            })),
        ).classes("center-items").build();
    }

    private static permissionsEditor(user: User) {
        const permissions = signal<Permission[]>(user.permissions ?? []);
        const allPermissions = Object.values(Permissions);

        addModal(Modals.modalBase(
            Generics.heading(2, `Permissions - ${user.username}`),
            vertical(
                ...allPermissions.map(p => {
                    const hasPermission = compute(
                        up => up.some(upp => upp.name === p),
                        permissions
                    );

                    return checkbox({
                        text: p,
                        checked: hasPermission,
                        onchange: () => {
                            const val = !hasPermission.value;
                            Api.setUserPermission(user.id, p, val).then(() => {
                                if (val) {
                                    permissions.value = [
                                        ...permissions.value,
                                        {
                                            name: p,
                                            id: -1,
                                            created_at: "",
                                            updated_at: "",
                                            description: ""
                                        }
                                    ];
                                } else {
                                    permissions.value = permissions.value.filter(pm => pm.name !== p);
                                }
                            });
                        }
                    });
                }),
                button({
                    text: "Close",
                    icon: {icon: "close"},
                    classes: ["negative"],
                    onclick: removeLastModal
                })
            ).build()
        ));
    }
}

import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {Generics} from "./generic/generics.ts";
import {create, ifjs, signalMap} from "../../fjsc/src/f2.ts";
import {User} from "../models/db/tri/User.ts";
import {Api} from "../api/api.ts";
import {Artist} from "../models/db/tri/Artist.ts";
import {currentUser} from "../state.ts";
import {Inputs} from "./generic/inputs.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {notify} from "../functions/notifications.ts";
import {FJSC} from "../../fjsc";
import {Permissions} from "../enums/Permissions.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {reload} from "../routing/Router.ts";
import {Images} from "./generic/images.ts";
import {ImageSize} from "../enums/imageSize.ts";
import {Time} from "../functions/time.ts";
import {Modals} from "./modals.ts";
import {InputType} from "../../fjsc/src/Types.ts";
import {UserTotp} from "../models/db/tri/UserTotp.ts";
import {Totp} from "./totp.ts";
import {removeLastModal} from "../functions/modals.ts";
import {registerWebauthnMethod, webauthnLogin} from "../functions/webauthn.ts";
import {
    CredentialDescriptor,
    ExtendedAuthenticatorTransport,
    RegistrationJSON
} from "@passwordless-id/webauthn/dist/esm/types";
import {login} from "../functions/startLogin.ts";
import { PublicKey } from "../models/db/tri/PublicKey.ts";
import { PermissionIcons } from "../enums/PermissionIcons.ts";

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
                ["Username", "Artists", "Last login", "Email addresses", "TOTP methods", "Passkeys", "Permissions"],
                users,
                (user: User) => Users.userInTable(user)
            )
        )
    }

    static userInTable(user: User) {
        const permissions = user.permissions?.map(p => p.name) ?? [];

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
                create("td").text(user.emails?.length ?? 0).build(),
                create("td").text(user.totp?.length ?? 0).build(),
                create("td").text(user.public_keys?.length ?? 0).build(),
                create("td")
                    .children(
                        create("div")
                            .classes("flex")
                            .children(
                                ...permissions.map(p => Generics.icon(PermissionIcons[p as Permissions]))
                            ).build()
                    ).build()
            ).build();
    }

    static profile() {
        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    Generics.heading(2, "Profile"),
                    ifjs(currentUser, Generics.loading(), true),
                    ifjs(currentUser, create("div")
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

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(2, "TOTP methods"),
                ifjs(hasMethods, create("span")
                    .text("You have no TOTP methods configured")
                    .build(), true),
                ifjs(hasMethods, Users.totpDevices(totpMethods, loading, userId)),
                FJSC.button({
                    text: "Add TOTP method",
                    icon: {icon: "add"},
                    classes: ["positive", "fit-content"],
                    onclick: async () => {
                        Modals.input(async (name: string) => {
                            loading.value = true;
                            await Api.addTotpMethod(name).then((res) => {
                                Api.getUser().then(u => {
                                    currentUser.value = u;
                                });
                                removeLastModal();
                                Modals.totpVerificationModal(res.secret, res.qrDataUrl);
                            }).finally(() => loading.value = false);
                        }, "Add TOTP method", InputType.text, false, () => {}, {
                            label: "TOTP method name"
                        });
                    }
                })
            ).build();
    }

    private static totpDevices(totpMethods: Signal<UserTotp[]>, loading: Signal<boolean>, userId: Signal<any>) {
        return signalMap(totpMethods, create("div").classes("flex"), method => Totp.totpMethodInTable(method, loading, userId));
    }

    static devicesSection() {
        const public_keys = compute(u => u?.public_keys ?? [], currentUser);
        const hasCredentials = compute(m => m.length > 0, public_keys);
        const loading = signal(false);
        const message = signal("");

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(2, "Passkeys"),
                ifjs(hasCredentials, create("span")
                    .text("You have no passkeys configured")
                    .build(), true),
                ifjs(hasCredentials, create("div")
                    .classes("flex-v")
                    .children(
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
                FJSC.button({
                    text: "Add passkey",
                    icon: {icon: "add"},
                    classes: ["positive", "fit-content"],
                    disabled: loading,
                    onclick: async () => {
                        Modals.input(async (name: string) => {
                            loading.value = true;
                            await Api.getWebauthnChallenge().then(async (res) => {
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
                            }).catch(e => {
                                loading.value = false;
                            });
                        }, "Add passkey", InputType.text, false, () => {}, {
                            label: "Passkey name"
                        });
                    }
                })
            ).build();
    }

    private static webAuthNActions(loading: Signal<boolean>, key: PublicKey, message: Signal<string>) {
        return create("div")
            .classes("flex", "center-items")
            .children(
                FJSC.button({
                    text: "Delete",
                    icon: {icon: "delete"},
                    classes: ["negative"],
                    disabled: loading,
                    onclick: () => {
                        loading.value = true;
                        Api.getWebauthnChallenge().then(async (res2) => {
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
                                            icon: {icon: "save"},
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
        const emails = compute(u => u?.emails ?? [], user);

        return create("div")
            .classes("flex-v")
            .children(
                Generics.heading(3, "Personal Data"),
                Inputs.password(legalName, "Legal name", "legal_name"),
                Inputs.text(country, "Country", "country"),
                Inputs.text(state, "State", "state"),
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        FJSC.button({
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
            ).build();
    }
}
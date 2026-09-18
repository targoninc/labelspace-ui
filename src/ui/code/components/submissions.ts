import {Api} from "../api/api.ts";
import {Generics, horizontal, vertical} from "./generic/generics.ts";
import {Inputs} from "./generic/inputs.ts";
import {navigate} from "../routing/Router.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {Permissions} from "../enums/Permissions.ts";
import {SubmissionVote} from "../enums/SubmissionVote.ts";
import {currentUser} from "../state.ts";
import {Submission} from "../models/Submission.ts";
import {compute, create, signal, signalMap, when} from "@targoninc/jess";
import {button} from "@targoninc/jess-components";
import {Time} from "../functions/time.ts";
import {toUTCDate} from "../functions/dates.ts";

type Filter = "all" | "pending" | "accepted" | "rejected";

export class Submissions {
    static submissionsTab() {
        const submissions = signal<Submission[]>([]);
        const loading = signal(false);
        const filter = signal<Filter>("all");
        const filtered = compute((s, f) => {
            if (f === "all") return s;
            if (f === "pending") return s.filter(x => !x.accepted && !x.rejected);
            if (f === "accepted") return s.filter(x => x.accepted);
            return s.filter(x => x.rejected);
        }, submissions, filter);
        const load = () => {
            loading.value = true;
            Api.getSubmissions()
                .then(s => submissions.value = s ?? [])
                .finally(() => loading.value = false);
        };
        load();

        return vertical(
            when(loading, Generics.loading()),
            horizontal(
                ...(["all", "pending", "accepted", "rejected"] as Filter[]).map(f =>
                    button({
                        text: f.charAt(0).toUpperCase() + f.slice(1),
                        classes: [compute((v): string => v === f ? "active" : "_", filter)],
                        onclick: () => filter.value = f
                    })
                )
            ).classes("fullWidth").build(),
            signalMap(filtered, vertical(), s => Submissions.submissionCard(s, load))
        ).build();
    }

    private static dateStr(d: string | Date) {
        const date = new Date(d);
        const dd = String(date.getDate()).padStart(2, "0");
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        return `${dd}.${mm}.${yyyy}`;
    }

    private static async ensureArtist(name: string) {
        const search = await Api.getArtistByName(name);
        if (search) return search;
        return await Api.createArtist(name, null);
    }

    private static tryAddLink(type: "album" | "track", id: number, link: string) {
        try {
            new URL(link);
            if (type === "album") {
                Api.addAlbumLink(id, link);
            } else {
                Api.addTrackLink(id, link);
            }
        } catch {
            // link is not a valid URL, skip
        }
    }

    private static submissionCard(s: Submission, refresh: Function) {
        const initialVote = s.currentUserRating?.vote ?? "";
        const initialComment = s.currentUserRating?.comment ?? "";
        const vote = signal<string>(initialVote);
        const comment = signal(initialComment);
        const canConvert = compute(u => u?.permissions?.some(p => p.name === Permissions.convertSubmissions) ?? false, currentUser);
        const showConvert = compute((c) => c && !s.accepted && !s.rejected, canConvert);
        const statusText = s.accepted ? "Accepted" : s.rejected ? "Rejected" : "Pending";
        const statusClass = s.accepted ? "green" : s.rejected ? "red" : "orange";
        const otherUserId = currentUser.value?.id;
        const noCount = s.ratings?.filter(r => r.vote === SubmissionVote.No && r.user_id !== otherUserId).length ?? 0;
        const maybeCount = s.ratings?.filter(r => r.vote === SubmissionVote.Maybe && r.user_id !== otherUserId).length ?? 0;
        const yesCount = s.ratings?.filter(r => r.vote === SubmissionVote.Yes && r.user_id !== otherUserId).length ?? 0;
        const hasChanges = compute((v, c) => v !== initialVote || c !== initialComment, vote, comment);
        const saving = signal(false);
        const converting = signal(false);
        const title = `Submission from ${Submissions.dateStr(s.created_at)}`;

        return Generics.container(2, [
            horizontal(
                vertical(
                    horizontal(
                        Generics.heading(2, s.artist_name),
                        ...(s.artistHasReleases ? [Generics.pill("Artist name has releases", ["green"])] : [])
                    ).classes("align-children"),
                    Generics.link(s.link, s.link, ["big"]),
                    horizontal(
                        Generics.pill("Desired release date", ["blue"]),
                        create("span")
                            .text(Time.ago(s.desired_release_date))
                    ).classes("align-children"),
                    horizontal(
                        Generics.pill("Email", ["blue"]),
                        Generics.privateText(s.email),
                    ).classes("align-children"),
                    horizontal(
                        Generics.pill("Message", ["blue"]),
                        create("p")
                            .text(s.message),
                    ).classes("align-children"),
                ),
                vertical(
                    horizontal(
                        button({
                            text: `No (${noCount})`,
                            icon: {icon: "thumb_down"},
                            classes: [compute((v): string => v === SubmissionVote.No ? "negative" : "_", vote), "tab"],
                            onclick: () => vote.value = SubmissionVote.No
                        }),
                        button({
                            text: `Maybe (${maybeCount})`,
                            icon: {icon: "help"},
                            classes: [compute((v): string => v === SubmissionVote.Maybe ? "warning" : "_", vote), "tab"],
                            onclick: () => vote.value = SubmissionVote.Maybe
                        }),
                        button({
                            text: `Yes (${yesCount})`,
                            icon: {icon: "thumb_up"},
                            classes: [compute((v): string => v === SubmissionVote.Yes ? "positive" : "_", vote), "tab"],
                            onclick: () => vote.value = SubmissionVote.Yes
                        }),
                    ).classes("nogap").build(),
                    Inputs.longtext(comment, "Comment", "comment"),
                    horizontal(
                        button({
                            text: "Save vote",
                            icon: {icon: "save"},
                            disabled: compute((v, h, l) => !v || !h || l, vote, hasChanges, saving),
                            onclick: () => {
                                saving.value = true;
                                Api.voteOnSubmission(s.id, vote.value, comment.value || null)
                                    .then(() => notify("Vote saved", NotificationType.success))
                                    .finally(() => saving.value = false);
                            }
                        }),
                    ).classes("center-items"),
                    horizontal(
                        Generics.pill(statusText, [statusClass]),
                        ...(canConvert.value && (s.rejected || s.accepted) ? [button({
                            text: "Revert",
                            icon: {icon: "undo"},
                            onclick: () => {
                                const action = s.rejected ? "revert_rejection" : "revert_acceptance";
                                Api.convertSubmission(s.id, action).then(() => refresh());
                            }
                        })] : []),
                        when(showConvert, horizontal(
                            button({
                                text: "Create album",
                                icon: {icon: "album"},
                                classes: ["positive"],
                                disabled: converting,
                                onclick: async () => {
                                    converting.value = true;
                                    await Submissions.ensureArtist(s.artist_name);
                                    Api.createAlbum({
                                        title,
                                        artists: s.artist_name,
                                        release_date: toUTCDate(new Date(s.desired_release_date)),
                                    }).then(album => {
                                        if (album?.id) Submissions.tryAddLink("album", album.id, s.link);
                                        Api.convertSubmission(s.id, "accept").then(() => {
                                            notify("Album created from submission", NotificationType.success);
                                            navigate(`/album/${album?.id}`);
                                        });
                                    }).finally(() => converting.value = false);
                                }
                            }),
                            button({
                                text: "Create track",
                                icon: {icon: "graphic_eq"},
                                classes: ["positive"],
                                disabled: converting,
                                onclick: async () => {
                                    converting.value = true;
                                    await Submissions.ensureArtist(s.artist_name);
                                    Api.createTrack({
                                        title,
                                        artists: s.artist_name,
                                        release_date: toUTCDate(new Date(s.desired_release_date)),
                                    }).then(track => {
                                        if (track?.id) Submissions.tryAddLink("track", track.id, s.link);
                                        Api.convertSubmission(s.id, "accept").then(() => {
                                            notify("Track created from submission", NotificationType.success);
                                            navigate(`/track/${track?.id}`);
                                        });
                                    }).finally(() => converting.value = false);
                                }
                            }),
                            button({
                                text: "Reject",
                                icon: {icon: "block"},
                                classes: ["negative"],
                                onclick: () => {
                                    Api.convertSubmission(s.id, "reject").then(() => refresh());
                                }
                            }),
                        ).build()),
                    ).classes("align-children"),
                ),
            ).classes("space-between").build()
        ]);
    }
}

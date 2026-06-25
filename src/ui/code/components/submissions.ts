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

export class Submissions {
    static submissionsTab() {
        const submissions = signal<Submission[]>([]);
        const loading = signal(false);
        const load = () => {
            loading.value = true;
            Api.getSubmissions()
                .then(s => submissions.value = s ?? [])
                .finally(() => loading.value = false);
        };
        load();

        return vertical(
            when(loading, Generics.loading()),
            signalMap(submissions, vertical(), s => Submissions.submissionCard(s, load))
        ).build();
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

        return Generics.container(1, [
            vertical(
                Generics.heading(2, s.artist_name),
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
                Generics.pill(statusText, [statusClass]),
                when(showConvert, horizontal(
                    button({
                        text: "Create album",
                        icon: {icon: "album"},
                        classes: ["positive"],
                        onclick: () => {
                            Api.convertSubmission(s.id, "accept").then(() => {
                                notify("Submission accepted", NotificationType.success);
                                navigate("/new-album");
                            });
                        }
                    }),
                    button({
                        text: "Create track",
                        icon: {icon: "graphic_eq"},
                        classes: ["positive"],
                        onclick: () => {
                            Api.convertSubmission(s.id, "accept").then(() => {
                                notify("Submission accepted", NotificationType.success);
                                navigate("/new-track");
                            });
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
            ).build()
        ]);
    }
}

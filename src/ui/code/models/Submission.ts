import {SubmissionRating} from "./SubmissionRating.ts";

export interface Submission {
    id: number;
    link: string;
    desired_release_date: string;
    artist_name: string;
    email: string;
    message: string;
    accepted: boolean;
    rejected: boolean;
    accepted_by: number | null;
    rejected_by: number | null;
    created_at: string;
    updated_at: string;
    ratings: SubmissionRating[];
    currentUserRating: SubmissionRating | null;
    artistHasReleases?: boolean;
}

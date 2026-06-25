import {SubmissionVote} from "../enums/SubmissionVote.ts";

export interface SubmissionRating {
    id: number;
    submission_id: number;
    user_id: number;
    vote: SubmissionVote;
    comment: string | null;
    created_at: string;
    updated_at: string;
}

import {PaymentStatus} from "../../../enums/PaymentStatus.ts";

export interface Payment {
    id: number;
    payout_batch_id: string;
    user_id: number;
    recipient_username?: string;
    recipient_artist_names?: string;
    amount: number;
    status: PaymentStatus;
    created_at: Date;
    updated_at: Date;
}

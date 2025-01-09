import {PaymentStatus} from "../../../enums/PaymentStatus.ts";

export interface PaymentRequest {
    id: number;
    user_id: number;
    amount: number;
    created_at: Date;
    updated_at: Date;
    status: PaymentStatus;
}
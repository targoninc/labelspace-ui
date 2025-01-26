export interface UserWebauthnCredential {
    id: number;
    user_id: number;
    public_key: string;
    counter: number;
    created_at: Date;
}
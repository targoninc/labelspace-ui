export interface PublicKey {
    id: string;
    key_id: string;
    public_key: string;
    algorithm: string;
    passkey_user_id: string;
    backed_up: boolean;
    name: string;
    transports: string;
    created_at: Date;
    updated_at: Date;
}
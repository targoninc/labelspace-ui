export interface UserTotp {
    id: number;
    user_id: number;
    secret: string;
    verified: boolean;
    name: string;
    created_at: Date;
    updated_at: Date;
}
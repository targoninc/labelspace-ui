export interface UserTotp {
    id: number;
    user_id: number;
    secret: string;
    verified: boolean;
    name: string;
}
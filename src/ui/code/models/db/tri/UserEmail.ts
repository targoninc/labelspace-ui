export interface UserEmail {
    user_id: number;
    email: string;
    primary: boolean;
    verification_code: string;
    verified: boolean;
    verified_at: Date|null;
}
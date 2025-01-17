export interface Artist {
    id: number;
    user_id: number|null;
    name: string;
    legal_name: string;
    country: string|null;
    state: string|null;
    has_logo: boolean;
}
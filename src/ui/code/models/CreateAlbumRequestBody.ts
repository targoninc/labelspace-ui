export interface CreateAlbumRequestBody {
    artists: string;
    title: string;
    description?: string;
    upc?: string;
    release_date?: Date;
    price?: number;
}
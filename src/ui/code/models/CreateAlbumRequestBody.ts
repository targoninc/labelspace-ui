export interface CreateAlbumRequestBody {
    title: string;
    description?: string;
    upc?: string;
    release_date?: Date;
    price?: number;
}
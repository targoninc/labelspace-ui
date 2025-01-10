export interface CreateAlbumRequestBody {
    id: number;
    title: string;
    upc?: string;
    release_date?: Date;
    price?: number;
}
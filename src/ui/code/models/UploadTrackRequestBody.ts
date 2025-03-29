export interface UploadTrackRequestBody {
    artists: string;
    title: string,
    isrc: string,
    genre: string,
    release_date: string,
    price: number,
    credits: string,
    length: number,
    link_spotify: string,
    link_youtube: string,
    link_soundcloud: string,
    link_applemusic: string,
    link_bandcamp: string,
    link_lyda: string,
}
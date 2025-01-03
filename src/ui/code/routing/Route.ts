export interface Route {
    path: string;
    title?: string;
    params?: string[];
    aliases?: string[];
    template: Function;
}
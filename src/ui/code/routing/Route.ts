export interface Route {
    path: string;
    title?: string;
    pathParams?: string[];
    aliases?: string[];
    template: Function;
}
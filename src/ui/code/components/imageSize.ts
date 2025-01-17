import {RequestableImageSize} from "./requestableImageSize.ts";

export enum ImageSize {
    adaptive = "1em",
    p50 = RequestableImageSize.s50,
    p100 = RequestableImageSize.s100,
    p200 = RequestableImageSize.s200,
    fill = "100%"
}
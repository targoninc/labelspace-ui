import {RequestableImageSize} from "./requestableImageSize.ts";

export enum ImageSize {
    adaptive = "1em",
    p50 = RequestableImageSize.s50,
    p100 = RequestableImageSize.s100,
    p500 = RequestableImageSize.s500,
    fill = "100%"
}
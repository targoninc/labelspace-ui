import {compute, Signal} from "../../fjsc/src/signals.ts";
import {Statistic} from "../models/Statistic.ts";
import {nullElement} from "../../fjsc/src/f2.ts";
import {MediaFileType} from "../enums/MediaFileType.ts";
import {Api} from "../api/api.ts";
import {RequestableImageSize} from "../enums/requestableImageSize.ts";

export function statisticsFromSignal(stats: Signal<Statistic[]>, template: Function) {
    return compute(s => {
        if (s.length === 0) {
            return nullElement();
        }

        const mapped = mapStatistics(s);
        return template(mapped.labels, mapped.values);
    }, stats);
}

export function mapStatistics(stats: Statistic[]) {
    return {
        labels: stats.map(s => s.label),
        values: stats.map(s => s.value)
    }
}

export function target<T = HTMLInputElement>(e: Event) {
    return e.target as T;
}

export function getImageUrl(type: MediaFileType, id: number, quality: RequestableImageSize) {
    return `${Api.baseUrl}/media/image?mediaFileType=${type}&id=${id}&quality=${quality}`;
}

export function getFileUrl(type: MediaFileType, id: number, fileName: string) {
    return `${Api.baseUrl}/media/file?mediaFileType=${type}&id=${id}&fileName=${fileName}`;
}
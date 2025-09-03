import {compute, Signal} from "@targoninc/jess";

export function currency(value: number|undefined|null|Signal<number>, currency = "USD") {
    if (value instanceof Signal) {
        return compute(v => formatCurrency(v, currency), value);
    }

    return formatCurrency(value, currency);
}

function formatCurrency(value: number|undefined|null, currency = "USD") {
    if (!value) {
        return "--";
    }

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency
    }).format(value);
}

export function linkPath(link: string) {
    const noProtocol = link.replace(/^https?:\/\//, "");
    const removeGetStrings = ["spotify", "lyda", "apple", "bandcamp", "soundcloud"];
    let noParams = noProtocol;
    if (removeGetStrings.some(s => noProtocol.includes(s))) {
        noParams = noProtocol.split("?")[0];
    }
    const firstSlash = noParams.indexOf("/");
    if (firstSlash > 0) {
        noParams = noParams.substring(firstSlash, noParams.length);
    }
    return noParams;
}

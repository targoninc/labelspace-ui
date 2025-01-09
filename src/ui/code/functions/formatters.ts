export function currency(value: number|undefined|null, currency = "USD") {
    if (!value) {
        return "--";
    }

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency
    }).format(value);
}
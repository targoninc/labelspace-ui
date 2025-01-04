export function currency(value: number, currency = "USD") {
    if (!value) {
        return "--";
    }

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency
    }).format(value);
}
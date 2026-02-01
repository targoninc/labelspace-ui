export function today() {
    return dayFrom(new Date());
}

export function dayFrom(date: Date|string|null) {
    if (!date) {
        return '';
    }

    if (date.constructor === String) {
        // If it's a date-only string like "2023-01-01", 
        // new Date("2023-01-01") is already UTC in most browsers, 
        // but it's safer to ensure it.
        date = new Date(date);
    }

    // toISOString() always returns UTC
    return (date as Date).toISOString().split('T')[0];
}

export function toUTCDate(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 
        date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
}
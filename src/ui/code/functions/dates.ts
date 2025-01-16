export function today() {
    return dayFrom(new Date());
}

export function dayFrom(date: Date|string|null) {
    if (!date) {
        return '';
    }

    if (date.constructor === String) {
        date = new Date(date);
    }

    return (date as Date).toISOString().split('T')[0];
}
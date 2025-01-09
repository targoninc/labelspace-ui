export function addModal(node: HTMLElement | SVGElement) {
    const modals = document.querySelector("#modals");
    if (!modals) {
        throw new Error("Modals container not found");
    }
    modals.appendChild(node);
}

export function removeLastModal() {
    const modals = document.querySelector("#modals");
    if (!modals) {
        throw new Error("Modals container not found");
    }
    modals.lastElementChild?.remove();
}
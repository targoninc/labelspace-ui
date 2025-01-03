import {NotificationType} from "../enums/NotificationType.ts";
import {Generics} from "../components/generics.ts";

export function notify(text: string, type = NotificationType.info, time = 7000) {
    const notifications = document.querySelector(".notifications");
    const notification = Generics.notification(type, text);
    const previousNotifications = document.querySelectorAll(".notification") as NodeListOf<HTMLElement>;
    if (previousNotifications) {
        const lastNotification = previousNotifications[previousNotifications.length - 1];
        if (lastNotification) {
            notification.style.top = lastNotification.offsetTop + lastNotification.clientHeight + "px";
        }
    }
    notifications?.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, time);
}

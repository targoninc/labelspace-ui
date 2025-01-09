import {Generics} from "./generics.ts";
import {currentUser} from "../state.ts";
import {Api} from "../api/api.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {create, ifjs} from "../../fjsc/src/f2.ts";
import {currency} from "../functions/formatters.ts";
import {RoyaltyInfo} from "../models/RoyaltyInfo.ts";
import {FJSC} from "../../fjsc";
import {Modals} from "./modals.ts";
import {Payment} from "../models/db/finance/Payment.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";

export class Payments {
    static page() {
        if (!currentUser.value) {
            return Generics.pageFrame(
                Generics.heading(2, "Access denied"),
            );
        }

        const payments = signal<any[]>([]);
        const loading = signal(false);
        const load = () => {
            Api.getPayments()
                .then(p => payments.value = p)
                .finally(() => loading.value = false);
        }
        load();

        return Generics.pageFrame(
            Generics.heading(2, "Payment history"),
            create("div")
                .classes("flex", "center-items")
                .children(
                    FJSC.button({
                        text: "Refresh",
                        icon: { icon: "refresh" },
                        disabled: loading,
                        onclick: load,
                        classes: ["positive"]
                    }),
                    ifjs(loading, Generics.loading()),
                ).build(),
            Generics.table(
                ["Amount", "Status", "Date"],
                payments,
                (payment: Payment) => create("tr")
                    .classes("status-tr", payment.status)
                    .children(
                        create("td")
                            .text(currency(payment.amount))
                            .build(),
                        create("td")
                            .children(
                                create("span")
                                    .classes("status")
                                    .text(payment.status)
                                    .build(),
                            ).build(),
                        create("td")
                            .text(new Date(payment.created_at).toLocaleString())
                            .build(),
                    ).build()
            ),
        );
    }

    static available() {
        const info = signal<RoyaltyInfo|null>(null);
        const total = compute(a => "Total earned " + currency(a?.total), info);
        const paidOut = compute(a => "Paid out " + currency(a?.paidOut), info);
        const availableUsd = compute(a => currency(a?.available), info);
        const available = compute(a => "Available " + currency(a?.available), info);

        const loading = signal(true);
        Api.getAvailablePaymentAmount()
            .then(a => info.value = a)
            .finally(() => loading.value = false);
        const requestLoading = signal(false);

        return Generics.container(1, [
            ifjs(total, Generics.heading(3, total)),
            ifjs(paidOut, Generics.heading(3, paidOut)),
            ifjs(available, create("div")
                .classes("flex", "center-items")
                .children(
                    Generics.heading(2, available),
                    FJSC.button({
                        text: "Request payment",
                        icon: { icon: "wallet" },
                        classes: ["positive"],
                        disabled: requestLoading,
                        onclick: () => {
                            Modals.confirm(() => {
                                requestLoading.value = true;
                                Api.requestPayment().then(() => {
                                    loading.value = true;
                                    notify("Payment successfully requested!", NotificationType.success);
                                    Api.getAvailablePaymentAmount()
                                        .then(a => info.value = a)
                                        .finally(() => loading.value = false);
                                }).finally(() => {
                                    requestLoading.value = false;
                                });
                            }, "Confirm request", compute(a => `Are you sure you want to request a payment for ${a} USD?`, availableUsd))
                        }
                    }),
                    ifjs(requestLoading, Generics.loading()),
                ).build()),
        ]);
    }
}
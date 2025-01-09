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
import {PaymentRequest} from "../models/db/finance/PaymentRequest.ts";

export class Payments {
    static page() {
        if (!currentUser.value) {
            return Generics.pageFrame(
                Generics.heading(2, "Access denied"),
            );
        }

        const payments = signal<any[]>([]);
        const requests = signal<any[]>([]);
        const loading = signal(false);
        Api.getPayments()
            .then(p => {
                payments.value = p.payments;
                requests.value = p.requests;
            })
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            Generics.heading(2, "Payments"),
            ifjs(loading, Generics.loading()),
            Generics.table(
                ["Status", "Requested date", "Last update", "Amount"],
                requests,
                (request: PaymentRequest) => Generics.tableRow(
                    request.status,
                    new Date(request.created_at).toLocaleString(),
                    new Date(request.updated_at).toLocaleString(),
                    currency(request.amount)
                )
            ),
            Generics.table(
                ["Date", "Amount"],
                payments,
                (payment: Payment) => Generics.tableRow(
                    new Date(payment.date).toLocaleString(),
                    currency(payment.amount)
                )
            ),
        );
    }

    static available() {
        const info = signal<RoyaltyInfo|null>(null);
        const total = compute(a => "Total " + currency(a?.total), info);
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
                                    Api.getAvailablePaymentAmount()
                                        .then(a => info.value = a)
                                        .finally(() => loading.value = false);
                                }).finally(() => {
                                    requestLoading.value = false;
                                });
                            }, "Confirm request", `Are you sure you want to request a payment for ${availableUsd.value}?`)
                        }
                    }),
                    ifjs(requestLoading, Generics.loading()),
                ).build()),
        ]);
    }
}
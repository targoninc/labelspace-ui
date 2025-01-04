import {Generics} from "./generics.ts";
import {currentUser} from "../state.ts";
import {Api} from "../api/api.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {ifjs} from "../../fjsc/src/f2.ts";
import {currency} from "../functions/formatters.ts";
import {RoyaltyInfo} from "../models/RoyaltyInfo.ts";

export class Payments {
    static page() {
        if (!currentUser.value) {
            return Generics.pageFrame(
                Generics.heading(2, "Access denied"),
            );
        }

        const payments = signal<any[]>([]);
        const loading = signal(false);
        Api.getPayments()
            .then(p => payments.value = p)
            .finally(() => loading.value = false);

        return Generics.pageFrame(
            Generics.heading(2, "Payments"),
            ifjs(loading, Generics.loading()),
            Generics.table(
                ["Date", "Amount"],
                payments,
                (payment: any) => Generics.tableRow(
                    new Date(payment.date).toLocaleString(),
                    currency(payment.amount)
                )
            )
        );
    }

    static available() {
        const info = signal<RoyaltyInfo|null>(null);
        const total = compute(a => "Total " + currency(a?.total), info);
        const paidOut = compute(a => "Paid out " + currency(a?.paidOut), info);
        const available = compute(a => "Available " + currency(a?.available), info);

        const loading = signal(true);
        Api.getAvailablePaymentAmount()
            .then(a => info.value = a)
            .finally(() => loading.value = false);

        return Generics.container(1, [
            ifjs(total, Generics.heading(3, total)),
            ifjs(paidOut, Generics.heading(3, paidOut)),
            ifjs(available, Generics.heading(2, available)),
        ]);
    }
}
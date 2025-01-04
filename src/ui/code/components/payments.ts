import {Generics} from "./generics.ts";
import {currentUser} from "../state.ts";
import {Api} from "../api/api.ts";
import {signal} from "../../fjsc/src/signals.ts";
import {ifjs} from "../../fjsc/src/f2.ts";

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
                    payment.amount
                )
            )
        );
    }
}
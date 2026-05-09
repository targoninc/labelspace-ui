import {Generics, horizontal, vertical} from "./generic/generics.ts";
import {currentUser} from "../state.ts";
import {Api} from "../api/api.ts";
import {currency} from "../functions/formatters.ts";
import {RoyaltyInfo} from "../models/RoyaltyInfo.ts";
import {Modals} from "./modals.ts";
import {Payment} from "../models/db/finance/Payment.ts";
import {notify} from "../functions/notifications.ts";
import {NotificationType} from "../enums/NotificationType.ts";
import {compute, create, InputType, signal, when} from "@targoninc/jess";
import {button, input} from "@targoninc/jess-components";
import {navigate} from "../routing/Router.ts";
import {PaymentStatus} from "../enums/PaymentStatus.ts";
import {Permissions} from "../enums/Permissions.ts";

export class Payments {
    static page() {
        if (!currentUser.value) {
            return Generics.pageFrame(
                Generics.heading(2, "Access denied"),
            );
        }

        const payments = signal<Payment[]>([]);
        const loading = signal(false);
        const canViewAllPayments = currentUser.value.permissions?.some(p => p.name === Permissions.canViewLogs) ?? false;
        const userQuery = signal("");
        const status = signal("all");
        const startTime = signal("");
        const endTime = signal("");
        const minAmount = signal("");
        const maxAmount = signal("");
        const invalidTimeRange = compute((start, end) => !!start && !!end && new Date(start) > new Date(end), startTime, endTime);
        const invalidAmountValue = compute((min, max) =>
            (min.trim() !== "" && Number.isNaN(Number(min))) ||
            (max.trim() !== "" && Number.isNaN(Number(max))),
            minAmount,
            maxAmount
        );
        const invalidAmountRange = compute((min, max) => min !== "" && max !== "" && Number(min) > Number(max), minAmount, maxAmount);
        const noResults = compute((entries, isLoading) => entries.length === 0 && !isLoading, payments, loading);
        const statusOptions = [
            {id: "all", name: "All statuses"},
            {id: PaymentStatus.requested, name: "Requested"},
            {id: PaymentStatus.processing, name: "Processing"},
            {id: PaymentStatus.paid, name: "Paid"},
            {id: PaymentStatus.failed, name: "Failed"},
        ];
        let reloadQueued = false;
        const statusSelect = create("select")
            .classes("jess", "log-filter-select")
            .children(
                ...statusOptions.map(option => create("option")
                    .attributes("value", option.id)
                    .text(option.name)
                    .build())
            ).build() as HTMLSelectElement;
        statusSelect.value = status.value;
        statusSelect.onchange = () => {
            status.value = statusSelect.value;
            load();
        };

        const load = () => {
            if (invalidTimeRange.value || invalidAmountValue.value || invalidAmountRange.value) {
                return;
            }

            if (loading.value) {
                reloadQueued = true;
                return;
            }

            loading.value = true;
            reloadQueued = false;
            Api.getPayments({
                userQuery: canViewAllPayments ? userQuery.value.trim() || undefined : undefined,
                status: status.value === "all" ? undefined : status.value as PaymentStatus,
                startTime: startTime.value ? new Date(startTime.value).toISOString() : undefined,
                endTime: endTime.value ? new Date(endTime.value).toISOString() : undefined,
                minAmount: minAmount.value.trim() === "" ? undefined : Number(minAmount.value),
                maxAmount: maxAmount.value.trim() === "" ? undefined : Number(maxAmount.value),
            })
                .then(p => payments.value = p ?? [])
                .catch((error: Error) => {
                    notify(error.message ?? "Failed to load payments.", NotificationType.error);
                })
                .finally(() => {
                    loading.value = false;
                    if (reloadQueued) {
                        load();
                    }
                });
        };

        const clearFilters = () => {
            userQuery.value = "";
            status.value = "all";
            statusSelect.value = "all";
            startTime.value = "";
            endTime.value = "";
            minAmount.value = "";
            maxAmount.value = "";
            load();
        };

        load();

        return Generics.pageFrame(
            create("div")
                .classes("flex-v", "logs-page")
                .children(
                    Generics.heading(2, "Payment history"),
                    create("div")
                        .classes("container", "layer-2", "border", "log-filters")
                        .children(
                            ...(canViewAllPayments ? [
                                create("div")
                                    .classes("log-filter-field")
                                    .children(
                                        input({
                                            type: InputType.text,
                                            name: "userQuery",
                                            label: "Artist",
                                            placeholder: "Filter by artist or username",
                                            value: userQuery,
                                            onchange: (value) => {
                                                userQuery.value = value;
                                                load();
                                            }
                                        })
                                    ).build()
                            ] : []),
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    create("label")
                                        .classes("jess", "flex-v", "log-filter-label")
                                        .children(
                                            create("span")
                                                .text("Status")
                                                .build(),
                                            statusSelect
                                        ).build()
                                ).build(),
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    input({
                                        type: InputType.text,
                                        name: "minAmount",
                                        label: "Min amount",
                                        placeholder: "0.00",
                                        value: minAmount,
                                        onchange: (value) => {
                                            minAmount.value = value;
                                            load();
                                        }
                                    })
                                ).build(),
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    input({
                                        type: InputType.text,
                                        name: "maxAmount",
                                        label: "Max amount",
                                        placeholder: "0.00",
                                        value: maxAmount,
                                        onchange: (value) => {
                                            maxAmount.value = value;
                                            load();
                                        }
                                    })
                                ).build(),
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    input({
                                        type: InputType.datetimelocal,
                                        name: "startTime",
                                        label: "From",
                                        value: startTime,
                                        onchange: (value) => {
                                            startTime.value = value;
                                            load();
                                        }
                                    })
                                ).build(),
                            create("div")
                                .classes("log-filter-field")
                                .children(
                                    input({
                                        type: InputType.datetimelocal,
                                        name: "endTime",
                                        label: "To",
                                        value: endTime,
                                        onchange: (value) => {
                                            endTime.value = value;
                                            load();
                                        }
                                    })
                                ).build(),
                            create("div")
                                .classes("flex", "center-items", "log-filter-actions")
                                .children(
                                    button({
                                        text: "Clear",
                                        icon: { icon: "clear" },
                                        disabled: loading,
                                        onclick: clearFilters,
                                    }),
                                    when(loading, Generics.loading()),
                                ).build(),
                        ).build(),
                    when(invalidTimeRange, create("span")
                        .classes("error")
                        .text("Start time must be before end time.")
                        .build()),
                    when(invalidAmountValue, create("span")
                        .classes("error")
                        .text("Amounts must be valid numbers.")
                        .build()),
                    when(invalidAmountRange, create("span")
                        .classes("error")
                        .text("Minimum amount must be less than or equal to maximum amount.")
                        .build()),
                    when(noResults, create("span")
                        .text("No payments found for the current filters.")
                        .build()),
                    Generics.table(
                        canViewAllPayments ? ["Artist", "Amount", "Status", "Date"] : ["Amount", "Status", "Date"],
                        payments,
                        (payment: Payment) => {
                            const recipientName = payment.recipient_artist_names ?? payment.recipient_username ?? "";
                            return create("tr")
                                .classes("status-tr", payment.status)
                                .children(
                                    ...(canViewAllPayments ? [
                                        create("td")
                                            .text(recipientName)
                                            .build()
                                    ] : []),
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
                                        .text(new Date(payment.created_at).toLocaleString(undefined, {timeZone: 'UTC'}))
                                        .build(),
                                ).build();
                        }
                    ),
                ).build(),
        );
    }

    static available() {
        const info = signal<RoyaltyInfo|null>(null);
        const total = compute(a => "Total earned " + currency(a?.total), info);
        const paidOut = compute(a => "Paid out " + currency(a?.paidOut), info);
        const availableUsd = compute(a => currency(a?.available), info);
        const available = compute(a => "Available " + currency(a?.available), info);
        const paypalMailSetting = compute(u => u?.settings?.find(s => s.key === 'paypalMail'), currentUser);
        const paypalMail = compute(s => s?.value, paypalMailSetting);
        const hasPaypalMail = compute(m => !!m, paypalMail);
        const payable = compute((i, h) => i?.available && i?.available > 0 && h, info, hasPaypalMail);

        const loading = signal(true);
        const load = () => {
            loading.value = true;
            Api.getAvailablePaymentAmount()
                .then(a => info.value = a)
                .finally(() => loading.value = false);
        }
        load();
        const requestLoading = signal(false);

        return Generics.container(0, [
            when(total, Generics.heading(3, total, true)),
            when(paidOut, Generics.heading(3, paidOut, true)),
            when(available, create("div")
                .classes("flex", "center-items")
                .children(
                    Generics.heading(2, available, true),
                    when(payable, button({
                        text: "Request payment",
                        icon: { icon: "wallet" },
                        classes: ["positive"],
                        disabled: requestLoading,
                        onclick: () => {
                            Modals.confirm(() => {
                                requestLoading.value = true;
                                Api.requestPayment().then(() => {
                                    notify("Payment successfully requested!", NotificationType.success);
                                    load();
                                }).finally(() => {
                                    requestLoading.value = false;
                                });
                            }, "Confirm request", compute(a => `Are you sure you want to request a payment for ${a} USD?`, availableUsd))
                        }
                    })),
                    when(hasPaypalMail, horizontal(
                        create("span")
                            .classes("error")
                            .text("You must set a paypal mail address to request a payment"),
                        button({
                            text: "Go to settings",
                            icon: { icon: "settings" },
                            onclick: () => navigate("profile")
                        })
                    ).classes("align-children").build(), true),
                    when(requestLoading, Generics.loading()),
                ).build()),
        ]);
    }
}

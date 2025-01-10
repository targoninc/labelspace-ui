import {Chart, registerables} from "chart.js";
import {BoxPlotChart} from "@sgratzl/chartjs-chart-boxplot";
import {create, HtmlPropertyValue, ifjs} from "../../fjsc/src/f2.ts";
import {CustomChartOptions} from "../enums/CustomChartOptions.ts";
import {Colors} from "../enums/Colors.ts";
import {Statistic} from "../models/Statistic.ts";
import {compute, signal} from "../../fjsc/src/signals.ts";
import {Api} from "../api/api.ts";
import {statisticsFromSignal} from "../functions/templates.ts";
import {currentUser} from "../state.ts";
import {Generics} from "./generics.ts";
import {FJSC} from "../../fjsc";
import {Payments} from "./payments.ts";
import {ExtendedChartOptions} from "../models/ExtendedChartOptions.ts";
import {Permissions} from "../enums/Permissions.ts";
import {Migration} from "./migration.ts";

Chart.register(...registerables);

const usedColors = Colors.themedList;

export class Statistics {
    static donutChart(labels, values, valueTitle, title, id, colors = usedColors) {
        const ctx = create("canvas")
            .classes("chart")
            .id(id)
            .build();

        const data = {
            labels: labels,
            datasets: [{
                label: valueTitle,
                data: values,
                backgroundColor: colors,
                hoverOffset: 4
            }]
        };

        const config = {
            type: "doughnut",
            data: data,
            options: {
                ...CustomChartOptions.defaultOptions(),
                ...CustomChartOptions.noGridOptions
            }
        };

        new Chart(ctx, config);

        return create("div")
            .classes("chart-container", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                ctx,
            ).build();
    }

    static barChart(labels, values, valueTitle, title, id, colors = usedColors, opts: ExtendedChartOptions = {}) {
        const ctx = create("canvas")
            .classes("chart")
            .id(id)
            .build();

        const data = {
            labels: labels,
            datasets: [{
                label: valueTitle,
                data: values,
                backgroundColor: colors,
                hoverOffset: 4
            }]
        };

        const config = {
            type: "bar",
            data: data,
            options: CustomChartOptions.defaultOptions(opts)
        };

        new Chart(ctx, config);

        return create("div")
            .classes("chart-container-full", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                ctx,
            ).build();
    }

    static boxPlotChart(values, title, id, colors = usedColors) {
        const ctx = create("canvas")
            .classes("chart")
            .id(id)
            .build();

        const data = {
            labels: [title],
            datasets: [{
                label: title,
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                hoverOffset: 4
            }]
        };

        const config = {
            type: "boxplot",
            data: data,
            options: CustomChartOptions.defaultOptions()
        };

        new BoxPlotChart(ctx, config);

        return create("div")
            .classes("chart-container-vertical", "flex-v")
            .children(
                ctx,
            ).build();
    }

    static noData(title: HtmlPropertyValue) {
        return create("div")
            .classes("chart-container", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                create("div")
                    .classes("flex", "align-center")
                    .children(
                        create("span")
                            .text("No data yet")
                            .build()
                    ).build(),
            ).build();
    }

    static royaltiesByMonthChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by month");
        }
        return Statistics.barChart(labels, values, "Royalties", "Royalties by month", "royaltiesByMonthChart", ["var(--black)"]);
    }

    static royaltiesByYearChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by year");
        }
        return Statistics.barChart(labels, values, "Royalties", "Royalties by year", "royaltiesByYearChart", ["var(--black)"]);
    }

    static royaltiesByTrackChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by track");
        }
        return Statistics.barChart(labels, values, "Royalties", "Royalties by track", "royaltiesByTrackChart", ["var(--black)"]);
    }

    static royaltiesByArtistChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by artist");
        }
        return Statistics.barChart(labels, values, "Royalties", "Royalties by artist", "royaltiesByArtistChart", ["var(--black)"]);
    }

    static page() {
        const hasImportPermission = compute(u => u?.permissions?.some(p => p.name === Permissions.importData), currentUser);

        return Generics.pageFrame(
            create("div")
                .classes("flex-v")
                .children(
                    ifjs(hasImportPermission, Migration.dataImport()),
                    Payments.available(),
                    Statistics.stats()
                ).build()
        );
    }

    static stats() {
        if (!currentUser.value) {
            return Generics.heading(2, "Not logged in");
        }

        return create("div")
            .classes("flex")
            .children(
                Statistics.singleStatistic("Royalties by month", Api.getRoyaltiesByMonth, Statistics.royaltiesByMonthChart, "Royalty reporting is delayed by roughly 3 months. This is due to the fact that not all services report in time."),
                Statistics.singleStatistic("Royalties by year", Api.getRoyaltiesByYear, Statistics.royaltiesByYearChart),
                Statistics.singleStatistic("Royalties by track", Api.getRoyaltiesByTrack, Statistics.royaltiesByTrackChart),
                Statistics.singleStatistic("Royalties by artist", Api.getRoyaltiesByArtist, Statistics.royaltiesByArtistChart),
            ).build();
    }

    static singleStatistic(title: string, apiFunction: Function, template: Function, info: string|null = null) {
        const stats = signal<Statistic[]>([]);
        const loading = signal(false);
        const loadStatistic = () => {
            loading.value = true;
            apiFunction().then(r => stats.value = r)
                .finally(() => loading.value = false);
        };
        loadStatistic();

        return create("div")
            .classes("flex-v", "statistic")
            .children(
                create("div")
                    .classes("flex", "center-items")
                    .children(
                        create("h1")
                            .text(title)
                            .build(),
                        ifjs(loading, FJSC.button({
                            icon: { icon: "refresh" },
                            onclick: loadStatistic
                        }), true),
                        ifjs(info, FJSC.icon({
                            icon: "info",
                            classes: ["question-cursor"],
                            title: info,
                        })),
                        ifjs(loading, Generics.loading()),
                    ).build(),
                statisticsFromSignal(stats, template)
            ).build();
    }
}
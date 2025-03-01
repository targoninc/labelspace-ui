import {Chart, registerables} from "chart.js";
import {BoxPlotChart} from "@sgratzl/chartjs-chart-boxplot";
import {create, HtmlPropertyValue, ifjs} from "../../fjsc/src/f2.ts";
import {CustomChartOptions} from "../enums/CustomChartOptions.ts";
import {Colors} from "../enums/Colors.ts";
import {Statistic} from "../models/Statistic.ts";
import {compute, Signal, signal} from "../../fjsc/src/signals.ts";
import {Api} from "../api/api.ts";
import {statisticsFromSignal} from "../functions/templates.ts";
import {currentUser} from "../state.ts";
import {Generics} from "./generic/generics.ts";
import {FJSC} from "../../fjsc";
import {Payments} from "./payments.ts";
import {ExtendedChartOptions} from "../models/ExtendedChartOptions.ts";
import {Permissions} from "../enums/Permissions.ts";
import {Migration} from "./migration.ts";
import Globe from 'globe.gl';
import * as d3 from "d3";

Chart.register(...registerables);

const usedColors = Colors.themedList;

const response = await (await fetch("/data/ne_110m_admin_0_countries.geojson")).json();
const worldJson = response;

export class Statistics {
    static donutChart(labels: string[], values: number[], valueTitle: string, title: string, id: string, colors = usedColors) {
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

    static barChart(labels: string[], values: number[], valueTitle: string, title: string, id: string, colors = usedColors, opts: ExtendedChartOptions = {}) {
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

    static boxPlotChart(values: number[], title: string, id: string, colors = usedColors) {
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
        return Statistics.barChart(labels, values, "Royalties", "Royalties by month", "royaltiesByMonthChart");
    }

    static royaltiesByYearChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by year");
        }
        return Statistics.barChart(labels, values, "Royalties", "Royalties by year", "royaltiesByYearChart");
    }

    static royaltiesByTrackChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by track");
        }
        return Statistics.barChart(labels, values, "Royalties", "Royalties by track", "royaltiesByTrackChart");
    }

    static royaltiesByArtistChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by artist");
        }
        return Statistics.barChart(labels, values, "Royalties", "Royalties by artist", "royaltiesByArtistChart");
    }

    static royaltiesByServiceChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by service");
        }
        return Statistics.barChart(labels, values, "Royalties", "Royalties by service", "royaltiesByServiceChart");
    }

    static royaltiesByCountryChart(labels: string[], values: number[]) {
        if (labels.length === 0) {
            return Statistics.noData("Royalties by country");
        }
        return Statistics.globeChart(labels, values, "Royalties", "Royalties by country", "royaltiesByCountryChart");
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
                Statistics.singleStatistic("Royalties by service", Api.getRoyaltiesByService, Statistics.royaltiesByServiceChart),
                Statistics.singleStatistic("Royalties by country", Api.getRoyaltiesByCountry, Statistics.royaltiesByCountryChart),
            ).build();
    }

    static singleStatistic(title: string, apiFunction: Function, template: Function, info: string|null = null, options: Signal<any> = signal({})) {
        const stats = signal<Statistic[]>([]);
        const loading = signal(false);
        const loadStatistic = () => {
            loading.value = true;
            apiFunction(options.value).then((r: Statistic[]) => stats.value = r)
                .finally(() => loading.value = false);
        };
        loadStatistic();
        options.subscribe(loadStatistic);

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

    /**
     *
     * @param labels A list of 2 or 3-digit country codes.
     * @param values A list of numeric values corresponding to the labels.
     * @param valueTitle
     * @param title
     * @param id
     * @private
     */
    private static globeChart(labels: string[], values: number[], valueTitle: string, title: string, id: string) {
        const globeContainer = create("div")
            .classes("globe-container")
            .build() as HTMLDivElement;

        const globe = new Globe(globeContainer, {
            animateIn: true,
            waitForGlobeReady: false
        }).height(300)
            .width(300)
            .backgroundColor("rgba(0, 0, 0, 0)")
            .enablePointerInteraction(false);

        // Map the provided `labels` and `values` into a dictionary
        const valueMap: Record<string, number> = {};
        labels.forEach((label, index) => {
            valueMap[label.toUpperCase()] = values[index];
        });

        // Normalize the values (values range from 0 to 1)
        const maxValue = Math.max(...values);
        const colorScale = d3.scaleLinear<string>()
            .domain([0, maxValue]) // [0 -> minimal value, maxValue -> maximal value]
            .range(["rgba(0, 255, 0, 0)", "rgba(0, 255, 0, 1)"]); // Green with transparency for lower values

        // Load GeoJSON and apply the color scale to countries
        globe
            .polygonsData(worldJson.features)
            .polygonCapColor((feature: any) => {
                const countryCode = feature.properties.ISO_A3; // Assuming GeoJSON has ISO_A2 country codes
                const value = valueMap[countryCode] || 0; // Default to 0 if no value is provided
                return colorScale(value); // Use color scaling based on country's value
            })
            .polygonSideColor(() => "rgba(0, 0, 0, 0.1)") // Side color of the polygons
            .polygonStrokeColor(() => "#111") // Border color for countries
            .polygonsTransitionDuration(500); // Smooth value transitions

        // Return DOM structure
        return create("div")
            .classes("chart-container", "flex-v")
            .children(
                create("h4")
                    .classes("chart-title")
                    .text(title)
                    .build(),
                globeContainer,
            ).build();
    }
}
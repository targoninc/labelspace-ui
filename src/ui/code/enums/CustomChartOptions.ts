import {ExtendedChartOptions} from "../models/ExtendedChartOptions.ts";
import {ChartOptions} from "chart.js";

export class CustomChartOptions {
    static defaultOptions = (opts: ExtendedChartOptions = {}): ChartOptions<any> => ({
        plugins: {
            customCanvasBackgroundColor: {
                color: "transparent",
            }
        },
        animation: {
            duration: 0
        },
        hover: {
            animationDuration: 0,
        },
        scales: {
            x: {
                type: "category"
            },
            y: {
                type: opts.scales?.y?.logarithmic ? "logarithmic" : "linear",
            }
        },
        responsiveAnimationDuration: 0,
        devicePixelRatio: 2,
    });

    static noGridOptions = {
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    display: false
                },
                border: {
                    display: false
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    display: false
                },
                border: {
                    display: false
                }
            }
        }
    };
}
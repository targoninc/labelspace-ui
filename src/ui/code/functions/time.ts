import {signal} from "@targoninc/jess";

export class Time {
    static localDate(time: number|string|Date) {
        return new Date(time).toLocaleDateString(undefined, { timeZone: 'UTC' });
    }

    static localDateTime(time: number|string|Date) {
        return new Date(time).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
        });
    }

    static adjust(time: number|string|Date): Date {
        return new Date(time);
    }

    static ago(time: number|string|Date, useShort = false): string {
        time = Time.adjust(time);
        switch (typeof time) {
        case "number":
            break;
        case "string":
            time = +new Date(time);
            break;
        case "object":
            if (time.constructor === Date) time = time.getTime();
            break;
        default:
            time = +new Date();
        }
        const time_formats = [
            [60, "seconds", 1], // 60
            [120, "1 minute ago", "1 minute from now"], // 60*2
            [3600, "minutes", 60], // 60*60, 60
            [7200, "1 hour ago", "1 hour from now"], // 60*60*2
            [86400, "hours", 3600], // 60*60*24, 60*60
            [172800, "Yesterday", "Tomorrow"], // 60*60*24*2
            [604800, "days", 86400], // 60*60*24*7, 60*60*24
            [1209600, "Last week", "Next week"], // 60*60*24*7*4*2
            [2419200, "weeks", 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, "Last month", "Next month"], // 60*60*24*7*4*2
            [29030400, "months", 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, "Last year", "Next year"], // 60*60*24*7*4*12*2
            [2903040000, "years", 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, "Last century", "Next century"], // 60*60*24*7*4*12*100*2
            [58060800000, "centuries", 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        const time_formats_short = [
            [60, "s", 1], // 60
            [120, "1m ago", "1m until"], // 60*2
            [3600, "m", 60], // 60*60, 60
            [7200, "1h ago", "1h until"], // 60*60*2
            [86400, "h", 3600], // 60*60*24, 60*60
            [172800, "1d ago", "1d until"], // 60*60*24*2
            [604800, "d", 86400], // 60*60*24*7, 60*60*24
            [1209600, "1w ago", "1w until"], // 60*60*24*7*4*2
            [2419200, "w", 604800], // 60*60*24*7*4, 60*60*24*7
            [4838400, "1mo ago", "1mo until"], // 60*60*24*7*4*2
            [29030400, "mo", 2419200], // 60*60*24*7*4*12, 60*60*24*7*4
            [58060800, "1y ago", "1y until"], // 60*60*24*7*4*12*2
            [2903040000, "y", 29030400], // 60*60*24*7*4*12*100, 60*60*24*7*4*12
            [5806080000, "1c ago", "1c until"], // 60*60*24*7*4*12*100*2
            [58060800000, "c", 2903040000] // 60*60*24*7*4*12*100*20, 60*60*24*7*4*12*100
        ];
        let seconds = (+new Date() - <number>time) / 1000,
            token = "ago",
            list_choice = 1;

        if (seconds === 0) {
            return "Just now";
        }
        if (seconds < 0) {
            seconds = Math.abs(seconds);
            token = "from now";
            list_choice = 2;
        }
        let i = 0, format;
        const used_formats = useShort ? time_formats_short : time_formats;
        while ((format = used_formats[i++])) {
            if (seconds < (format[0] as number)) {
                if (typeof format[2] == "string")
                    return format[list_choice] as string;
                else
                    return Math.floor(seconds / format[2]) + (useShort ? "" : " ") + format[1] + " " + token;
            }
        }
        return time.toString();
    }

    static #shouldUpdateInSeconds(time: string, short = false) {
        return time.includes("seconds") || (short && time.includes("s")) || time === "Just now";
    }

    static agoUpdating(time: number|string|Date, useShort = false) {
        const state = signal(Time.ago(time, useShort));
        const update = () => {
            state.value = Time.ago(time, useShort);
            const updateInterval = Time.#shouldUpdateInSeconds(state.value, useShort) ? 1000 : 60000;
            if (state.value.includes("hours")) {
                return;
            }
            setTimeout(update, updateInterval);
        };
        update();

        return state;
    }

    static agoNumeric(time: number|string|Date) {
        const targetTime = Time.adjust(time).getTime();
        const seconds = Math.round((targetTime - Date.now()) / 1000);
        const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "always" });
        const units: [Intl.RelativeTimeFormatUnit, number][] = [
            ["year", 60 * 60 * 24 * 365],
            ["month", 60 * 60 * 24 * 30],
            ["week", 60 * 60 * 24 * 7],
            ["day", 60 * 60 * 24],
            ["hour", 60 * 60],
            ["minute", 60],
            ["second", 1],
        ];

        for (const [unit, unitSeconds] of units) {
            if (Math.abs(seconds) >= unitSeconds || unit === "second") {
                return formatter.format(Math.round(seconds / unitSeconds), unit);
            }
        }

        return formatter.format(seconds, "second");
    }

    static agoNumericUpdating(time: number|string|Date) {
        const state = signal(Time.agoNumeric(time));
        const update = () => {
            const seconds = Math.abs(Time.adjust(time).getTime() - Date.now()) / 1000;
            state.value = Time.agoNumeric(time);
            setTimeout(update, seconds < 60 ? 1000 : 60000);
        };
        update();

        return state;
    }

    static format(time: number): string {
        let minutes = Math.floor(time / 60);
        let seconds = Math.floor(time - minutes * 60);
        return minutes + ":" + seconds.toString().padStart(2, "0");
    }

    static toTimeString(time: number|string|Date) {
        return new Date(time).toISOString().split("T")[1].split(".")[0];
    }

    static toTimeFromSeconds(seconds: number) {
        const minutes = Math.floor(seconds / 60);
        const secondsLeft = seconds - minutes * 60;
        return minutes + ":" + secondsLeft.toString().padStart(2, "0");
    }
}

import {Signal} from "../../fjsc/src/signals.ts";
import {FJSC} from "../../fjsc";
import {InputType} from "../../fjsc/src/Types.ts";

export class Inputs {
    static password(password: Signal<string>, placeholder: string = "Password", name: string = "password") {
        return FJSC.input<string>({
            type: InputType.password,
            name,
            label: placeholder,
            placeholder,
            value: password,
            attributes: ["autocomplete", name],
            onchange: (v) => {
                password.value = v;
            }
        });
    }

    static text(value: Signal<string>, label: string, name: string) {
        return FJSC.input<string>({
            type: InputType.text,
            name,
            label,
            value,
            attributes: ["autocomplete", name],
            onchange: (v) => {
                value.value = v;
            }
        });
    }
}
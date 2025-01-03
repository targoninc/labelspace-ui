import {signal} from "../../fjsc/src/signals.ts";
import {User} from "../models/User.ts";
import {Generics} from "./generics.ts";

export class Users {
    static listPage() {
        const users = signal<User[]>([]);

        return Generics.pageFrame(
            Generics.list(
                users,
                (user: User) => Generics.user(user)
            )
        )
    }
}
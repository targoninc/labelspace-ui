import {currentUser} from "./code/state.ts";
import {Api} from "./code/api/api.ts";
import {startRouter} from "./code/routing/Router.ts";

currentUser.value = await Api.getUser();

startRouter();
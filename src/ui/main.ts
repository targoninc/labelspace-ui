import {currentUser, router} from "./code/state.ts";
import {Api} from "./code/api/api.ts";
import {startRouter} from "./code/routing/Router.ts";
import {routes} from "./code/routing/routes.ts";

currentUser.value = await Api.getUser();

startRouter();
router.value!.setRoutes(routes);

import {currentUser, router} from "./code/state.ts";
import {Api} from "./code/api/api.ts";
import {startRouter} from "./code/routing/Router.ts";
import {routes} from "./code/routing/routes.ts";

Api.getUser().then(user => {
    currentUser.value = user;
});

startRouter();
router.value!.setRoutes(routes);

import {currentUser, router, userLoading} from "./code/state.ts";
import {Api} from "./code/api/api.ts";
import {reload, startRouter} from "./code/routing/Router.ts";
import {routes} from "./code/routing/routes.ts";

userLoading.value = true;
Api.getUser()
    .then(user => {
        currentUser.value = user;
        reload();
    })
    .finally(() => userLoading.value = false);

startRouter();
router.value!.setRoutes(routes);

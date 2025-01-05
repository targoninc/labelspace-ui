import {currentUser, router, userLoading} from "./code/state.ts";
import {Api} from "./code/api/api.ts";
import {startRouter} from "./code/routing/Router.ts";
import {routes} from "./code/components/generics.ts";

router.value!.setRoutes(routes);
userLoading.value = true;
Api.getUser()
    .then(user => {
        currentUser.value = user;
    })
    .finally(() => {
        userLoading.value = false;
        startRouter();
    });

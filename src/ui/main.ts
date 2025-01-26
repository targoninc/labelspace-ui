import {currentRoute, currentUser, router, userLoading} from "./code/state.ts";
import {Api} from "./code/api/api.ts";
import {navigate, startRouter} from "./code/routing/Router.ts";
import {routes} from "./code/components/generics.ts";

router.value!.setRoutes(routes);
userLoading.value = true;
Api.getUser()
    .then(user => {
        currentUser.value = user;
        if (user && currentRoute.value?.path === "login") {
            navigate("dashboard");
        }
    })
    .catch(e => {
        navigate("login");
    })
    .finally(() => {
        userLoading.value = false;
        startRouter();
    });

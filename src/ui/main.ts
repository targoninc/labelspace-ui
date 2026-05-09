import {currentRoute, currentUser, router, userLoading} from "./code/state.ts";
import {Api} from "./code/api/api.ts";
import {navigate, startRouter} from "./code/routing/Router.ts";
import {routes} from "./code/components/generic/generics.ts";

router.value!.setRoutes(routes);
userLoading.value = true;
Api.getUser()
    .then(user => {
        currentUser.value = user;
        if (user && (window.location.pathname === "/") || (window.location.pathname === "/login")) {
            navigate("dashboard");
        }
    })
    .catch(() => {
        const path = window.location.pathname.substring(1).split("/").filter(p => p !== "")[0] ?? "/";
        const route = routes.find(r => path.startsWith(r.path) || (r.aliases && r.aliases?.some((a: string) => path.startsWith(a))));
        if (!route?.allowWithoutLogin) {
            navigate("login");
        }
    })
    .finally(() => {
        userLoading.value = false;
        startRouter();
    });

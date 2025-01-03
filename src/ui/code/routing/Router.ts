import {signal} from "../../fjsc/src/signals.ts";
import {currentRoute, router} from "../state.ts";
import {Route} from "./Route.ts";

export class Router {
    public currentRoute = signal<Route|null>(null);
    public currentParams = signal<{
        [key: string]: string;
    }>({});
    routes: any[];
    protected preRouteChange: Function = () => {};
    protected postRouteChange: Function = () => {};
    protected onNoRouteFound: Function = () => {};

    constructor(routes: Route[], preRouteChange: Function = () => {}, postRouteChange: Function = () => {}, onNoRouteFound: Function = () => {}) {
        this.routes = routes;
        this.preRouteChange = preRouteChange;
        this.postRouteChange = postRouteChange;
        this.onNoRouteFound = onNoRouteFound;
        setTimeout(() => {
            this.init();
        });
    }

    setRoutes(routes: Route[]) {
        this.routes = routes;
    }

    init() {
        console.log("Initializing router");
        window.onpopstate = () => this.handleRouteChange();
        this.handleRouteChange().then();
    }

    async handleRouteChange() {
        const path = window.location.pathname.substring(1);
        const route = this.routes.find(r => path.startsWith(r.path) || (r.aliases && r.aliases.some((a: string) => path.startsWith(a))));
        this.currentRoute.value = route;
        currentRoute.value = route;
        if (route) {
            const params = this.getParams(path, route);
            this.currentParams.value = params;
            this.preRouteChange && await this.preRouteChange(route, params);
            route.handler && await route.handler(route, params);
            this.postRouteChange && await this.postRouteChange(route,params);
        } else {
            this.onNoRouteFound && await this.onNoRouteFound();
            this.currentParams.value = {};
        }
    }

    getParams(fullPath: string, route: Route) {
        const path = fullPath.split("/").filter(p => p !== "");
        const params: {
            [key: string]: string;
        } = {};
        for (let i = 0; i < path.length; i++) {
            params["path_" + i] = path[i];
        }
        const urlParams = new URLSearchParams(window.location.search);
        for (let [key, value] of urlParams.entries()) {
            params[key] = value;
        }
        if (route.pathParams) {
            for (let i = 0; i < route.pathParams.length; i++) {
                params[route.pathParams[i]] = params["path_" + (i + 1)];
            }
        }
        return params;
    }

    async navigate(path: string) {
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        history.pushState({}, "", window.location.origin + path);
        await this.handleRouteChange();
    }

    reload() {
        this.handleRouteChange().then();
    }
}

const content = document.querySelector("#content");
router.value = new Router([], async (route: Route, params: any) => {
    content.innerHTML = "";
    const component = await route.template(route, params);
    content.appendChild(component);
    content.firstElementChild?.scrollIntoView();
}, () => {}, () => {
    if (router.value!.routes?.length === 0) {
        return;
    }
    setTimeout(() => {
        navigate("404");
    });
});

export function navigate(path: string, params: string[] = []) {
    if (params.length > 0) {
        path += "?" + params.join("&");
    }
    router.value!.navigate(path).then();
}

export function reload() {
    router.value!.reload();
}

export function startRouter() {
    setTimeout(() => {
        router.value!.handleRouteChange().then();
    });
}
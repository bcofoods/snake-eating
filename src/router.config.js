import { defineRouter } from "zipaper"

export default defineRouter({
    routers: [{
        path: "/",
        redirect: "/welcome"
    }, {
        path: "/welcome",
        component: () => import("./pages/welcome/index.js"),
    }]
})
import { Navigate, Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { DashboardPage } from "../pages/dashboard/DashboardPage.js";

const rootRoute = createRootRoute({
  component: RootLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate params={{ tabPath: "main" }} replace to="/dashboard/$tabPath" />
});

const dashboardIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "dashboard",
  component: () => <Navigate params={{ tabPath: "main" }} replace to="/dashboard/$tabPath" />
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "dashboard/$tabPath",
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>) => search
});

const routeTree = rootRoute.addChildren([indexRoute, dashboardIndexRoute, dashboardRoute]);

export const router = createRouter({
  defaultPreload: "intent",
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function RootLayout() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  );
}

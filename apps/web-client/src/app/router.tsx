import { createRouter } from "@tanstack/react-router";
import { routeTree } from "../routeTree.gen.js";
import { queryClient } from "./query-client.js";

export const router = createRouter({
  defaultPreload: "intent",
  context: {
    queryClient
  },
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

import { RouterProvider } from "@tanstack/react-router";
import { AppProviders } from "./providers.js";
import { queryClient } from "./query-client.js";
import { router } from "./router.js";

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

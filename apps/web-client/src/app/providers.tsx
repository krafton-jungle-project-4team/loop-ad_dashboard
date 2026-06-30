import { QueryClientProvider, QueryErrorResetBoundary } from "@tanstack/react-query";
import { TooltipProvider } from "@loopad/ui/shadcn/tooltip";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import type { PropsWithChildren } from "react";
import { queryClient } from "./query-client.js";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryErrorResetBoundary>
        <TooltipProvider>
          <NuqsAdapter>{children}</NuqsAdapter>
        </TooltipProvider>
      </QueryErrorResetBoundary>
    </QueryClientProvider>
  );
}

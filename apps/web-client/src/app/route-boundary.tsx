import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import type {
  ErrorComponentProps,
  ErrorRouteComponent,
  RouteComponent
} from "@tanstack/react-router";
import { createElement } from "react";
import { RouteErrorFallback } from "./route-error.js";

export function createRouteBoundaryOptions({
  pendingComponent,
  title
}: {
  pendingComponent: RouteComponent;
  title?: string;
}) {
  const errorComponent: ErrorRouteComponent = function RouteErrorComponent({
    error,
    reset
  }: ErrorComponentProps) {
    const queryErrorResetBoundary = useQueryErrorResetBoundary();

    function handleRetry() {
      queryErrorResetBoundary.reset();
      reset();
    }

    return createElement(RouteErrorFallback, {
      error,
      onRetry: handleRetry,
      title
    });
  };

  return {
    errorComponent,
    pendingMinMs: 300,
    pendingMs: 0,
    pendingComponent,
    wrapInSuspense: true as const
  };
}

import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useDashboardAuthSession } from "../features/dashboard/model/use-dashboard-auth.js";

export const Route = createFileRoute("/dashboard")({
  component: DashboardRoute
});

function DashboardRoute() {
  const sessionQuery = useDashboardAuthSession();

  if (sessionQuery.isLoading) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f5f5f7] text-sm text-muted-foreground">
        로그인 확인 중
      </main>
    );
  }

  if (!sessionQuery.data) {
    return <Navigate replace to="/" />;
  }

  return <Outlet />;
}

import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { createRouteBoundaryOptions } from "../app/route-boundary.js";
import { getDashboardTabByPath } from "../features/dashboard/model/dashboard-navigation.js";
import { DashboardProjectPage } from "../features/dashboard/pages/DashboardProjectPage.js";
import { LoadingState } from "../features/dashboard/ui/LoadingState.js";

const routeBoundaryOptions = createRouteBoundaryOptions({
  pendingComponent: DashboardRoutePending,
  title: "대시보드 API 요청 실패"
});

export const Route = createFileRoute("/dashboard/$projectId/$tabPath")({
  component: DashboardProjectRoute,
  ...routeBoundaryOptions
});

function DashboardProjectRoute() {
  const { projectId, tabPath } = Route.useParams();
  const tab = getDashboardTabByPath(tabPath);

  if (!tab) {
    return (
      <Navigate
        params={{ projectId, tabPath: "main" }}
        replace
        to="/dashboard/$projectId/$tabPath"
      />
    );
  }

  return <DashboardProjectPage projectId={projectId} tab={tab} />;
}

function DashboardRoutePending() {
  const params = useParams({ strict: false }) as { tabPath?: string };
  const tab = getDashboardTabByPath(params.tabPath ?? "") ?? "main";

  return <LoadingState tab={tab} />;
}

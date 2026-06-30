import { createFileRoute, useParams } from "@tanstack/react-router";
import { createRouteBoundaryOptions } from "../app/route-boundary.js";
import { getDashboardTabByPath } from "../features/dashboard/model/dashboard-navigation.js";
import { LoadingState } from "../features/dashboard/ui/LoadingState.js";
import { DashboardPage } from "../pages/dashboard/DashboardPage.js";

const routeBoundaryOptions = createRouteBoundaryOptions({
  pendingComponent: DashboardRoutePending,
  title: "대시보드 API 요청 실패"
});

export const Route = createFileRoute("/dashboard/$tabPath")({
  component: DashboardPage,
  ...routeBoundaryOptions
});

function DashboardRoutePending() {
  const params = useParams({ strict: false }) as { tabPath?: string };
  const tab = getDashboardTabByPath(params.tabPath ?? "") ?? "main";

  return <LoadingState tab={tab} />;
}

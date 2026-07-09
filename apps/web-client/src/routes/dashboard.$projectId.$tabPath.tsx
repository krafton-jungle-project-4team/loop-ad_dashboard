import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { createFileRoute, Navigate, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { createRouteBoundaryOptions } from "../app/route-boundary.js";
import { getDashboardTabByPath } from "../features/dashboard/model/dashboard-navigation.js";
import { normalizeDashboardQuery, useDashboardQueryState } from "../features/dashboard/model/dashboard-query.js";
import type { DashboardQuery, DashboardTab } from "../features/dashboard/model/dashboard-types.js";
import { useSuspenseDashboardResources } from "../features/dashboard/model/use-dashboard-resources.js";
import { DashboardPanelRenderer } from "../features/dashboard/ui/DashboardRenderer.js";
import { LoadingState } from "../features/dashboard/ui/LoadingState.js";
import { DataExplorerDashboardPage } from "../features/dashboard/ui/pages/data-explorer/DataExplorerDashboardPage.js";
import { SdkPage } from "../features/dashboard/ui/pages/sdk/SdkPage.js";

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

  return <DashboardProjectContent projectId={projectId} tab={tab} />;
}

function DashboardRoutePending() {
  const params = useParams({ strict: false }) as { tabPath?: string };
  const tab = getDashboardTabByPath(params.tabPath ?? "") ?? "main";

  return <LoadingState tab={tab} />;
}

function DashboardProjectContent({ projectId, tab }: { projectId: string; tab: DashboardTab }) {
  const [queryState] = useDashboardQueryState();
  const query = useMemo(
    () => normalizeDashboardQuery(queryState, projectId),
    [projectId, queryState]
  );

  if (!query.projectId) {
    return (
      <Alert>
        <AlertTitle>조회 컨텍스트가 필요합니다</AlertTitle>
        <AlertDescription>대시보드 경로에 projectId를 명시해주세요.</AlertDescription>
      </Alert>
    );
  }

  if (tab === "dataExplorer") {
    return <DataExplorerDashboardPage projectId={query.projectId} />;
  }

  if (tab === "sdk") {
    return <SdkPage />;
  }

  return <DashboardResourcePanel query={query} tab={tab} />;
}

function DashboardResourcePanel({
  query,
  tab
}: {
  query: DashboardQuery;
  tab: DashboardTab;
}) {
  const { data } = useSuspenseDashboardResources(tab, query);

  return <DashboardPanelRenderer query={query} resource={data} />;
}

import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { useMemo } from "react";
import { DataExplorerPage } from "../../data-explorer/pages/DataExplorerPage.js";
import { normalizeDashboardQuery, useDashboardQueryState } from "../model/dashboard-query.js";
import type { DashboardQuery, DashboardTab } from "../model/dashboard-types.js";
import { useSuspenseDashboardResources } from "../model/use-dashboard-resources.js";
import { DashboardPanelRenderer } from "../ui/DashboardPanelRenderer.js";

export function DashboardProjectPage({ projectId, tab }: { projectId: string; tab: DashboardTab }) {
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
    return <DataExplorerPage projectId={query.projectId} />;
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

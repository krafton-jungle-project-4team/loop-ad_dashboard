import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { useCallback, useMemo } from "react";
import { normalizeDashboardQuery, useDashboardQueryState } from "../model/dashboard-query.js";
import type { DashboardQuery, DashboardTab } from "../model/dashboard-types.js";
import { useSuspenseDashboardResources } from "../model/use-dashboard-resources.js";
import { DashboardPanelRenderer } from "../ui/DashboardPanelRenderer.js";

export function DashboardProjectPage({ projectId, tab }: { projectId: string; tab: DashboardTab }) {
  const [queryState, setQueryState] = useDashboardQueryState();
  const query = useMemo(
    () => normalizeDashboardQuery(queryState, projectId),
    [projectId, queryState]
  );
  const handleSelectedCustomerIdChange = useCallback(
    (selectedCustomerId: string) => {
      void setQueryState({ selectedCustomerId });
    },
    [setQueryState]
  );

  if (!query.projectId) {
    return (
      <Alert>
        <AlertTitle>조회 컨텍스트가 필요합니다</AlertTitle>
        <AlertDescription>대시보드 경로에 projectId를 명시해주세요.</AlertDescription>
      </Alert>
    );
  }

  return (
    <DashboardResourcePanel
      onSelectedCustomerIdChange={handleSelectedCustomerIdChange}
      query={query}
      tab={tab}
    />
  );
}

function DashboardResourcePanel({
  onSelectedCustomerIdChange,
  query,
  tab
}: {
  onSelectedCustomerIdChange: (selectedCustomerId: string) => void;
  query: DashboardQuery;
  tab: DashboardTab;
}) {
  const { data } = useSuspenseDashboardResources(tab, query);

  return (
    <DashboardPanelRenderer
      onSelectedCustomerIdChange={onSelectedCustomerIdChange}
      query={query}
      resource={data}
    />
  );
}

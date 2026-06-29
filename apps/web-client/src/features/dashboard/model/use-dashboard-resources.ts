import { useEffect, useState } from "react";
import { fetchDashboardPageResource } from "../api/dashboard-api.js";
import type { DashboardQuery, DashboardResourceState, DashboardTab } from "./dashboard-types.js";

export function useDashboardResources(
  tab: DashboardTab,
  query: DashboardQuery | null,
  refreshKey: number
) {
  const [state, setState] = useState<DashboardResourceState>(
    query ? { status: "loading" } : { status: "idle" }
  );

  useEffect(() => {
    if (!query) {
      setState({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ status: "loading" });

    fetchDashboardPageResource(tab, query, controller.signal)
      .then((data) => setState({ status: "success", data }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            error: error instanceof Error ? error : new Error("데이터 요청 실패")
          });
        }
      });

    return () => controller.abort();
  }, [query, refreshKey, tab]);

  return state;
}

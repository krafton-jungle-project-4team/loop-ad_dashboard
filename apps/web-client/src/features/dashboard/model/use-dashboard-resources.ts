import { useEffect, useState } from "react";
import { fetchDashboardResources } from "../api/dashboard-api.js";
import type { DashboardResourceState } from "./dashboard-types.js";

export function useDashboardResources() {
  const [state, setState] = useState<DashboardResourceState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetchDashboardResources(controller.signal)
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
  }, []);

  return state;
}

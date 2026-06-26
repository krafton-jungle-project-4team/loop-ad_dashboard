import { useEffect, useState } from "react";
import type { AiJobKind } from "@loopad/shared";
import { createDashboardAiJob, fetchDashboardAiResult } from "../api/dashboard-api.js";
import type { DashboardAiJobState } from "./dashboard-types.js";

const pollingIntervalMs = 2000;

export function useDashboardAiJob(kind: AiJobKind | undefined) {
  const [state, setState] = useState<DashboardAiJobState>({ status: "idle" });

  useEffect(() => {
    if (!kind) {
      setState({ status: "idle" });
      return;
    }

    const activeKind = kind;
    const controller = new AbortController();
    let timeoutId: number | undefined;

    async function createAndPoll() {
      try {
        setState({ status: "requesting", kind: activeKind });
        const accepted = await createDashboardAiJob(activeKind, controller.signal);
        setState({ status: "polling", kind: activeKind, resultId: accepted.resultId });
        await pollResult(accepted.resultId);
      } catch (error: unknown) {
        setError(error);
      }
    }

    async function pollResult(resultId: string): Promise<void> {
      try {
        const result = await fetchDashboardAiResult(resultId, controller.signal);
        if (result.status === "completed") {
          setState({ status: "success", kind: activeKind, resultId, result });
          return;
        }
        if (result.status === "failed") {
          setState({
            status: "error",
            kind: activeKind,
            resultId,
            error: new Error(result.errorMessage ?? "AI 작업 실패")
          });
          return;
        }

        setState({ status: "polling", kind: activeKind, resultId });
        timeoutId = window.setTimeout(() => {
          void pollResult(resultId);
        }, pollingIntervalMs);
      } catch (error: unknown) {
        setError(error, resultId);
      }
    }

    function setError(error: unknown, resultId?: string) {
      if (!controller.signal.aborted) {
        setState({
          status: "error",
          kind: activeKind,
          resultId,
          error: error instanceof Error ? error : new Error("AI 작업 요청 실패")
        });
      }
    }

    void createAndPoll();

    return () => {
      controller.abort();
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [kind]);

  return state;
}

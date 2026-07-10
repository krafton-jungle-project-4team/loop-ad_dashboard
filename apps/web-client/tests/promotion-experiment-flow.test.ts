import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardAdExperiment } from "@loopad/shared";
import {
  launchPromotionExperiment,
  type PromotionExperimentOperations
} from "../src/features/dashboard/ui/pages/campaign/promotion/promotionExperimentFlow.js";

test("experiment launch creates a run, builds assignments, then starts eligible experiments", async () => {
  const calls: string[] = [];
  const operations: PromotionExperimentOperations = {
    buildAssignments: async (promotionRunId) => {
      calls.push(`build:${promotionRunId}`);
    },
    createRun: async () => {
      calls.push("create");
      return {
        experiments: [
          { adExperimentId: "experiment-1", channel: "email", status: "planned" },
          { adExperimentId: "experiment-2", channel: "email", status: "approved" }
        ],
        promotionRunId: "run-1"
      };
    },
    dispatch: async (promotionRunId) => {
      calls.push(`dispatch:${promotionRunId}`);
    },
    startExperiment: async (adExperimentId) => {
      calls.push(`start:${adExperimentId}`);
    }
  };

  const result = await launchPromotionExperiment({ existingExperiments: [] }, operations);

  assert.deepEqual(calls, [
    "create",
    "build:run-1",
    "start:experiment-1",
    "start:experiment-2",
    "dispatch:run-1"
  ]);
  assert.deepEqual(result.startedExperimentIds, ["experiment-1", "experiment-2"]);
});

test("experiment launch resumes an existing run without creating a duplicate", async () => {
  const calls: string[] = [];
  const existingExperiments = [
    {
      ad_experiment_id: "experiment-1",
      channel: "onsite_banner",
      promotion_run_id: "run-1",
      status: "planned"
    },
    {
      ad_experiment_id: "experiment-old",
      channel: "onsite_banner",
      promotion_run_id: "run-old",
      status: "planned"
    }
  ] as DashboardAdExperiment[];
  const operations: PromotionExperimentOperations = {
    buildAssignments: async (promotionRunId) => {
      calls.push(`build:${promotionRunId}`);
    },
    createRun: async () => {
      calls.push("create");
      return { experiments: [], promotionRunId: "unexpected" };
    },
    dispatch: async (promotionRunId) => {
      calls.push(`dispatch:${promotionRunId}`);
    },
    startExperiment: async (adExperimentId) => {
      calls.push(`start:${adExperimentId}`);
    }
  };

  await launchPromotionExperiment({ existingExperiments }, operations);

  assert.deepEqual(calls, ["build:run-1", "start:experiment-1"]);
});

test("experiment launch keeps successful starts and reports only failed experiments", async () => {
  const calls: string[] = [];
  const operations: PromotionExperimentOperations = {
    buildAssignments: async (promotionRunId) => {
      calls.push(`build:${promotionRunId}`);
    },
    createRun: async () => ({
      experiments: [
        { adExperimentId: "experiment-success", channel: "email", status: "planned" },
        { adExperimentId: "experiment-failed", channel: "email", status: "planned" }
      ],
      promotionRunId: "run-partial"
    }),
    dispatch: async (promotionRunId) => {
      calls.push(`dispatch:${promotionRunId}`);
    },
    startExperiment: async (adExperimentId) => {
      calls.push(`start:${adExperimentId}`);
      if (adExperimentId === "experiment-failed") {
        throw new Error("start failed");
      }
    }
  };

  const result = await launchPromotionExperiment({ existingExperiments: [] }, operations);

  assert.deepEqual(result.startedExperimentIds, ["experiment-success"]);
  assert.deepEqual(result.failedExperimentIds, ["experiment-failed"]);
  assert.equal(result.dispatched, true);
  assert.deepEqual(calls, [
    "build:run-partial",
    "start:experiment-success",
    "start:experiment-failed",
    "dispatch:run-partial"
  ]);
});

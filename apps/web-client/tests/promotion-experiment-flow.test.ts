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
          {
            adExperimentId: "experiment-1",
            channel: "email",
            segmentId: "segment-1",
            status: "planned"
          }
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

  const result = await launchPromotionExperiment(
    { existingExperiments: [], segmentId: "segment-1" },
    operations
  );

  assert.deepEqual(calls, ["create", "build:run-1", "start:experiment-1", "dispatch:run-1"]);
  assert.deepEqual(result.startedExperimentIds, ["experiment-1"]);
});

test("experiment launch resumes an existing run without creating a duplicate", async () => {
  const calls: string[] = [];
  const existingExperiments = [
    {
      ad_experiment_id: "experiment-1",
      channel: "onsite_banner",
      promotion_run_id: "run-1",
      segment_id: "segment-1",
      status: "planned"
    },
    {
      ad_experiment_id: "experiment-old",
      channel: "onsite_banner",
      promotion_run_id: "run-old",
      segment_id: "segment-2",
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

  await launchPromotionExperiment({ existingExperiments, segmentId: "segment-1" }, operations);

  assert.deepEqual(calls, ["build:run-1", "start:experiment-1"]);
});

test("segment experiment launch reports a failed start without starting another segment", async () => {
  const calls: string[] = [];
  const operations: PromotionExperimentOperations = {
    buildAssignments: async (promotionRunId) => {
      calls.push(`build:${promotionRunId}`);
    },
    createRun: async () => ({
      experiments: [
        {
          adExperimentId: "experiment-failed",
          channel: "email",
          segmentId: "segment-1",
          status: "planned"
        },
        {
          adExperimentId: "experiment-other",
          channel: "email",
          segmentId: "segment-2",
          status: "planned"
        }
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

  const result = await launchPromotionExperiment(
    { existingExperiments: [], segmentId: "segment-1" },
    operations
  );

  assert.deepEqual(result.startedExperimentIds, []);
  assert.deepEqual(result.failedExperimentIds, ["experiment-failed"]);
  assert.equal(result.dispatched, false);
  assert.deepEqual(calls, ["build:run-partial", "start:experiment-failed"]);
});

test("experiment launch keeps started experiments when dispatch fails", async () => {
  const operations: PromotionExperimentOperations = {
    buildAssignments: async () => undefined,
    createRun: async () => ({
      experiments: [
        {
          adExperimentId: "experiment-1",
          channel: "email",
          segmentId: "segment-1",
          status: "planned"
        }
      ],
      promotionRunId: "run-1"
    }),
    dispatch: async () => {
      throw new Error("dispatch failed");
    },
    startExperiment: async () => undefined
  };

  const result = await launchPromotionExperiment(
    { existingExperiments: [], segmentId: "segment-1" },
    operations
  );

  assert.deepEqual(result.startedExperimentIds, ["experiment-1"]);
  assert.equal(result.dispatched, false);
  assert.equal(result.dispatchFailed, true);
});

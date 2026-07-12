import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedDashboardTabs,
  createCampaignOnboardingSteps,
  createSetupOnboardingSteps
} from "../src/features/dashboard/model/project-onboarding.js";
import { dashboardTabValues } from "../src/features/dashboard/model/dashboard-types.js";

test("allowed dashboard tabs expand with the top-level onboarding stage", () => {
  assert.deepEqual([...allowedDashboardTabs("welcome")], ["sdk"]);
  assert.deepEqual([...allowedDashboardTabs("sdk")], ["sdk"]);
  assert.deepEqual([...allowedDashboardTabs("campaign")], ["sdk", "campaigns"]);
  assert.deepEqual([...allowedDashboardTabs("complete")], [...dashboardTabValues]);
});

test("setup guide tracks only SDK before campaign onboarding", () => {
  assert.deepEqual(
    createSetupOnboardingSteps("welcome").map(({ id, state }) => ({ id, state })),
    [{ id: "sdk", state: "locked" }]
  );
  assert.deepEqual(
    createSetupOnboardingSteps("sdk").map(({ id, state }) => ({ id, state })),
    [{ id: "sdk", state: "current" }]
  );
  assert.deepEqual(
    createSetupOnboardingSteps("campaign").map(({ id, state }) => ({ id, state })),
    [{ id: "sdk", state: "complete" }]
  );
});

test("campaign steps open at campaign creation and complete after the first running experiment", () => {
  const emptyProgress = {
    hasAnalyzedSegment: false,
    hasApprovedCreative: false,
    hasCampaign: false,
    hasPromotion: false,
    hasRunningExperiment: false,
    stage: "campaign" as const
  };

  assert.deepEqual(states(createCampaignOnboardingSteps(emptyProgress)), [
    "current",
    "locked",
    "locked",
    "locked",
    "locked"
  ]);
  assert.deepEqual(states(createCampaignOnboardingSteps({ ...emptyProgress, hasCampaign: true })), [
    "complete",
    "current",
    "locked",
    "locked",
    "locked"
  ]);
  assert.deepEqual(
    states(
      createCampaignOnboardingSteps({
        ...emptyProgress,
        hasCampaign: true,
        hasPromotion: true
      })
    ),
    ["complete", "complete", "current", "locked", "locked"]
  );
  assert.deepEqual(
    states(
      createCampaignOnboardingSteps({
        ...emptyProgress,
        hasAnalyzedSegment: true,
        hasCampaign: true,
        hasPromotion: true
      })
    ),
    ["complete", "complete", "complete", "current", "locked"]
  );

  const approvedButNotRunning = {
    ...emptyProgress,
    hasAnalyzedSegment: true,
    hasApprovedCreative: true,
    hasCampaign: true,
    hasPromotion: true
  };
  assert.deepEqual(states(createCampaignOnboardingSteps(approvedButNotRunning)), [
    "complete",
    "complete",
    "complete",
    "complete",
    "current"
  ]);
  assert.deepEqual(
    states(
      createCampaignOnboardingSteps({
        ...approvedButNotRunning,
        hasRunningExperiment: true
      })
    ),
    ["complete", "complete", "complete", "complete", "complete"]
  );
  assert.equal(
    createCampaignOnboardingSteps({ ...emptyProgress, stage: "sdk" }).every(
      (step) => step.state === "locked"
    ),
    true
  );
  assert.equal(
    createCampaignOnboardingSteps({ ...emptyProgress, stage: "complete" }).every(
      (step) => step.state === "complete"
    ),
    true
  );
});

function states(steps: ReturnType<typeof createCampaignOnboardingSteps>) {
  return steps.map((step) => step.state);
}

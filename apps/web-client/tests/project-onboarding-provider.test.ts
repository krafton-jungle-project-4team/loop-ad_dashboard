import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedDashboardTabs,
  createCampaignOnboardingSteps,
  createSetupOnboardingSteps
} from "../src/features/dashboard/model/project-onboarding.js";
import { dashboardTabValues } from "../src/features/dashboard/model/dashboard-types.js";

test("allowed dashboard tabs expand with the top-level onboarding stage", () => {
  assert.deepEqual([...allowedDashboardTabs("sdk")], ["sdk"]);
  assert.deepEqual([...allowedDashboardTabs("funnel")], ["sdk", "funnels"]);
  assert.deepEqual([...allowedDashboardTabs("campaign")], ["sdk", "funnels", "campaigns"]);
  assert.deepEqual([...allowedDashboardTabs("complete")], [...dashboardTabValues]);
});

test("setup steps mark only the next required initial setup step as current", () => {
  assert.deepEqual(
    createSetupOnboardingSteps("sdk").map(({ id, state }) => ({ id, state })),
    [
      { id: "sdk", state: "current" },
      { id: "funnel", state: "locked" }
    ]
  );
  assert.deepEqual(
    createSetupOnboardingSteps("funnel").map(({ id, state }) => ({ id, state })),
    [
      { id: "sdk", state: "complete" },
      { id: "funnel", state: "current" }
    ]
  );
  assert.equal(
    createSetupOnboardingSteps("campaign").every((step) => step.state === "complete"),
    true
  );
});

test("campaign steps open at campaign creation and complete after the first running experiment", () => {
  const campaignSteps = createCampaignOnboardingSteps("campaign");
  assert.equal(campaignSteps[0]?.state, "current");
  assert.equal(
    campaignSteps.slice(1).every((step) => step.state === "locked"),
    true
  );
  assert.equal(
    createCampaignOnboardingSteps("sdk").every((step) => step.state === "locked"),
    true
  );
  assert.equal(
    createCampaignOnboardingSteps("complete").every((step) => step.state === "complete"),
    true
  );
});

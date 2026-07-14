import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardCampaignPromotion } from "@loopad/shared";
import {
  canStartAdExperiment,
  promotionFormToUpdateRequest,
  promotionToFormState,
  segmentWorkflowCurrentStep
} from "../src/features/dashboard/ui/pages/campaign/promotion/promotionUtils.js";

test("ad experiments can start from the statuses accepted by the dashboard API", () => {
  assert.equal(canStartAdExperiment("planned"), true);
  assert.equal(canStartAdExperiment("approved"), true);
  assert.equal(canStartAdExperiment("created"), false);
  assert.equal(canStartAdExperiment("ready"), false);
  assert.equal(canStartAdExperiment("running"), false);
});

test("promotion edit maps every field exposed by the create form", () => {
  const promotion = {
    channel: "sms",
    goal_basis: "all_segments",
    goal_metric: "booking_conversion_rate",
    goal_target_value: 0.25,
    landing_url: "https://example.com/promotion",
    marketing_theme: "여름 프로모션",
    max_loop_count: 5,
    message_brief: "예약 전환 프로모션",
    min_sample_size: 250,
    status: "approved"
  } as DashboardCampaignPromotion;

  const request = promotionFormToUpdateRequest(
    promotionToFormState(promotion),
    promotion.status as "approved"
  );

  assert.deepEqual(request, {
    channel: "sms",
    goal_basis: "all_segments",
    goal_metric: "booking_conversion_rate",
    goal_target_value: 0.25,
    landing_url: "https://example.com/promotion",
    marketing_theme: "여름 프로모션",
    max_loop_count: 5,
    message_brief: "예약 전환 프로모션",
    min_sample_size: 250,
    status: "approved"
  });
});

test("segment workflow advances from candidate creation to content generation", () => {
  assert.equal(
    segmentWorkflowCurrentStep({
      candidateCount: 0,
      confirmedCandidateCount: 0,
      selectedCandidateCount: 0
    }),
    1
  );
  assert.equal(
    segmentWorkflowCurrentStep({
      candidateCount: 2,
      confirmedCandidateCount: 0,
      selectedCandidateCount: 0
    }),
    2
  );
  assert.equal(
    segmentWorkflowCurrentStep({
      candidateCount: 2,
      confirmedCandidateCount: 0,
      selectedCandidateCount: 1
    }),
    3
  );
  assert.equal(
    segmentWorkflowCurrentStep({
      candidateCount: 2,
      confirmedCandidateCount: 1,
      selectedCandidateCount: 1
    }),
    4
  );
});

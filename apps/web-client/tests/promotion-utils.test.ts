import assert from "node:assert/strict";
import test from "node:test";
import type {
  DashboardCampaignPromotion,
  DashboardSegmentDetail
} from "@loopad/shared";
import {
  activeContentCandidates,
  canStartAdExperiment,
  nextExperimentLoopCount,
  normalizeSegmentDisplayCopy,
  promotionFormToUpdateRequest,
  promotionToFormState
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

test("creative selection only uses candidates from the segment's active analysis", () => {
  const detail = {
    content_candidates: [
      { analysis_id: "analysis_old", content_id: "content_old" },
      { analysis_id: "analysis_repeat", content_id: "content_repeat" }
    ],
    segment: { analysis_id: "analysis_repeat" }
  } as DashboardSegmentDetail;

  assert.deepEqual(
    activeContentCandidates(detail).map((candidate) => candidate.content_id),
    ["content_repeat"]
  );
});

test("the next experiment increments the highest loop for its segment", () => {
  const detail = {
    ad_experiments: [{ loop_count: 1 }, { loop_count: 2 }]
  } as DashboardSegmentDetail;

  assert.equal(nextExperimentLoopCount(detail), 3);
  assert.equal(nextExperimentLoopCount({ ad_experiments: [] } as DashboardSegmentDetail), 1);
});

test("segment display copy preserves strategy metadata and legacy candidate context", () => {
  const displayCopy = normalizeSegmentDisplayCopy({
    title: "이번 여행지를 반복 탐색한 고객",
    strategy_role: "이번 목적지 반복 관심형",
    strength_summary: "이번 여행지를 반복 탐색한 행동이 확인됐습니다.",
    tradeoff_summary: "대표 표본이 작아 도달 규모는 제한적입니다.",
    audience_summary: "조건 일치 4명",
    signal_chips: ["목적지 반복"],
    reason: "반복 탐색 행동이 확인됐습니다.",
    action_hint: "별도 개인화 실험으로 검토하세요.",
    recommendation_tier: "small_high_intent",
    recommendation_tier_label: "소규모 고의도 후보",
    recommendation_tier_reason: "예측 기준 표본보다 적습니다.",
    recommendation_rank: null,
    rank_eligible: false,
    minimum_primary_sample_size: "30"
  });

  assert.equal(displayCopy?.strategy_role, "이번 목적지 반복 관심형");
  assert.equal(
    displayCopy?.strength_summary,
    "이번 여행지를 반복 탐색한 행동이 확인됐습니다."
  );
  assert.equal(displayCopy?.tradeoff_summary, "대표 표본이 작아 도달 규모는 제한적입니다.");
  assert.equal(displayCopy?.recommendation_tier, "small_high_intent");
  assert.equal(displayCopy?.recommendation_rank, undefined);
  assert.equal(displayCopy?.rank_eligible, false);
  assert.equal(displayCopy?.minimum_primary_sample_size, 30);
});

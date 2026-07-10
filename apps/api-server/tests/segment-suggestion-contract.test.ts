import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DashboardPromotionSegmentSuggestionDisplayCopySchema,
  DashboardPromotionSegmentSuggestionPerformanceEstimateSchema,
  normalizePromotionSegmentPerformanceEstimate
} from "@loopad/shared";

test("segment performance estimate normalizes deterministic display values", () => {
  const estimate = normalizePromotionSegmentPerformanceEstimate({
    metric: "booking_conversion_rate",
    label: "예상 전환율",
    value: "0.3476",
    formatted: "100.0%",
    observed_value: 0.5,
    basis_label: "최근 행동 벡터 관찰 구간 기반 추정",
    method: "empirical_bayes_user_rate",
    prior_user_count: "30",
    calibration_status: "not_backtested"
  });

  assert.deepEqual(estimate, {
    metric: "booking_conversion_rate",
    label: "예상 전환율",
    value: 0.3476,
    formatted: "34.8%",
    observed_value: 0.5,
    basis_label: "최근 행동 벡터 관찰 구간 기반 추정",
    method: "empirical_bayes_user_rate",
    prior_user_count: 30,
    calibration_status: "not_backtested"
  });
  assert.deepEqual(
    DashboardPromotionSegmentSuggestionPerformanceEstimateSchema.parse(estimate),
    estimate
  );
});

test("segment performance estimate rejects non-numeric rates", () => {
  assert.equal(
    normalizePromotionSegmentPerformanceEstimate({
      metric: "inflow_rate",
      label: "예상 유입률",
      value: "not-a-number"
    }),
    undefined
  );
});

test("segment performance estimate keeps the v1-compatible core contract", () => {
  assert.deepEqual(
    normalizePromotionSegmentPerformanceEstimate({
      metric: "inflow_rate",
      label: "예상 유입률",
      value: 0.2,
      formatted: "20%"
    }),
    {
      metric: "inflow_rate",
      label: "예상 유입률",
      value: 0.2,
      formatted: "20.0%",
      observed_value: undefined,
      basis_label: undefined,
      method: undefined,
      prior_user_count: undefined,
      calibration_status: undefined
    }
  );
});

test("segment suggestion display copy accepts the previous optional-field contract", () => {
  const legacyDisplayCopy = {
    title: "재방문 가능성이 높은 사용자",
    audience_summary: "최근 숙소를 조회했지만 예약하지 않은 사용자입니다.",
    signal_chips: ["최근 조회", "예약 미완료"],
    reason: "프로모션 목표와 행동 신호가 일치합니다.",
    action_hint: "첫 번째 추천 세그먼트로 검토하세요."
  };

  assert.deepEqual(
    DashboardPromotionSegmentSuggestionDisplayCopySchema.parse(legacyDisplayCopy),
    legacyDisplayCopy
  );
});

test("segment suggestion display copy accepts the enriched AI contract", () => {
  const displayCopy = {
    title: "재방문 가능성이 높은 사용자",
    rank_role: "우선 검토",
    audience_summary: "최근 숙소를 조회했지만 예약하지 않은 사용자입니다.",
    performance_estimate: {
      metric: "booking_conversion_rate",
      label: "예상 예약 전환율",
      value: 0.31,
      formatted: "31.0%",
      observed_value: 0.27,
      basis_label: "최근 행동 기반 추정",
      method: "empirical_bayes_user_rate",
      prior_user_count: 30,
      calibration_status: "not_backtested"
    },
    signal_chips: ["최근 조회", "예약 미완료"],
    reason: "프로모션 목표와 행동 신호가 일치합니다.",
    difference_summary: "다른 추천보다 최근 조회 신호가 강합니다.",
    action_hint: "첫 번째 추천 세그먼트로 검토하세요."
  };

  assert.deepEqual(
    DashboardPromotionSegmentSuggestionDisplayCopySchema.parse(displayCopy),
    displayCopy
  );
});

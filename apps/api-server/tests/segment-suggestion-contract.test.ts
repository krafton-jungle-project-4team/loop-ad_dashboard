import assert from "node:assert/strict";
import { test } from "node:test";
import {
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

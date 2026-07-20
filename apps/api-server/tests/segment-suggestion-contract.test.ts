import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DashboardPromotionSegmentSuggestionDisplayCopySchema,
  DashboardPromotionSegmentSuggestionPerformanceEstimateSchema,
  DashboardPromotionSegmentSuggestionReportSchema,
  DashboardSegmentAssistantSourceSuggestionSchema,
  normalizePromotionSegmentPerformanceEstimate
} from "@loopad/shared";

test("segment assistant source keeps reference labels separate from executable conditions", () => {
  const source = DashboardSegmentAssistantSourceSuggestionSchema.parse({
    suggestion_id: "suggestion-1",
    segment_id: "segment-1",
    title: "예약을 시작한 고객",
    strategy_role: "AI 추천 고객군",
    condition_labels: [],
    reference_labels: ["숙소 검색", "예약 가능성 높음", "예약 시작"],
    sample_size: 387
  });

  assert.deepEqual(source.condition_labels, []);
  assert.deepEqual(source.reference_labels, ["숙소 검색", "예약 가능성 높음", "예약 시작"]);
});

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
    availability: "available",
    unit: undefined,
    value: 0.3476,
    formatted: "34.8%",
    expected_count: undefined,
    expected_count_formatted: undefined,
    expected_count_label: undefined,
    observed_value: 0.5,
    basis_label: "최근 행동 벡터 관찰 구간 기반 추정",
    window_days: undefined,
    window_label: undefined,
    confidence_label: undefined,
    confidence_reason: undefined,
    unavailable_reason: undefined,
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

test("segment performance estimate normalizes expected goal count", () => {
  const estimate = normalizePromotionSegmentPerformanceEstimate({
    metric: "booking_conversion_rate",
    label: "예상 예약 전환율",
    value: 0.049,
    expected_count: "9.016",
    expected_count_formatted: "잘못된 표시값",
    expected_count_label: "예상 예약 인원"
  });

  assert.equal(estimate?.expected_count, 9.016);
  assert.equal(estimate?.expected_count_formatted, "약 9.0명");
  assert.equal(estimate?.expected_count_label, "예상 예약 인원");
});

test("segment performance estimate preserves an explicit unavailable state", () => {
  const estimate = normalizePromotionSegmentPerformanceEstimate({
    metric: "funnel_step_rate",
    label: "예상 예약 시작 전환율",
    availability: "unavailable",
    unavailable_reason: "유효한 예약 시작 행동이 부족합니다.",
    window_label: "최근 30일"
  });

  assert.deepEqual(estimate, {
    metric: "funnel_step_rate",
    label: "예상 예약 시작 전환율",
    availability: "unavailable",
    unit: undefined,
    value: undefined,
    formatted: undefined,
    expected_count: undefined,
    expected_count_formatted: undefined,
    expected_count_label: undefined,
    observed_value: undefined,
    basis_label: undefined,
    window_days: undefined,
    window_label: "최근 30일",
    confidence_label: undefined,
    confidence_reason: undefined,
    unavailable_reason: "유효한 예약 시작 행동이 부족합니다.",
    method: undefined,
    prior_user_count: undefined,
    calibration_status: undefined
  });
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
      availability: "available",
      unit: undefined,
      value: 0.2,
      formatted: "20.0%",
      expected_count: undefined,
      expected_count_formatted: undefined,
      expected_count_label: undefined,
      observed_value: undefined,
      basis_label: undefined,
      window_days: undefined,
      window_label: undefined,
      confidence_label: undefined,
      confidence_reason: undefined,
      unavailable_reason: undefined,
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

test("segment suggestion display copy accepts the legacy ranked AI contract", () => {
  const displayCopy = {
    title: "재방문 가능성이 높은 사용자",
    rank_role: "우선 검토",
    recommendation_tier: "primary",
    recommendation_tier_label: "주요 추천",
    recommendation_tier_reason: "충분한 표본을 확보했습니다.",
    recommendation_rank: 1,
    rank_eligible: true,
    minimum_primary_sample_size: 30,
    audience_summary: "최근 숙소를 조회했지만 예약하지 않은 사용자입니다.",
    performance_estimate: {
      metric: "booking_conversion_rate",
      label: "예상 예약 전환율",
      availability: "available",
      unit: "rate",
      value: 0.31,
      formatted: "31.0%",
      expected_count: 49.6,
      expected_count_formatted: "약 49.6명",
      expected_count_label: "예상 예약 인원",
      observed_value: 0.27,
      basis_label: "최근 행동 기반 추정",
      window_days: 30,
      window_label: "향후 30일",
      confidence_label: "medium",
      confidence_reason: "표본 안정성이 보통입니다.",
      method: "expedia_calibrated_logistic",
      calibration_status: "calibrated"
    },
    audience: {
      total_eligible_user_count: 310,
      matching_user_count: 230,
      selected_user_count: 160,
      selected_user_ratio: 160 / 310,
      selection_limited: true
    },
    signal_chips: ["최근 조회", "예약 미완료"],
    reason: "프로모션 목표와 행동 신호가 일치합니다.",
    difference_summary: "다른 추천보다 최근 조회 신호가 강합니다.",
    rank_comparison: {
      reference_rank: 2,
      metric: "booking_conversion_rate",
      metric_label: "예상 예약 전환율",
      direction: "higher",
      delta_percentage_points: 3.2,
      summary: "Rank 2보다 예상 예약 전환율이 3.2%p 높습니다."
    },
    action_hint: "첫 번째 추천 세그먼트로 검토하세요."
  };

  assert.deepEqual(
    DashboardPromotionSegmentSuggestionDisplayCopySchema.parse(displayCopy),
    displayCopy
  );
});

test("segment suggestion display copy accepts the strategy portfolio contract", () => {
  const displayCopy = {
    title: "예약 직전 이탈 고객",
    strategy_role: "예약 이탈 회수형",
    strength_summary: "예약 시작 행동이 확인되어 전환 의도가 깊습니다.",
    tradeoff_summary: "목적지 일치 여부는 다른 후보보다 약할 수 있습니다.",
    audience_summary: "분석 가능 사용자 310명 중 대표 표본 42명",
    signal_chips: ["예약 시작", "예약 미완료"],
    reason: "예약 흐름까지 진입했지만 완료하지 않은 고객군입니다.",
    action_hint: "예약 혜택과 마감 메시지를 함께 사용하세요."
  };

  assert.deepEqual(
    DashboardPromotionSegmentSuggestionDisplayCopySchema.parse(displayCopy),
    displayCopy
  );
});

test("segment suggestion report accepts the strategy portfolio contract", () => {
  const report = {
    version: "dec.segment-report.v3",
    title: "예약 직전 이탈 고객 리포트",
    summary: "예약 직전 단계에서 멈춘 고객군입니다.",
    why_recommended: ["예약 시작 행동이 확인되었습니다."],
    evidence: ["예약 완료 행동은 확인되지 않았습니다."],
    candidate_strengths: ["전환 의도가 깊은 고객군입니다."],
    selection_considerations: ["목적지 일치 여부를 함께 확인하세요."],
    action_hint: "예약 혜택을 강조하세요.",
    caution: "실행 후 실제 성과를 확인하세요."
  };

  assert.deepEqual(DashboardPromotionSegmentSuggestionReportSchema.parse(report), report);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  toCampaignSummary,
  toPromotionSegmentSuggestion
} from "../src/features/dashboard/repository/dashboard-campaign-mappers.js";

test("campaign mapper preserves date and numeric conversion contracts", () => {
  const summary = toCampaignSummary(
    {
      campaignId: "campaign-1",
      campaignName: "여름 캠페인",
      objective: "예약 전환 증가",
      primaryMetric: "booking_conversion_rate",
      status: "active",
      startDate: new Date("2026-07-01T00:00:00.000Z"),
      endDate: new Date("2026-07-31T00:00:00.000Z"),
      maxLoopCount: "3",
      currentLoopCount: "1",
      promotionCount: "2",
      segmentCount: "4",
      adExperimentCount: "5",
      latestGoalAchievementRate: "0.42",
      nextAction: null,
      updatedAt: new Date("2026-07-10T00:00:00.000Z")
    } as unknown as Parameters<typeof toCampaignSummary>[0],
    2
  );

  assert.deepEqual(summary, {
    campaign_id: "campaign-1",
    campaign_name: "여름 캠페인",
    objective: "예약 전환 증가",
    primary_metric: "booking_conversion_rate",
    status: "active",
    start_date: "2026-07-01",
    end_date: "2026-07-31",
    max_loop_count: 3,
    current_loop_count: 1,
    promotion_count: 2,
    segment_count: 4,
    ad_experiment_count: 5,
    running_ad_experiment_count: 2,
    latest_goal_achievement_rate: 0.42,
    next_action: "monitor",
    updated_at: "2026-07-10T00:00:00.000Z"
  });
});

test("segment suggestion mapper preserves enriched AI metadata", () => {
  const suggestion = toPromotionSegmentSuggestion({
    analysisId: "analysis-1",
    campaignId: "campaign-1",
    createdAt: new Date("2026-07-10T00:00:00.000Z"),
    decidedAt: null,
    metadataJson: {
      display_copy: {
        title: "재방문 가능성이 높은 사용자",
        audience_summary: "최근 숙소를 조회했지만 예약하지 않은 사용자입니다.",
        performance_estimate: {
          metric: "booking_conversion_rate",
          label: "예상 예약 전환율",
          availability: "available",
          unit: "rate",
          value: "0.31",
          basis_label: "최근 행동 기반 추정",
          window_days: "30",
          window_label: "향후 30일",
          confidence_label: "medium",
          confidence_reason: "표본 안정성이 보통입니다.",
          calibration_status: "calibrated"
        },
        audience: {
          total_eligible_user_count: "310",
          matching_user_count: "230",
          selected_user_count: "160",
          selected_user_ratio: "0.516129",
          selection_limited: true
        },
        signal_chips: ["최근 조회", "예약 미완료"],
        reason: "행동 신호가 프로모션 목표와 일치합니다.",
        difference_summary: "Rank 2보다 예상 예약 전환율이 높습니다.",
        rank_comparison: {
          reference_rank: "2",
          metric: "booking_conversion_rate",
          metric_label: "예상 예약 전환율",
          direction: "higher",
          delta_percentage_points: "3.2",
          summary: "Rank 2보다 예상 예약 전환율이 3.2%p 높습니다."
        },
        action_hint: "우선 검토하세요."
      },
      ai_report: {
        title: "추천 리포트",
        summary: "예약 가능성이 높은 고객군입니다.",
        why_recommended: ["최근 조회 신호가 있습니다."],
        evidence: ["예약 미완료 이벤트가 있습니다."],
        action_hint: "리마인드 메시지를 사용하세요.",
        caution: "실행 후 실제 성과를 함께 확인하세요.",
        confidence_label: "medium"
      }
    },
    profileJson: {},
    promotionId: "promotion-1",
    reasonJson: {},
    ruleJson: {},
    sampleRatio: "0.2",
    sampleSize: "200",
    scoreJson: {},
    segmentId: "segment-1",
    segmentName: "미예약 재방문 사용자",
    segmentSource: "ai_suggested",
    suggestedRank: "1",
    suggestionId: "suggestion-1",
    suggestionSource: "ai_generated",
    suggestionStatus: "suggested",
    updatedAt: new Date("2026-07-10T00:00:00.000Z")
  } as unknown as Parameters<typeof toPromotionSegmentSuggestion>[0]);

  assert.equal(suggestion.display_copy?.performance_estimate?.formatted, "31.0%");
  assert.equal(suggestion.display_copy?.performance_estimate?.calibration_status, "calibrated");
  assert.equal(suggestion.display_copy?.performance_estimate?.window_days, 30);
  assert.equal(suggestion.display_copy?.performance_estimate?.confidence_label, "medium");
  assert.equal(suggestion.display_copy?.audience?.matching_user_count, 230);
  assert.equal(suggestion.display_copy?.audience?.selected_user_count, 160);
  assert.equal(suggestion.display_copy?.rank_comparison?.direction, "higher");
  assert.equal(suggestion.display_copy?.rank_comparison?.delta_percentage_points, 3.2);
  assert.equal(suggestion.ai_report?.confidence_label, "medium");
  assert.equal(suggestion.suggested_rank, 1);
  assert.equal(suggestion.sample_size, 200);
});

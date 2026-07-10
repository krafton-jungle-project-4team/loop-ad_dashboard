import assert from "node:assert/strict";
import { test } from "node:test";
import type { DashboardCampaignDetail } from "@loopad/shared";
import { buildCampaignFlowGraph } from "../src/features/dashboard/ui/pages/workflow-map/workflow-map-graph.js";

test("workflow graph routes failed segments through evaluation and retry nodes", () => {
  const graph = buildCampaignFlowGraph(campaignDetailFixture(), "project-1");

  assert.equal(graph.nextLoopCandidateCount, 1);
  assert.deepEqual(
    graph.nodes.map((node) => node.type),
    ["campaign", "promotion", "evaluation", "retryQueue"]
  );
  assert.deepEqual(
    graph.edges.map((edge) => ({ source: edge.source, target: edge.target, type: edge.type })),
    [
      { source: "campaign:campaign-1", target: "promotion:promotion-1", type: "straight" },
      { source: "promotion:promotion-1", target: "evaluation:campaign-1", type: "straight" },
      {
        source: "evaluation:campaign-1",
        target: "retry-queue:campaign-1",
        type: "straight"
      },
      {
        source: "retry-queue:campaign-1",
        target: "promotion:promotion-1",
        type: "loopBack"
      }
    ]
  );
  const retryNode = graph.nodes.find((node) => node.type === "retryQueue");
  assert.equal(retryNode?.data.segments?.[0]?.id, "segment-1");
});

test("workflow graph keeps an empty campaign as a single node", () => {
  const detail = campaignDetailFixture();
  detail.promotions = [];
  detail.segments = [];
  detail.experiment_metrics = [];

  const graph = buildCampaignFlowGraph(detail, "project-1");

  assert.equal(graph.nextLoopCandidateCount, 0);
  assert.equal(graph.nodes.length, 1);
  assert.equal(graph.nodes[0]?.type, "campaign");
  assert.deepEqual(graph.edges, []);
});

function campaignDetailFixture(): DashboardCampaignDetail {
  return {
    campaign: {
      campaign_id: "campaign-1",
      campaign_name: "여름 예약 캠페인",
      objective: "예약 전환 증가",
      primary_metric: "booking_conversion_rate",
      status: "active",
      start_date: "2026-07-01",
      end_date: "2026-07-31",
      max_loop_count: 3,
      current_loop_count: 1,
      promotion_count: 1,
      segment_count: 1,
      ad_experiment_count: 1,
      latest_goal_achievement_rate: 0.5,
      next_action: "evaluate",
      updated_at: "2026-07-10T00:00:00.000Z"
    },
    promotions: [
      {
        promotion_id: "promotion-1",
        channel: "email",
        marketing_theme: "여름 예약 리마인드",
        goal_metric: "booking_conversion_rate",
        goal_target_value: 0.2,
        goal_basis: "promotion_average",
        min_sample_size: 100,
        max_loop_count: 3,
        current_loop_count: 1,
        message_brief: null,
        offer_type: null,
        landing_url: "https://example.com",
        landing_type: "hotel_detail_page",
        status: "goal_not_met",
        target_segment_count: 1,
        ad_experiment_count: 1,
        latest_actual_value: 0.1,
        next_action: "next_loop",
        updated_at: "2026-07-10T00:00:00.000Z"
      }
    ],
    segments: [
      {
        analysis_id: "analysis-1",
        promotion_id: "promotion-1",
        segment_id: "segment-1",
        segment_name: "미예약 재방문 사용자",
        source: "ai_suggested",
        natural_language_query: null,
        rule_json: {},
        profile_json: {},
        content_brief_json: {},
        data_evidence_json: {},
        estimated_size: 200,
        sample_size: 80,
        total_eligible_user_count: 200,
        sample_ratio: 0.4,
        goal_metric: "booking_conversion_rate",
        latest_actual_value: 0.1,
        ad_experiment_id: "experiment-1",
        next_action: "next_loop",
        priority: "high",
        status: "goal_not_met"
      }
    ],
    ad_experiments: [],
    content_candidates: [],
    experiment_metrics: [
      {
        promotion_id: "promotion-1",
        promotion_run_id: "run-1",
        ad_experiment_id: "experiment-1",
        segment_id: "segment-1",
        content_id: "content-1",
        content_option_id: "option-1",
        metric: "booking_conversion_rate",
        target_value: 0.2,
        actual_value: 0.1,
        numerator_count: 8,
        denominator_count: 80,
        sample_size: 80,
        basis: "promotion_average",
        status: "goal_not_met",
        feedback: null,
        next_loop_required: true,
        result_json: {},
        created_at: "2026-07-10T00:00:00.000Z"
      }
    ],
    realtime_metrics: {
      campaign_id: "campaign-1",
      total_event_count: 0,
      recent_5m_event_count: 0,
      recent_1h_event_count: 0,
      peak_time: null,
      events: [],
      time_buckets: [],
      channel_breakdown: [],
      landing_type_breakdown: [],
      hotel_cluster_breakdown: [],
      delivery_status: {
        scheduled_count: 0,
        sent_count: 0,
        delivered_count: 0,
        opened_count: 0,
        clicked_count: 0,
        bounced_count: 0,
        failed_count: 0
      },
      banner_response: {
        promotion_impression_count: 0,
        promotion_click_count: 0,
        promotion_click_rate: 0,
        banner_position: null,
        hotel_search_count: 0,
        hotel_detail_view_count: 0,
        booking_complete_count: 0
      }
    }
  };
}

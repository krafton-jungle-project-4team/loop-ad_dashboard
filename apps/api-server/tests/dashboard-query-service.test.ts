import assert from "node:assert/strict";
import { test } from "node:test";
import { TransactionHost } from "@nestjs-cls/transactional";
import type { DashboardDecisionClient } from "../src/features/dashboard/provider/dashboard-decision-client.js";
import type { DashboardCampaignReader } from "../src/features/dashboard/repository/dashboard-campaign-reader.js";
import type { DashboardFunnelReader } from "../src/features/dashboard/repository/dashboard-funnel-reader.js";
import type { DashboardSegmentQueryRepository } from "../src/features/dashboard/repository/dashboard-segment-query-repository.js";

test("dashboard main returns campaign summaries from the campaign reader", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const reads: string[] = [];
  const realtimeReads: string[] = [];
  const service = new DashboardQueryService(
    {
      listCampaigns: async (projectId: string) => {
        reads.push(projectId);
        return [
          {
            campaign_id: "camp_summer_2026",
            campaign_name: "2026 여름 특가 세일",
            objective: "기존 유저의 여름 숙박 예약 전환 증가",
            primary_metric: "booking_conversion_rate",
            status: "active",
            start_date: "2026-07-15",
            end_date: "2026-08-31",
            promotion_count: 3,
            segment_count: 4,
            ad_experiment_count: 4,
            latest_goal_achievement_rate: 0.72,
            updated_at: "2026-07-03T00:00:00.000Z"
          }
        ];
      }
    } as unknown as DashboardCampaignReader,
    {
      ...emptyFunnelReader(),
      getProjectRealtimeMetrics: async (projectId: string) => {
        realtimeReads.push(projectId);
        return emptyRealtimeMetrics();
      }
    } as unknown as DashboardFunnelReader,
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const main = await service.main("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.deepEqual(realtimeReads, ["hotel-client-a"]);
  assert.equal(main.campaigns.length, 1);
  assert.equal(main.campaigns[0]?.campaign_id, "camp_summer_2026");
  assert.equal(main.campaigns[0]?.segment_count, 4);
  assert.equal(main.realtime_metrics.total_event_count, 0);
});

test("dashboard event catalog returns collected funnel event options", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const reads: string[] = [];
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    {
      ...emptyFunnelReader(),
      listEventCatalog: async (projectId: string) => {
        reads.push(projectId);
        return [
          {
            event_name: "hotel_detail_view",
            display_name: "숙소 상세 조회",
            event_count: 32
          }
        ];
      }
    } as unknown as DashboardFunnelReader,
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const eventCatalog = await service.eventCatalog("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.deepEqual(eventCatalog.events, [
    {
      event_name: "hotel_detail_view",
      display_name: "숙소 상세 조회",
      event_count: 32
    }
  ]);
});

test("dashboard funnels returns funnel summaries without loading steps", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const reads: string[] = [];
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    {
      ...emptyFunnelReader(),
      listFunnels: async (projectId: string) => {
        reads.push(projectId);
        return [
          {
            funnel_id: "funnel_hotel_booking",
            funnel_name: "숙소 예약 퍼널",
            domain_type: "hotel",
            status: "active",
            step_count: 3,
            created_at: "2026-07-03T00:00:00.000Z",
            updated_at: "2026-07-03T00:00:00.000Z"
          }
        ];
      }
    } as unknown as DashboardFunnelReader,
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const funnels = await service.funnels("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.equal(funnels.funnels[0]?.step_count, 3);
});

test("dashboard funnel detail delegates to the funnel reader", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const reads: unknown[] = [];
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    {
      ...emptyFunnelReader(),
      getFunnel: async (projectId: string, funnelId: string) => {
        reads.push({ funnelId, projectId });
        return {
          funnel_id: funnelId,
          funnel_name: "숙소 예약 퍼널",
          domain_type: "hotel",
          status: "active",
          steps: [
            {
              step_order: 1,
              step_name: "숙소 상세 조회",
              event_name: "hotel_detail_view"
            }
          ],
          created_at: "2026-07-03T00:00:00.000Z",
          updated_at: "2026-07-03T00:00:00.000Z"
        };
      }
    } as unknown as DashboardFunnelReader,
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const funnel = await service.funnel("hotel-client-a", "funnel_hotel_booking");

  assert.deepEqual(reads, [{ funnelId: "funnel_hotel_booking", projectId: "hotel-client-a" }]);
  assert.equal(funnel.steps[0]?.event_name, "hotel_detail_view");
});

test("dashboard create funnel delegates selected events to the funnel reader", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  installCountingTransactionHost();
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    {
      ...emptyFunnelReader(),
      createFunnel: async (projectId, request) => {
        writes.push({ projectId, request });
        return {
          funnel_id: "funnel_hotel_booking",
          funnel_name: request.funnel_name,
          domain_type: "hotel",
          status: "active",
          steps: request.steps.map((step, index) => ({
            step_order: index + 1,
            step_name: step.step_name,
            event_name: step.event_name
          })),
          created_at: "2026-07-03T00:00:00.000Z",
          updated_at: "2026-07-03T00:00:00.000Z"
        };
      }
    } as unknown as DashboardFunnelReader,
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const funnel = await service.createFunnel("hotel-client-a", {
    funnel_name: "숙소 예약 퍼널",
    steps: [
      { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
      { step_name: "예약 시작", event_name: "booking_start" },
      { step_name: "예약 완료", event_name: "booking_complete" }
    ]
  });

  assert.equal(writes.length, 1);
  assert.equal(funnel.steps[0]?.event_name, "hotel_detail_view");
  assert.equal(funnel.steps[2]?.step_name, "예약 완료");
});

test("dashboard update funnel delegates changed events to the funnel reader", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  installCountingTransactionHost();
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    {
      ...emptyFunnelReader(),
      updateFunnel: async (projectId, funnelId, request) => {
        writes.push({ funnelId, projectId, request });
        return {
          funnel_id: funnelId,
          funnel_name: request.funnel_name,
          domain_type: "hotel",
          status: "active",
          steps: request.steps.map((step, index) => ({
            step_order: index + 1,
            step_name: step.step_name,
            event_name: step.event_name
          })),
          created_at: "2026-07-03T00:00:00.000Z",
          updated_at: "2026-07-04T00:00:00.000Z"
        };
      }
    } as unknown as DashboardFunnelReader,
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const funnel = await service.updateFunnel("hotel-client-a", "funnel_hotel_booking", {
    funnel_name: "숙소 예약 수정 퍼널",
    steps: [
      { step_name: "검색 결과", event_name: "hotel_search" },
      { step_name: "예약 완료", event_name: "booking_complete" }
    ]
  });

  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], {
    funnelId: "funnel_hotel_booking",
    projectId: "hotel-client-a",
    request: {
      funnel_name: "숙소 예약 수정 퍼널",
      steps: [
        { step_name: "검색 결과", event_name: "hotel_search" },
        { step_name: "예약 완료", event_name: "booking_complete" }
      ]
    }
  });
  assert.equal(funnel.funnel_name, "숙소 예약 수정 퍼널");
  assert.equal(funnel.steps[0]?.event_name, "hotel_search");
});

test("dashboard funnel preview delegates selected events to the funnel reader", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const reads: unknown[] = [];
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    {
      ...emptyFunnelReader(),
      previewFunnelMetrics: async (projectId, request, dateRange) => {
        reads.push({ projectId, request, dateRange });
        return {
          steps: request.steps.map((step, index) => ({
            step_order: index + 1,
            step_name: step.step_name,
            event_name: step.event_name,
            event_count: index === 0 ? 42 : 18
          }))
        };
      }
    } as unknown as DashboardFunnelReader,
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const preview = await service.previewFunnelMetrics(
    "hotel-client-a",
    {
      steps: [
        { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
        { step_name: "예약 완료", event_name: "booking_complete" }
      ]
    },
    "last-14-days"
  );

  assert.equal(reads.length, 1);
  assert.equal((reads[0] as { dateRange: string }).dateRange, "last-14-days");
  assert.equal(preview.steps[0]?.event_count, 42);
  assert.equal(preview.steps[1]?.step_order, 2);
});

test("dashboard segment query preview delegates to the segment query repository", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  installCountingTransactionHost();
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      createQueryPreview: async (projectId, request) => {
        writes.push({ projectId, request });
        return {
          query_preview_id: "seg_query_preview_001",
          generated_sql: "SELECT user_id FROM funnel_step_events LIMIT 500",
          sample_size: 1342,
          total_eligible_user_count: 10000,
          sample_ratio: 0.1342,
          sample_size_status: "valid",
          columns: ["user_id"],
          rows: [{ user_id: "user_001" }]
        };
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient()
  );

  const preview = await service.createSegmentQueryPreview("hotel-client-a", {
    natural_language_query: "숙소 상세 조회 후 미예약 고객"
  });

  assert.equal(writes.length, 1);
  assert.equal(preview.sample_size_status, "valid");
  assert.deepEqual(preview.columns, ["user_id"]);
});

test("dashboard save segment delegates valid preview save to the segment query repository", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  installCountingTransactionHost();
  const service = new DashboardQueryService(
    emptyCampaignReader(),
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      saveSegment: async (projectId, request) => {
        writes.push({ projectId, request });
        return {
          segment_id: "seg_repeat_hotel_no_booking",
          project_id: projectId,
          segment_name: request.segment_name,
          source: "custom_chatkit",
          query_preview_id: request.query_preview_id,
          natural_language_query: "숙소 상세 조회 후 미예약 고객",
          generated_sql: "SELECT user_id FROM funnel_step_events LIMIT 500",
          sample_size: 1342,
          total_eligible_user_count: 10000,
          sample_ratio: 0.1342,
          status: "active"
        };
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient()
  );

  const segment = await service.saveSegment("hotel-client-a", {
    query_preview_id: "seg_query_preview_001",
    segment_name: "같은 숙소 반복 조회 후 미예약 고객"
  });

  assert.equal(writes.length, 1);
  assert.equal(segment.source, "custom_chatkit");
  assert.equal(segment.segment_name, "같은 숙소 반복 조회 후 미예약 고객");
});

test("dashboard promotion analysis resolves campaign and calls decision API client", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async (projectId, promotionId) => {
        calls.push({ kind: "read-promotion", projectId, promotionId });
        return {
          ad_experiment_count: 0,
          campaign_id: "camp_summer_2026",
          channel: "email",
          current_loop_count: 0,
          goal_basis: "promotion_average",
          goal_metric: "inflow_rate",
          goal_target_value: 0.1,
          landing_type: null,
          landing_url: null,
          latest_actual_value: null,
          marketing_theme: "여름 숙박 리마인드",
          max_loop_count: 3,
          message_brief: null,
          min_sample_size: 1000,
          next_action: "request_analysis",
          offer_type: null,
          promotion_id: promotionId,
          status: "analysis_ready",
          target_segment_count: 0,
          updated_at: "2026-07-04T00:00:00.000Z"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      recommendPromotionSegments: async (request) => {
        calls.push({ kind: "decision", request });
        return {
          analysis_id: "analysis_promo_email_001",
          promotion_id: request.promotionId,
          status: "queued"
        };
      },
      analyzePromotionSegments: async (request) => {
        calls.push({ kind: "decision-analysis", request });
        return {
          analysis_id: "analysis_promo_email_002",
          promotion_id: request.promotionId,
          status: "completed"
        };
      }
    } as unknown as DashboardDecisionClient
  );

  const response = await service.recommendPromotionSegments("hotel-client-a", "promo_email_001", {
    operator_instruction: "숙소 상세 조회 후 미예약 고객 중심으로 추천"
  });

  assert.equal(response.analysis_id, "analysis_promo_email_001");
  assert.deepEqual(calls, [
    {
      kind: "read-promotion",
      projectId: "hotel-client-a",
      promotionId: "promo_email_001"
    },
    {
      kind: "decision",
      request: {
        campaignId: "camp_summer_2026",
        projectId: "hotel-client-a",
        promotionId: "promo_email_001",
        request: {
          operator_instruction: "숙소 상세 조회 후 미예약 고객 중심으로 추천"
        }
      }
    }
  ]);

  calls.length = 0;
  const analysisResponse = await service.analyzePromotionSegments(
    "hotel-client-a",
    "promo_email_001",
    {
      segment_ids: ["seg_failed_001"],
      operator_instruction: null
    }
  );

  assert.equal(analysisResponse.analysis_id, "analysis_promo_email_002");
  assert.deepEqual(calls, [
    {
      kind: "read-promotion",
      projectId: "hotel-client-a",
      promotionId: "promo_email_001"
    },
    {
      kind: "decision-analysis",
      request: {
        campaignId: "camp_summer_2026",
        projectId: "hotel-client-a",
        promotionId: "promo_email_001",
        request: {
          segment_ids: ["seg_failed_001"],
          operator_instruction: null
        }
      }
    }
  ]);
});

test("dashboard promotion generation does not reuse another segment's candidates", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async (projectId, promotionId) => {
        calls.push({ kind: "read-promotion", projectId, promotionId });
        return {
          ad_experiment_count: 0,
          campaign_id: "camp_summer_2026",
          channel: "email",
          current_loop_count: 0,
          goal_basis: "promotion_average",
          goal_metric: "inflow_rate",
          goal_target_value: 0.1,
          landing_type: null,
          landing_url: null,
          latest_actual_value: null,
          marketing_theme: "여름 숙박 리마인드",
          max_loop_count: 3,
          message_brief: null,
          min_sample_size: 1000,
          next_action: "create_content",
          offer_type: null,
          promotion_id: promotionId,
          status: "content_ready",
          target_segment_count: 2,
          updated_at: "2026-07-04T00:00:00.000Z"
        };
      },
      getPromotionGenerationResult: async (projectId, promotionId, analysisId, segmentId) => {
        calls.push({ analysisId, kind: "read-generation", projectId, promotionId, segmentId });
        return {
          content_candidate_count: 0,
          generation_id: "generation_other_segment",
          promotion_id: promotionId,
          status: "completed"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      startPromotionGeneration: async (request) => {
        calls.push({ kind: "decision", request });
        return {
          content_candidate_count: 3,
          generation_id: "generation_promo_email_001",
          promotion_id: request.promotionId,
          status: "queued"
        };
      }
    } as unknown as DashboardDecisionClient
  );

  const response = await service.startPromotionGeneration("hotel-client-a", "promo_email_001", {
    analysis_id: "analysis_promo_email_001",
    segment_id: "segment_email_002",
    content_option_count: 3,
    operator_instruction: null
  });

  assert.equal(response.generation_id, "generation_promo_email_001");
  assert.deepEqual(calls, [
    {
      kind: "read-promotion",
      projectId: "hotel-client-a",
      promotionId: "promo_email_001"
    },
    {
      analysisId: "analysis_promo_email_001",
      kind: "read-generation",
      projectId: "hotel-client-a",
      promotionId: "promo_email_001",
      segmentId: "segment_email_002"
    },
    {
      kind: "decision",
      request: {
        campaignId: "camp_summer_2026",
        projectId: "hotel-client-a",
        promotionId: "promo_email_001",
        request: {
          analysis_id: "analysis_promo_email_001",
          segment_id: "segment_email_002",
          content_option_count: 3,
          operator_instruction: null
        }
      }
    }
  ]);
});

test("dashboard promotion generation retries when existing result is failed", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async (projectId, promotionId) => {
        calls.push({ kind: "read-promotion", projectId, promotionId });
        return {
          ad_experiment_count: 0,
          campaign_id: "camp_summer_2026",
          channel: "onsite_banner",
          current_loop_count: 0,
          goal_basis: "promotion_average",
          goal_metric: "booking_conversion_rate",
          goal_target_value: 0.03,
          landing_type: null,
          landing_url: "https://demo-stay.example.com/summer",
          latest_actual_value: null,
          marketing_theme: "여름 숙박 리마인드",
          max_loop_count: 3,
          message_brief: null,
          min_sample_size: 1000,
          next_action: "create_content",
          offer_type: null,
          promotion_id: promotionId,
          status: "content_ready",
          target_segment_count: 2,
          updated_at: "2026-07-04T00:00:00.000Z"
        };
      },
      getPromotionGenerationResult: async (projectId, promotionId, analysisId) => {
        calls.push({ analysisId, kind: "read-generation", projectId, promotionId });
        return {
          content_candidate_count: 0,
          generation_id: "generation_failed",
          promotion_id: promotionId,
          status: "failed"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      startPromotionGeneration: async (request) => {
        calls.push({ kind: "decision", request });
        return {
          content_candidate_count: 3,
          generation_id: "generation_retry",
          promotion_id: request.promotionId,
          status: "queued"
        };
      }
    } as unknown as DashboardDecisionClient
  );

  const response = await service.startPromotionGeneration("hotel-client-a", "promo_banner_001", {
    analysis_id: "analysis_promo_banner_001",
    content_option_count: 3,
    operator_instruction: null
  });

  assert.equal(response.generation_id, "generation_retry");
  assert.deepEqual(calls, [
    {
      kind: "read-promotion",
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001"
    },
    {
      analysisId: "analysis_promo_banner_001",
      kind: "read-generation",
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001"
    },
    {
      kind: "decision",
      request: {
        campaignId: "camp_summer_2026",
        projectId: "hotel-client-a",
        promotionId: "promo_banner_001",
        request: {
          analysis_id: "analysis_promo_banner_001",
          content_option_count: 3,
          operator_instruction: null
        }
      }
    }
  ]);
});

test("dashboard promotion run evaluation prepares legacy data before Decision", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      preparePromotionRunEvaluationCompatibility: async (projectId, promotionRunId) => {
        calls.push({ kind: "prepare-legacy-data", projectId, promotionRunId });
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      evaluatePromotionRun: async (request) => {
        calls.push({ kind: "decision", request });
        return {
          ad_experiment_results: [],
          failed_ad_experiment_ids: [],
          failed_segment_ids: [],
          next_loop_required: false,
          promotion_id: "promo_email_001",
          promotion_run_id: request.promotionRunId,
          status: "goal_met"
        };
      }
    } as unknown as DashboardDecisionClient
  );

  const result = await service.evaluatePromotionRun("hotel-client-a", "run_email_001");

  assert.equal(result.status, "goal_met");
  assert.deepEqual(calls, [
    {
      kind: "prepare-legacy-data",
      projectId: "hotel-client-a",
      promotionRunId: "run_email_001"
    },
    {
      kind: "decision",
      request: { promotionRunId: "run_email_001" }
    }
  ]);
});

test("dashboard confirms accepted suggestions in DB without calling analysis", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  const transactionHost = installCountingTransactionHost();
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      confirmPromotionSegmentSuggestions: async (projectId, promotionId, request) => {
        writes.push({ projectId, promotionId, request });
        return {
          promotion_id: promotionId,
          confirmed_segment_count: 2,
          status: "confirmed"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const result = await service.confirmPromotionSegmentSuggestions(
    "hotel-client-a",
    "promo_banner_001",
    { confirmed_by: "operator-1" }
  );

  assert.equal(transactionHost.calls.length, 1);
  assert.deepEqual(writes, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001",
      request: { confirmed_by: "operator-1" }
    }
  ]);
  assert.equal(result.confirmed_segment_count, 2);
});

test("dashboard reject content candidate runs inside transaction host", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  const transactionHost = installCountingTransactionHost();
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      rejectContentCandidate: async (projectId, promotionId, segmentId, contentId, request) => {
        writes.push({ contentId, projectId, promotionId, request, segmentId });
        return {
          content_id: contentId,
          promotion_id: promotionId,
          rejected_at: "2026-07-04T00:00:00.000Z",
          segment_id: segmentId,
          status: "rejected"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const result = await service.rejectContentCandidate(
    "hotel-client-a",
    "promo_banner_001",
    "seg_vip",
    "content_vip_b",
    { operator_note: "후보 B 거절" }
  );

  assert.equal(transactionHost.calls.length, 1);
  assert.deepEqual(writes, [
    {
      contentId: "content_vip_b",
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001",
      request: { operator_note: "후보 B 거절" },
      segmentId: "seg_vip"
    }
  ]);
  assert.equal(result.content_id, "content_vip_b");
  assert.equal(result.status, "rejected");
});

test("dashboard content selection cancellation runs inside transaction host", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  const transactionHost = installCountingTransactionHost();
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      unapproveContentCandidate: async (projectId, promotionId, segmentId, contentId, request) => {
        writes.push({ contentId, projectId, promotionId, request, segmentId });
        return {
          content_id: contentId,
          content_option_id: "option_a",
          promotion_id: promotionId,
          segment_id: segmentId,
          status: "draft"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const result = await service.unapproveContentCandidate(
    "hotel-client-a",
    "promo_banner_001",
    "seg_vip",
    "content_vip_a",
    {}
  );

  assert.equal(transactionHost.calls.length, 1);
  assert.deepEqual(writes, [
    {
      contentId: "content_vip_a",
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001",
      request: {},
      segmentId: "seg_vip"
    }
  ]);
  assert.equal(result.content_id, "content_vip_a");
  assert.equal(result.status, "draft");
});

function emptyCampaignReader(): DashboardCampaignReader {
  return {
    getPromotionGenerationResult: async () => undefined,
    listCampaigns: async () => [],
    rejectContentCandidate: async () => {
      throw new Error("Unexpected rejectContentCandidate call.");
    },
    unapproveContentCandidate: async () => {
      throw new Error("Unexpected unapproveContentCandidate call.");
    }
  } as unknown as DashboardCampaignReader;
}

function emptyFunnelReader(): DashboardFunnelReader {
  return {
    createFunnel: async () => {
      throw new Error("Unexpected createFunnel call.");
    },
    getFunnel: async () => {
      throw new Error("Unexpected getFunnel call.");
    },
    getFunnelMetrics: async () => {
      throw new Error("Unexpected getFunnelMetrics call.");
    },
    getProjectRealtimeMetrics: async () => emptyRealtimeMetrics(),
    listEventCatalog: async () => [],
    listFunnels: async () => [],
    previewFunnelMetrics: async () => {
      throw new Error("Unexpected previewFunnelMetrics call.");
    },
    updateFunnel: async () => {
      throw new Error("Unexpected updateFunnel call.");
    }
  } as unknown as DashboardFunnelReader;
}

function emptyRealtimeMetrics() {
  return {
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
  };
}

function emptySegmentQueryRepository(): DashboardSegmentQueryRepository {
  return {
    createQueryPreview: async () => {
      throw new Error("Unexpected createQueryPreview call.");
    },
    saveSegment: async () => {
      throw new Error("Unexpected saveSegment call.");
    }
  } as unknown as DashboardSegmentQueryRepository;
}

function emptyDecisionClient(): DashboardDecisionClient {
  return {
    recommendPromotionSegments: async () => {
      throw new Error("Unexpected recommendPromotionSegments call.");
    },
    analyzePromotionSegments: async () => {
      throw new Error("Unexpected analyzePromotionSegments call.");
    },
    startPromotionGeneration: async () => {
      throw new Error("Unexpected startPromotionGeneration call.");
    }
  } as unknown as DashboardDecisionClient;
}

function installCountingTransactionHost() {
  const calls: string[] = [];

  new TransactionHost({
    connectionName: undefined,
    defaultTxOptions: {},
    enableTransactionProxy: false,
    extraProviderTokens: [],
    getFallbackInstance: () => ({}),
    wrapWithTransaction: async (_options: unknown, callback: () => Promise<unknown>) => {
      calls.push("transactional");
      return callback();
    }
  } as never);

  return { calls };
}

function setRequiredEnv() {
  process.env.LOOPAD_ENV ??= "local";
  process.env.LOOPAD_SERVICE_ID ??= "dashboard-api";
  process.env.PORT ??= "8080";
  process.env.LOOPAD_AURORA_HOST ??= "localhost";
  process.env.LOOPAD_AURORA_PORT ??= "15432";
  process.env.LOOPAD_AURORA_DATABASE ??= "loopad";
  process.env.LOOPAD_AURORA_USERNAME ??= "loopad";
  process.env.LOOPAD_AURORA_PASSWORD ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_URL ??= "http://localhost:18123";
  process.env.LOOPAD_CLICKHOUSE_DATABASE ??= "loopad";
  process.env.LOOPAD_CLICKHOUSE_USERNAME ??= "loopad_app";
  process.env.LOOPAD_CLICKHOUSE_PASSWORD ??= "loopad_local_password";
  process.env.LOOPAD_DECISION_API_BASE_URL ??= "http://localhost:8081";
  process.env.LOOPAD_INTERNAL_API_KEY ??= "test-internal-key";
  process.env.LOOPAD_OPENAI_API_KEY ??= "test-openai-api-key";
  process.env.LOOPAD_DEMO_DISPATCH_RECIPIENTS ??= JSON.stringify([
    {
      userId: "user-1",
      email: "demo-recipient-1@loop-ad.org",
      phoneNumber: "+821012345001"
    }
  ]);
}

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
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const main = await service.main("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.equal(main.campaigns.length, 1);
  assert.equal(main.campaigns[0]?.campaign_id, "camp_summer_2026");
  assert.equal(main.campaigns[0]?.segment_count, 4);
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
          target_audience: "existing_users",
          target_segment_count: 0,
          updated_at: "2026-07-04T00:00:00.000Z"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      startPromotionAnalysis: async (request) => {
        calls.push({ kind: "decision", request });
        return {
          analysis_id: "analysis_promo_email_001",
          promotion_id: request.promotionId,
          status: "queued"
        };
      }
    } as unknown as DashboardDecisionClient
  );

  const response = await service.startPromotionAnalysis("hotel-client-a", "promo_email_001", {
    focus_segment_ids: null,
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
          focus_segment_ids: null,
          operator_instruction: "숙소 상세 조회 후 미예약 고객 중심으로 추천"
        }
      }
    }
  ]);
});

test("dashboard promotion generation resolves campaign and calls decision API client", async () => {
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
          target_audience: "existing_users",
          target_segment_count: 2,
          updated_at: "2026-07-04T00:00:00.000Z"
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
      kind: "decision",
      request: {
        campaignId: "camp_summer_2026",
        projectId: "hotel-client-a",
        promotionId: "promo_email_001",
        request: {
          analysis_id: "analysis_promo_email_001",
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
          target_audience: "existing_users",
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

function emptyCampaignReader(): DashboardCampaignReader {
  return {
    getPromotionGenerationResult: async () => undefined,
    listCampaigns: async () => [],
    rejectContentCandidate: async () => {
      throw new Error("Unexpected rejectContentCandidate call.");
    }
  } as unknown as DashboardCampaignReader;
}

function emptyFunnelReader(): DashboardFunnelReader {
  return {
    createFunnel: async () => {
      throw new Error("Unexpected createFunnel call.");
    },
    listEventCatalog: async () => [],
    listFunnels: async () => []
  } as unknown as DashboardFunnelReader;
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
    startPromotionAnalysis: async () => {
      throw new Error("Unexpected startPromotionAnalysis call.");
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

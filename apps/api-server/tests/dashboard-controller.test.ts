import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { AppError } from "../src/app-errors.js";
import type { DashboardQueryService } from "../src/features/dashboard/service/dashboard-query.service.js";

test("dashboard controller requires project_id for event catalog", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const controller = new DashboardController(emptyDashboardQuery());

  await assert.rejects(
    () => controller.eventCatalog(undefined),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.code === "DASHBOARD_PROJECT_ID_REQUIRED"
  );
});

test("dashboard controller parses event catalog response", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: string[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    eventCatalog: async (projectId: string) => {
      reads.push(projectId);
      return {
        events: [
          {
            event_name: "hotel_detail_view",
            display_name: "숙소 상세 조회",
            event_count: 12
          }
        ]
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.eventCatalog("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.deepEqual(response.events, [
    {
      event_name: "hotel_detail_view",
      display_name: "숙소 상세 조회",
      event_count: 12
    }
  ]);
});

test("dashboard controller rejects invalid funnel create body", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const controller = new DashboardController(emptyDashboardQuery());

  await assert.rejects(
    () =>
      controller.createFunnel("hotel-client-a", {
        funnel_name: "숙소 예약 퍼널",
        steps: [{ step_name: "숙소 상세 조회", event_name: "hotel_detail_view" }]
      }),
    (error) => error instanceof z.ZodError
  );
});

test("dashboard controller rejects unsupported funnel event names", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const controller = new DashboardController(emptyDashboardQuery());

  await assert.rejects(
    () =>
      controller.createFunnel("hotel-client-a", {
        funnel_name: "숙소 예약 퍼널",
        steps: [
          { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
          { step_name: "임의 이벤트", event_name: "unknown_event" }
        ]
      }),
    (error) => error instanceof z.ZodError
  );
});

test("dashboard controller parses create funnel body before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
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
  } as unknown as DashboardQueryService);

  const response = await controller.createFunnel("hotel-client-a", {
    funnel_name: "숙소 예약 퍼널",
    steps: [
      { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
      { step_name: "예약 완료", event_name: "booking_complete" }
    ]
  });

  assert.equal(writes.length, 1);
  assert.equal(response.steps[0]?.event_name, "hotel_detail_view");
  assert.equal(response.steps[1]?.step_name, "예약 완료");
});

test("dashboard controller parses segment query preview body before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    createSegmentQueryPreview: async (projectId, request) => {
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
  } as unknown as DashboardQueryService);

  const response = await controller.createSegmentQueryPreview("hotel-client-a", {
    natural_language_query: "숙소 상세 조회 후 미예약 고객"
  });

  assert.equal(writes.length, 1);
  assert.equal(response.query_preview_id, "seg_query_preview_001");
  assert.equal(response.sample_size_status, "valid");
});

test("dashboard controller parses save segment body before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    saveSegment: async (projectId, request) => {
      writes.push({ projectId, request });
      return {
        segment_id: "seg_custom_001",
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
  } as unknown as DashboardQueryService);

  const response = await controller.saveSegment("hotel-client-a", {
    query_preview_id: "seg_query_preview_001",
    segment_name: "같은 숙소 반복 조회 후 미예약 고객"
  });

  assert.equal(writes.length, 1);
  assert.equal(response.source, "custom_chatkit");
  assert.equal(response.segment_name, "같은 숙소 반복 조회 후 미예약 고객");
});

test("dashboard controller lists promotion scoped segment definitions by promotion", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    promotionScopedSegmentDefinitions: async (projectId, promotionId) => {
      reads.push({ projectId, promotionId });
      return {
        segments: [
          {
            campaign_id: "camp_summer_2026",
            generated_sql: null,
            natural_language_query: "숙소 상세 조회 후 미예약 고객",
            profile_json: {},
            promotion_id: promotionId,
            query_preview_id: null,
            rule_json: { event_name: "hotel_detail_view" },
            sample_ratio: 0.12,
            sample_size: 1200,
            segment_id: "seg_manual_001",
            segment_name: "상세 조회 후 미예약 고객",
            source: "manual_rule",
            status: "active",
            total_eligible_user_count: 10000
          }
        ]
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.promotionScopedSegmentDefinitions(
    "promo_email_001",
    "hotel-client-a"
  );

  assert.deepEqual(reads, [{ projectId: "hotel-client-a", promotionId: "promo_email_001" }]);
  assert.equal(response.segments[0]?.promotion_id, "promo_email_001");
  assert.equal(response.segments[0]?.source, "manual_rule");
});

test("dashboard controller parses promotion scoped segment create body", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    createPromotionScopedSegmentDefinition: async (projectId, promotionId, request) => {
      writes.push({ projectId, promotionId, request });
      return {
        campaign_id: "camp_summer_2026",
        generated_sql: null,
        natural_language_query: request.natural_language_query ?? null,
        profile_json: request.profile_json,
        promotion_id: promotionId,
        query_preview_id: null,
        rule_json: request.rule_json,
        sample_ratio: request.sample_ratio,
        sample_size: request.sample_size,
        segment_id: "seg_manual_001",
        segment_name: request.segment_name,
        source: "manual_rule",
        status: "active",
        total_eligible_user_count: request.total_eligible_user_count
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.createPromotionScopedSegmentDefinition(
    "promo_email_001",
    "hotel-client-a",
    {
      natural_language_query: "숙소 상세 조회 후 미예약 고객",
      rule_json: { event_name: "hotel_detail_view" },
      sample_ratio: 0.12,
      sample_size: 1200,
      segment_name: "상세 조회 후 미예약 고객",
      total_eligible_user_count: 10000
    }
  );

  assert.equal(writes.length, 1);
  assert.equal(response.promotion_id, "promo_email_001");
  assert.equal(response.segment_name, "상세 조회 후 미예약 고객");
});

test("dashboard controller archives promotion scoped segment definition by promotion", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    archivePromotionScopedSegmentDefinition: async (projectId, promotionId, segmentId) => {
      writes.push({ projectId, promotionId, segmentId });
      return {
        promotion_id: promotionId,
        segment_id: segmentId,
        status: "archived"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.archivePromotionScopedSegmentDefinition(
    "promo_email_001",
    "seg_manual_001",
    "hotel-client-a"
  );

  assert.deepEqual(writes, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo_email_001",
      segmentId: "seg_manual_001"
    }
  ]);
  assert.equal(response.status, "archived");
});

test("dashboard controller parses promotion analysis request before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    startPromotionAnalysis: async (projectId, promotionId, request) => {
      writes.push({ projectId, promotionId, request });
      return {
        analysis_id: "analysis_promo_email_001",
        promotion_id: promotionId,
        status: "queued"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.startPromotionAnalysis("promo_email_001", "hotel-client-a", {
    focus_segment_ids: null,
    operator_instruction: "전환 가능성이 높은 세그먼트 추천"
  });

  assert.deepEqual(writes, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo_email_001",
      request: {
        focus_segment_ids: null,
        operator_instruction: "전환 가능성이 높은 세그먼트 추천"
      }
    }
  ]);
  assert.equal(response.analysis_id, "analysis_promo_email_001");
  assert.equal(response.status, "queued");
});

test("dashboard controller parses promotion detail analyses response", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    promotionDetail: async (projectId, promotionId) => {
      reads.push({ projectId, promotionId });
      return {
        promotion: {
          campaign_id: "camp_summer_2026",
          promotion_id: promotionId,
          channel: "email",
          marketing_theme: "email_inflow",
          target_audience: "existing_users",
          goal_metric: "inflow_rate",
          goal_target_value: 0.1,
          goal_basis: "promotion_average",
          min_sample_size: 1000,
          max_loop_count: 3,
          current_loop_count: 1,
          message_brief: "기존 고객에게 캠페인 혜택을 안내합니다.",
          offer_type: null,
          landing_url: null,
          landing_type: null,
          status: "analysis_ready",
          target_segment_count: 2,
          ad_experiment_count: 1,
          latest_actual_value: 0.08,
          next_action: "monitor",
          updated_at: "2026-07-04T00:00:00.000Z"
        },
        analyses: [
          {
            analysis_id: "analysis_email_001",
            promotion_id: promotionId,
            focus_segment_ids: ["seg_near_checkin"],
            operator_instruction: "체크인 임박 고객을 우선 분석",
            input_snapshot_json: { channel: "email" },
            profile_summary_json: { reason: "recent hotel detail views" },
            output_json: { recommended_segments: ["seg_near_checkin"] },
            status: "completed",
            created_at: "2026-07-04T00:00:00.000Z",
            updated_at: "2026-07-04T00:00:00.000Z"
          }
        ],
        segments: [],
        experiment_metrics: [],
        realtime_metrics: emptyRealtimeMetrics({ promotion_id: promotionId }),
        segment_realtime_summaries: []
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.promotionDetail("promo_email_default", "hotel-client-a");

  assert.deepEqual(reads, [
    { projectId: "hotel-client-a", promotionId: "promo_email_default" }
  ]);
  assert.equal(response.analyses.length, 1);
  assert.equal(response.analyses[0]?.analysis_id, "analysis_email_001");
  assert.equal(response.analyses[0]?.focus_segment_ids[0], "seg_near_checkin");
});

test("dashboard controller parses content approval body before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    approveContentCandidate: async (projectId, promotionId, segmentId, contentId, request) => {
      writes.push({ contentId, projectId, promotionId, request, segmentId });
      return {
        ad_experiment_id: "ad_exp_vip_001",
        promotion_run_id: "run_banner_001",
        promotion_id: promotionId,
        segment_id: segmentId,
        content_id: contentId,
        content_option_id: "option_a",
        channel: "onsite_banner",
        loop_count: 1,
        goal_metric: "booking_conversion_rate",
        goal_target_value: 0.03,
        goal_basis: "all_segments",
        status: "approved"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.approveContentCandidate(
    "promo_banner_001",
    "seg_vip",
    "content_vip_a",
    "hotel-client-a",
    { operator_note: "VIP 세그먼트 후보 A 승인" }
  );

  assert.deepEqual(writes, [
    {
      contentId: "content_vip_a",
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001",
      request: { operator_note: "VIP 세그먼트 후보 A 승인" },
      segmentId: "seg_vip"
    }
  ]);
  assert.equal(response.ad_experiment_id, "ad_exp_vip_001");
  assert.equal(response.status, "approved");
});

test("dashboard controller parses content rejection body before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
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
  } as unknown as DashboardQueryService);

  const response = await controller.rejectContentCandidate(
    "promo_banner_001",
    "seg_vip",
    "content_vip_b",
    "hotel-client-a",
    { operator_note: "후보 B 거절" }
  );

  assert.deepEqual(writes, [
    {
      contentId: "content_vip_b",
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001",
      request: { operator_note: "후보 B 거절" },
      segmentId: "seg_vip"
    }
  ]);
  assert.equal(response.content_id, "content_vip_b");
  assert.equal(response.status, "rejected");
});

function emptyDashboardQuery(): DashboardQueryService {
  return {
    approveContentCandidate: async () => {
      throw new Error("Unexpected approveContentCandidate call.");
    },
    rejectContentCandidate: async () => {
      throw new Error("Unexpected rejectContentCandidate call.");
    },
    createFunnel: async () => {
      throw new Error("Unexpected createFunnel call.");
    },
    createSegmentQueryPreview: async () => {
      throw new Error("Unexpected createSegmentQueryPreview call.");
    },
    eventCatalog: async () => ({ events: [] }),
    funnels: async () => ({ funnels: [] }),
    main: async () => ({ campaigns: [] }),
    saveSegment: async () => {
      throw new Error("Unexpected saveSegment call.");
    },
    startPromotionAnalysis: async () => {
      throw new Error("Unexpected startPromotionAnalysis call.");
    }
  } as unknown as DashboardQueryService;
}

function emptyRealtimeMetrics(resourceIds: Record<string, string>) {
  return {
    ...resourceIds,
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

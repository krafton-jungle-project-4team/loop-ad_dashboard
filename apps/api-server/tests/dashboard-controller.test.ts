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

test("dashboard controller returns promotion offers for the selected project", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: string[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    promotionOffers: async (projectId: string) => {
      reads.push(projectId);
      return {
        project_id: projectId,
        catalog_id: "hotel-catalog",
        catalog_version: "v2",
        offers: [
          {
            offer_id: "jeju-ocean-breeze-006",
            hotel_name: "Jeju Ocean Breeze Resort",
            destination_id: "jeju",
            currency: "KRW",
            sale_price_per_night: 278000,
            original_price_per_night: null,
            discount_rate_percent: null,
            image_url: "https://example.com/hotels/jeju-ocean-breeze-006.jpg",
            destination_url: "https://example.com/hotel/jeju-ocean-breeze-006"
          }
        ]
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.promotionOffers("hotel-client-a");

  assert.deepEqual(reads, ["hotel-client-a"]);
  assert.equal(response.offers[0]?.offer_id, "jeju-ocean-breeze-006");
});

test("dashboard controller rejects campaign creation with a past start date", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const controller = new DashboardController(emptyDashboardQuery());

  await assert.rejects(
    () =>
      controller.createCampaign("hotel-client-a", {
        campaign_name: "과거 캠페인",
        end_date: "2000-01-02",
        start_date: "2000-01-01"
      }),
    (error) =>
      error instanceof z.ZodError && error.issues.some((issue) => issue.path[0] === "start_date")
  );
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

test("dashboard controller parses update funnel body before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
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
  } as unknown as DashboardQueryService);

  const response = await controller.updateFunnel("funnel_hotel_booking", "hotel-client-a", {
    funnel_name: "숙소 예약 수정 퍼널",
    steps: [
      { step_name: "검색 결과", event_name: "hotel_search" },
      { step_name: "예약 완료", event_name: "booking_complete" }
    ]
  });

  assert.deepEqual(writes, [
    {
      funnelId: "funnel_hotel_booking",
      projectId: "hotel-client-a",
      request: {
        funnel_name: "숙소 예약 수정 퍼널",
        steps: [
          { step_name: "검색 결과", event_name: "hotel_search" },
          { step_name: "예약 완료", event_name: "booking_complete" }
        ]
      }
    }
  ]);
  assert.equal(response.steps[0]?.event_name, "hotel_search");
});

test("dashboard controller parses funnel detail response", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    funnel: async (projectId, funnelId) => {
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
  } as unknown as DashboardQueryService);

  const response = await controller.funnel("funnel_hotel_booking", "hotel-client-a");

  assert.deepEqual(reads, [{ funnelId: "funnel_hotel_booking", projectId: "hotel-client-a" }]);
  assert.equal(response.steps[0]?.event_name, "hotel_detail_view");
});

test("dashboard controller delegates scoped funnel metrics", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    funnelMetrics: async (projectId, funnelId, scope) => {
      reads.push({ funnelId, projectId, scope });
      return {
        funnel_id: funnelId,
        funnel_name: "숙소 예약 퍼널",
        steps: [
          {
            step_order: 1,
            step_name: "노출",
            event_name: "promotion_impression",
            event_count: 10
          }
        ]
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.funnelMetrics(
    "funnel_hotel_booking",
    "hotel-client-a",
    "segment",
    undefined,
    "promo_email_001",
    "seg_repeat_hotel_no_booking"
  );

  assert.deepEqual(reads, [
    {
      funnelId: "funnel_hotel_booking",
      projectId: "hotel-client-a",
      scope: {
        promotion_id: "promo_email_001",
        scope_type: "segment",
        segment_id: "seg_repeat_hotel_no_booking"
      }
    }
  ]);
  assert.equal(response.steps[0]?.event_count, 10);
});

test("dashboard controller parses funnel preview body before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    previewFunnelMetrics: async (projectId, request, dateRange) => {
      writes.push({ projectId, request, dateRange });
      return {
        steps: request.steps.map((step, index) => ({
          step_order: index + 1,
          step_name: step.step_name,
          event_name: step.event_name,
          event_count: index === 0 ? 20 : 9
        }))
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.previewFunnelMetrics(
    "hotel-client-a",
    {
      steps: [
        { step_name: "숙소 상세 조회", event_name: "hotel_detail_view" },
        { step_name: "예약 완료", event_name: "booking_complete" }
      ]
    },
    "last-30-days"
  );

  assert.equal(writes.length, 1);
  assert.equal((writes[0] as { dateRange: string }).dateRange, "last-30-days");
  assert.equal(response.steps[0]?.event_count, 20);
  assert.equal(response.steps[1]?.event_name, "booking_complete");
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

test("dashboard controller parses segment assistant requests and returns audience counts", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    assistPromotionSegment: async (projectId, promotionId, request) => {
      writes.push({ projectId, promotionId, request });
      return {
        action: "audience_query",
        assistant_message: "조건에 맞는 고객은 120명입니다.",
        segment_name: "최근 제주 미예약 고객",
        lookback_days: 30,
        condition_labels: ["제주 숙소 검색", "예약 완료 없음"],
        minimum_sample_size: 100,
        condition_diagnostics: [],
        suggested_adjustments: [],
        preview: {
          query_preview_id: "seg_query_preview_002",
          generated_sql: "SELECT user_id FROM funnel_step_events LIMIT 500",
          sample_size: 120,
          total_eligible_user_count: 1000,
          sample_ratio: 0.12,
          sample_size_status: "valid",
          columns: ["user_id"],
          rows: []
        }
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.assistPromotionSegment("promo_summer", "hotel-client-a", {
    message: "최근 제주 미예약 고객은 몇 명이야?"
  });

  assert.deepEqual(writes, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo_summer",
      request: {
        message: "최근 제주 미예약 고객은 몇 명이야?",
        conversation: []
      }
    }
  ]);
  assert.equal(response.action, "audience_query");
  assert.equal(response.preview?.sample_size, 120);
});

test("dashboard controller returns measured refinement options for an AI suggestion", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const reads: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    promotionSegmentAssistantSourceContext: async (projectId, promotionId, suggestionId) => {
      reads.push({ projectId, promotionId, suggestionId });
      return {
        suggestion_id: suggestionId,
        segment_id: "segment-1",
        title: "예약 직전 이탈 고객",
        strategy_role: "예약 이탈 회수형",
        candidate_type: "funnel_recovery",
        sample_size: 100,
        base_condition_labels: ["예약 시작 후 미완료"],
        reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
        suggested_refinements: [
          {
            refinement_key: "ref_1111111111111111",
            label: "호텔 상세 조회 2회 이상",
            prompt: "추천 고객군 안에서 호텔 상세 조회를 2회 이상 한 고객으로 좁혀줘",
            estimated_user_count: 84,
            retention_ratio: 0.84,
            meets_min_sample_size: false
          }
        ]
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.promotionSegmentAssistantSourceContext(
    "promo_summer",
    "suggestion-1",
    "hotel-client-a"
  );

  assert.deepEqual(reads, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo_summer",
      suggestionId: "suggestion-1"
    }
  ]);
  assert.equal(response.suggested_refinements[0]?.estimated_user_count, 84);
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

test("dashboard controller parses segment recommendation request before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    recommendPromotionSegments: async (projectId, promotionId, request) => {
      writes.push({ projectId, promotionId, request });
      return {
        analysis_id: "analysis_promo_email_001",
        promotion_id: promotionId,
        status: "queued"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.recommendPromotionSegments(
    "promo_email_001",
    "hotel-client-a",
    {
      operator_instruction: "전환 가능성이 높은 세그먼트 추천"
    }
  );

  assert.deepEqual(writes, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo_email_001",
      request: {
        operator_instruction: "전환 가능성이 높은 세그먼트 추천"
      }
    }
  ]);
  assert.equal(response.analysis_id, "analysis_promo_email_001");
  assert.equal(response.status, "queued");
});

test("dashboard controller requires segment ids for explicit analysis", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    analyzePromotionSegments: async (projectId, promotionId, request) => {
      writes.push({ projectId, promotionId, request });
      return {
        analysis_id: "analysis_promo_email_002",
        promotion_id: promotionId,
        status: "completed"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.analyzePromotionSegments("promo_email_001", "hotel-client-a", {
    segment_ids: ["seg_failed_001"],
    operator_instruction: null
  });

  assert.deepEqual(writes, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo_email_001",
      request: {
        segment_ids: ["seg_failed_001"],
        operator_instruction: null
      }
    }
  ]);
  assert.equal(response.analysis_id, "analysis_promo_email_002");
  await assert.rejects(
    controller.analyzePromotionSegments("promo_email_001", "hotel-client-a", {}),
    /segment_ids/
  );
});

test("dashboard controller parses promotion generation request before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    startPromotionGeneration: async (projectId, promotionId, request) => {
      writes.push({ projectId, promotionId, request });
      return {
        content_candidate_count: 3,
        generation_id: "generation_promo_email_001",
        promotion_id: promotionId,
        status: "queued"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.startPromotionGeneration("promo_email_001", "hotel-client-a", {
    analysis_id: "analysis_promo_email_001",
    content_option_count: 3,
    operator_instruction: null
  });

  assert.deepEqual(writes, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo_email_001",
      request: {
        analysis_id: "analysis_promo_email_001",
        content_option_count: 3,
        operator_instruction: null
      }
    }
  ]);
  assert.equal(response.generation_id, "generation_promo_email_001");
  assert.equal(response.content_candidate_count, 3);
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
          goal_metric: "inflow_rate",
          goal_target_value: 0.1,
          goal_basis: "promotion_average",
          min_sample_size: 1000,
          max_loop_count: 3,
          current_loop_count: 1,
          execution_mode: "automatic",
          scheduled_start_at: "2026-07-20T00:00:00.000Z",
          scheduled_end_at: "2026-08-20T00:00:00.000Z",
          loop_interval_unit: "day",
          loop_interval_value: 1,
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

  assert.deepEqual(reads, [{ projectId: "hotel-client-a", promotionId: "promo_email_default" }]);
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
        content_id: contentId,
        content_option_id: "option_a",
        promotion_id: promotionId,
        segment_id: segmentId,
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
  assert.equal(response.content_id, "content_vip_a");
  assert.equal(response.status, "approved");
});

test("dashboard controller parses content selection cancellation before delegating", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
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
  } as unknown as DashboardQueryService);

  const response = await controller.unapproveContentCandidate(
    "promo_banner_001",
    "seg_vip",
    "content_vip_a",
    "hotel-client-a",
    {}
  );

  assert.deepEqual(writes, [
    {
      contentId: "content_vip_a",
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001",
      request: {},
      segmentId: "seg_vip"
    }
  ]);
  assert.equal(response.content_id, "content_vip_a");
  assert.equal(response.status, "draft");
});

test("dashboard controller sends validated copy and public origin to the edit service", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    updateContentCandidateCopy: async (
      projectId,
      promotionId,
      segmentId,
      contentId,
      request,
      publicOrigin
    ) => {
      writes.push({ contentId, projectId, promotionId, publicOrigin, request, segmentId });
      return {
        body: request.body,
        content_id: contentId,
        cta: request.cta,
        headline: request.headline,
        html_url: `${publicOrigin}/api/dashboard/v1/content.html`,
        promotion_id: promotionId,
        segment_id: segmentId,
        status: "draft",
        updated_at: "2026-07-16T00:00:00.000Z"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.updateContentCandidateCopy(
    "promotion-a",
    "segment-a",
    "content-a",
    "project-a",
    { headline: " 새 제목 ", body: " 새 본문 ", cta: " 혜택 보기 " },
    {
      headers: {
        host: "api-server:3000",
        "x-forwarded-host": "dashboard.api.dev.loop-ad.org",
        "x-forwarded-proto": "https"
      },
      protocol: "http"
    }
  );

  assert.deepEqual(writes, [
    {
      contentId: "content-a",
      projectId: "project-a",
      promotionId: "promotion-a",
      publicOrigin: "https://dashboard.api.dev.loop-ad.org",
      request: { headline: "새 제목", body: "새 본문", cta: "혜택 보기" },
      segmentId: "segment-a"
    }
  ]);
  assert.equal(response.headline, "새 제목");
});

test("dashboard controller sends trimmed HTML feedback and public origin to the AI revision service", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    reviseContentCandidateHtml: async (
      projectId,
      promotionId,
      segmentId,
      contentId,
      request,
      publicOrigin
    ) => {
      writes.push({ contentId, projectId, promotionId, publicOrigin, request, segmentId });
      return {
        body: "새 본문",
        change_summary: "혜택과 버튼을 위로 배치했습니다.",
        content_id: contentId,
        cta: "혜택 보기",
        headline: "새 제목",
        html_url: `${publicOrigin}/api/dashboard/v1/content.html`,
        promotion_id: promotionId,
        segment_id: segmentId,
        status: "draft",
        updated_at: "2026-07-16T00:00:00.000Z"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.reviseContentCandidateHtml(
    "promotion-a",
    "segment-a",
    "content-a",
    "project-a",
    { feedback: "  혜택과 버튼이 먼저 보이게 바꿔줘  " },
    {
      headers: {
        host: "api-server:3000",
        "x-forwarded-host": "dashboard.api.dev.loop-ad.org",
        "x-forwarded-proto": "https"
      },
      protocol: "http"
    }
  );

  assert.deepEqual(writes, [
    {
      contentId: "content-a",
      projectId: "project-a",
      promotionId: "promotion-a",
      publicOrigin: "https://dashboard.api.dev.loop-ad.org",
      request: { feedback: "혜택과 버튼이 먼저 보이게 바꿔줘" },
      segmentId: "segment-a"
    }
  ]);
  assert.match(response.change_summary, /버튼/);
});

test("dashboard controller starts an ad experiment before dispatch", async () => {
  setRequiredEnv();
  const { DashboardController } =
    await import("../src/features/dashboard/controller/dashboard.controller.js");
  const writes: unknown[] = [];
  const controller = new DashboardController({
    ...emptyDashboardQuery(),
    startAdExperiment: async (projectId, promotionId, adExperimentId) => {
      writes.push({ adExperimentId, projectId, promotionId });
      return {
        ad_experiment_id: adExperimentId,
        promotion_run_id: "run_email_001",
        promotion_id: promotionId,
        segment_id: "seg_vip",
        content_id: "content_vip_a",
        content_option_id: "option_a",
        channel: "email",
        is_fallback: false,
        loop_count: 1,
        goal_metric: "inflow_rate",
        goal_target_value: 0.1,
        goal_basis: "promotion_average",
        status: "running"
      };
    }
  } as unknown as DashboardQueryService);

  const response = await controller.startAdExperiment(
    "promo_email_001",
    "ad_exp_vip_001",
    "hotel-client-a"
  );

  assert.deepEqual(writes, [
    {
      adExperimentId: "ad_exp_vip_001",
      projectId: "hotel-client-a",
      promotionId: "promo_email_001"
    }
  ]);
  assert.equal(response.ad_experiment_id, "ad_exp_vip_001");
  assert.equal(response.status, "running");
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
    unapproveContentCandidate: async () => {
      throw new Error("Unexpected unapproveContentCandidate call.");
    },
    rejectContentCandidate: async () => {
      throw new Error("Unexpected rejectContentCandidate call.");
    },
    createFunnel: async () => {
      throw new Error("Unexpected createFunnel call.");
    },
    updateFunnel: async () => {
      throw new Error("Unexpected updateFunnel call.");
    },
    createSegmentQueryPreview: async () => {
      throw new Error("Unexpected createSegmentQueryPreview call.");
    },
    eventCatalog: async () => ({ events: [] }),
    funnel: async () => {
      throw new Error("Unexpected funnel call.");
    },
    funnels: async () => ({ funnels: [] }),
    main: async () => ({ campaigns: [], realtime_metrics: emptyRealtimeMetrics({}) }),
    saveSegment: async () => {
      throw new Error("Unexpected saveSegment call.");
    },
    recommendPromotionSegments: async () => {
      throw new Error("Unexpected recommendPromotionSegments call.");
    },
    analyzePromotionSegments: async () => {
      throw new Error("Unexpected analyzePromotionSegments call.");
    },
    startPromotionGeneration: async () => {
      throw new Error("Unexpected startPromotionGeneration call.");
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

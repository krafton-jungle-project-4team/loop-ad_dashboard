import assert from "node:assert/strict";
import { test } from "node:test";
import { TransactionHost } from "@nestjs-cls/transactional";
import type { DashboardContentCandidate } from "@loopad/shared";
import { AppError } from "../src/app-errors.js";
import { contentCandidateHtmlRevision } from "../src/features/dashboard/service/content-candidate-copy.js";
import type { DashboardDecisionClient } from "../src/features/dashboard/provider/dashboard-decision-client.js";
import type { DashboardCreativeRevisionAgent } from "../src/features/dashboard/provider/dashboard-creative-revision-agent.js";
import type { DashboardCampaignReader } from "../src/features/dashboard/repository/dashboard-campaign-reader.js";
import type { DashboardFunnelReader } from "../src/features/dashboard/repository/dashboard-funnel-reader.js";
import type { DashboardPromotionAutomationRepository } from "../src/features/dashboard/repository/dashboard-promotion-automation-repository.js";
import type { DashboardSegmentQueryRepository } from "../src/features/dashboard/repository/dashboard-segment-query-repository.js";

test("dashboard promotion update synchronizes pending automation jobs", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  const calls: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getCampaignSummary: async () =>
        ({
          end_date: "2099-12-31",
          start_date: "2099-01-01",
          status: "active"
        }) as never,
      getPromotionSummary: async (_projectId, promotionId) =>
        ({
          campaign_id: "campaign-a",
          promotion_id: promotionId,
          scheduled_end_at: null,
          scheduled_start_at: null
        }) as never,
      updatePromotion: async (projectId, promotionId, request) => {
        calls.push({ projectId, promotionId, request, step: "update" });
        return { promotion_id: promotionId } as never;
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient(),
    undefined,
    {
      syncPendingJobs: async (projectId, promotionId) => {
        calls.push({ projectId, promotionId, step: "sync" });
        return [];
      }
    } as unknown as DashboardPromotionAutomationRepository
  );

  await service.updatePromotion("project-a", "promotion-a", {
    execution_mode: "automatic",
    loop_interval_unit: "hour",
    loop_interval_value: 2
  });

  assert.deepEqual(calls, [
    {
      projectId: "project-a",
      promotionId: "promotion-a",
      request: {
        execution_mode: "automatic",
        loop_interval_unit: "hour",
        loop_interval_value: 2
      },
      step: "update"
    },
    { projectId: "project-a", promotionId: "promotion-a", step: "sync" }
  ]);
});

test("dashboard promotion update rejects a schedule outside its campaign", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  let updated = false;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getCampaignSummary: async () =>
        ({
          end_date: "2099-08-31",
          start_date: "2099-08-01",
          status: "active"
        }) as never,
      getPromotionSummary: async () =>
        ({
          campaign_id: "campaign-a",
          scheduled_end_at: null,
          scheduled_start_at: null
        }) as never,
      updatePromotion: async () => {
        updated = true;
        return {} as never;
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  await assert.rejects(
    () =>
      service.updatePromotion("project-a", "promotion-a", {
        scheduled_end_at: "2099-09-02T00:00:00.000+09:00",
        scheduled_start_at: "2099-08-01T00:00:00.000+09:00"
      }),
    /프로모션 실행 기간은 캠페인 기간 안에서 설정해야 합니다/
  );
  assert.equal(updated, false);
});

test("dashboard campaign update rejects a range that cuts an existing promotion", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  let updated = false;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getCampaignSummary: async () =>
        ({
          end_date: "2099-08-31",
          start_date: "2099-08-01",
          status: "active"
        }) as never,
      listCampaignPromotions: async () =>
        [
          {
            scheduled_end_at: "2099-08-25T23:59:00.000+09:00",
            scheduled_start_at: "2099-08-20T00:00:00.000+09:00"
          }
        ] as never,
      updateCampaign: async () => {
        updated = true;
        return {} as never;
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  await assert.rejects(
    () => service.updateCampaign("project-a", "campaign-a", { end_date: "2099-08-15" }),
    /캠페인 기간 밖에 예약된 프로모션이 있어 기간을 변경할 수 없습니다/
  );
  assert.equal(updated, false);
});

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

test("dashboard segment detail returns generation state for the selected segment", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const generationReads: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getSegmentDetail: async () => ({
        segment: { analysis_id: "analysis-selected" },
        ad_experiments: [],
        content_candidates: [],
        experiment_metrics: []
      }),
      getPromotionGenerationResult: async (projectId, promotionId, analysisId, segmentId) => {
        generationReads.push({ analysisId, projectId, promotionId, segmentId });
        return {
          content_candidate_count: 0,
          generation_id: "generation-selected",
          promotion_id: promotionId,
          status: "running"
        };
      }
    } as unknown as DashboardCampaignReader,
    {
      ...emptyFunnelReader(),
      getSegmentRealtimeMetrics: async () => ({
        ...emptyRealtimeMetrics(),
        promotion_id: "promotion-selected",
        segment_id: "segment-selected"
      })
    } as unknown as DashboardFunnelReader,
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const detail = await service.segmentDetail(
    "project-selected",
    "promotion-selected",
    "segment-selected"
  );

  assert.deepEqual(generationReads, [
    {
      analysisId: "analysis-selected",
      projectId: "project-selected",
      promotionId: "promotion-selected",
      segmentId: "segment-selected"
    }
  ]);
  assert.equal(detail.generation?.generation_id, "generation-selected");
  assert.equal(detail.generation?.status, "running");
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

test("dashboard segment assistant executes a structured plan without calling Decision recommendations", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: unknown[] = [];
  installCountingTransactionHost();
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async (projectId, promotionId) => {
        calls.push({ kind: "promotion", projectId, promotionId });
        return {} as never;
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      createAssistantQueryPreview: async (projectId, naturalLanguageQuery, plan) => {
        calls.push({ kind: "preview", naturalLanguageQuery, plan, projectId });
        return {
          query_preview_id: "seg_query_preview_agent",
          generated_sql: "SELECT user_id FROM funnel_step_events LIMIT 500",
          sample_size: 125,
          total_eligible_user_count: 1000,
          sample_ratio: 0.125,
          sample_size_status: "valid",
          columns: ["user_id"],
          rows: []
        };
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient(),
    {
      plan: async () => ({
        action: "audience_query" as const,
        segment_name: null,
        lookback_days: 30,
        conditions: [
          {
            label: "제주 숙소 검색",
            event_name: "hotel_search" as const,
            minimum_count: 1,
            maximum_count: null,
            destination: "제주",
            checkin_months: [],
            property_filters: []
          }
        ],
        clarification_message: null
      })
    } as never
  );

  const response = await service.assistPromotionSegment("hotel-client-a", "promo_summer", {
    message: "최근 제주 숙소를 검색한 고객은 몇 명이야?",
    conversation: []
  });

  assert.equal(response.action, "audience_query");
  assert.equal(response.preview?.sample_size, 125);
  assert.equal(response.segment_name, "제주 숙소 검색 고객");
  assert.equal(response.minimum_sample_size, 100);
  assert.deepEqual(response.condition_diagnostics, []);
  assert.deepEqual(response.suggested_adjustments, []);
  assert.equal(calls.length, 2);
  assert.deepEqual((calls[1] as { kind: string }).kind, "preview");
});

test("dashboard segment assistant explains the measured condition that keeps a segment below the minimum", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: unknown[] = [];
  const agentInputs: unknown[] = [];
  installCountingTransactionHost();
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({}) as never,
      listPromotionSegmentSuggestions: async () =>
        sourceSuggestionList({
          candidateType: "funnel_recovery",
          hardPredicateKeys: ["booking_start_without_complete"],
          referenceLabels: ["숙소 검색", "예약 가능성 높음", "예약 시작"],
          sampleSize: 140,
          segmentId: "segment-1",
          suggestionId: "suggestion-1",
          title: "예약 직전 이탈 고객"
        })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      createAssistantQueryPreview: async (_projectId, naturalLanguageQuery) => {
        calls.push({ kind: "preview", naturalLanguageQuery });
        return {
          query_preview_id: "seg_query_preview_small",
          generated_sql: "SELECT user_id FROM funnel_step_events LIMIT 500",
          sample_size: 42,
          total_eligible_user_count: 1000,
          sample_ratio: 0.042,
          sample_size_status: "too_small" as const,
          columns: ["user_id"],
          rows: []
        };
      },
      diagnoseAssistantPlan: async () => {
        calls.push({ kind: "diagnostics" });
        return {
          conditionDiagnostics: [
            {
              condition_label: "예약 시작 3회 이상",
              sample_size_without_condition: 180,
              recovered_user_count: 138,
              is_bottleneck: true
            }
          ],
          suggestedAdjustments: [
            {
              kind: "remove_condition" as const,
              label: "'예약 시작 3회 이상' 조건 제외",
              prompt: "예약 시작 3회 이상 조건을 빼고 다시 계산해줘",
              estimated_sample_size: 180
            }
          ]
        };
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient(),
    {
      plan: async (input: unknown) => {
        agentInputs.push(input);
        return {
          action: "segment_preview" as const,
          segment_name: "예약 고의도 고객",
          lookback_days: 30,
          conditions: [
            {
              label: "예약 시작 3회 이상",
              event_name: "booking_start" as const,
              minimum_count: 3,
              maximum_count: null,
              destination: null,
              checkin_months: [],
              property_filters: []
            }
          ],
          clarification_message: null
        };
      }
    } as never
  );

  const response = await service.assistPromotionSegment("hotel-client-a", "promo_summer", {
    message: "예약 시작을 3회 이상 한 조건을 추가해줘",
    conversation: [],
    source_suggestion: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      title: "예약 직전 이탈 고객",
      strategy_role: "예약 이탈 회수형",
      condition_labels: ["예약 시작", "예약 완료 없음"],
      reference_labels: ["숙소 검색", "예약 가능성 높음", "예약 시작"],
      sample_size: 140
    }
  });

  assert.equal(response.preview?.sample_size, 42);
  assert.equal(response.condition_diagnostics[0]?.condition_label, "예약 시작 3회 이상");
  assert.match(response.assistant_message, /가장 크게 제한/);
  assert.match(response.assistant_message, /180명/);
  assert.deepEqual(agentInputs, [
    {
      conversation: [],
      currentPlan: undefined,
      editingSourceBase: false,
      message: "예약 시작을 3회 이상 한 조건을 추가해줘",
      sourceAudience: {
        suggestion_id: "suggestion-1",
        segment_id: "segment-1",
        candidate_type: "funnel_recovery",
        title: "예약 직전 이탈 고객",
        strategy_role: "예약 이탈 회수형",
        base_condition_labels: ["예약 시작 후 미완료"],
        base_conditions: [
          segmentCondition("예약 시작", "booking_start", 1, null),
          segmentCondition("예약 미완료", "booking_complete", 0, 0),
          {
            label: "숙소 검색",
            event_name: "hotel_search",
            minimum_count: 1,
            maximum_count: null,
            destination: null,
            checkin_months: [],
            property_filters: []
          }
        ],
        destination_ids: [],
        hard_predicate_keys: ["booking_start_without_complete"],
        reference_labels: ["숙소 검색", "예약 가능성 높음", "예약 시작"],
        base_user_ids: Array.from(
          { length: 140 },
          (_, index) => `user-${String(index + 1).padStart(3, "0")}`
        )
      }
    }
  ]);
  assert.deepEqual(calls, [
    {
      kind: "preview",
      naturalLanguageQuery: "예약 직전 이탈 고객 수정: 예약 시작을 3회 이상 한 조건을 추가해줘"
    },
    { kind: "diagnostics" }
  ]);
});

test("dashboard derives additional conditions from measured AI audience behavior", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  const analyzedSources: Array<{ projectId: string; userCount: number }> = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({}) as never,
      listPromotionSegmentSuggestions: async () =>
        sourceSuggestionList({
          candidateType: "funnel_recovery",
          hardPredicateKeys: ["booking_start_without_complete"],
          referenceLabels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          sampleSize: 200,
          segmentId: "segment-1",
          suggestionId: "suggestion-1",
          title: "예약 직전 이탈 고객"
        })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      analyzeSourceRefinements: async (projectId, source) => {
        analyzedSources.push({ projectId, userCount: source.base_user_ids.length });
        return [
          refinementCandidate("ref_1111111111111111", "호텔 상세 조회 2회 이상", 120, 10),
          refinementCandidate("ref_2222222222222222", "숙소 검색 2회 이상", 80, 8),
          refinementCandidate("ref_3333333333333333", "조식 포함 숙소 관심", 60, 7),
          refinementCandidate("ref_4444444444444444", "프로모션 클릭 1회 이상", 10, 6)
        ];
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient()
  );

  const response = await service.promotionSegmentAssistantSourceContext(
    "hotel-client-a",
    "promo_summer",
    "suggestion-1"
  );

  assert.deepEqual(analyzedSources, [{ projectId: "hotel-client-a", userCount: 200 }]);
  assert.deepEqual(
    response.suggested_refinements.map((item) => [item.refinement_key, item.estimated_user_count]),
    [
      ["ref_1111111111111111", 120],
      ["ref_2222222222222222", 80],
      ["ref_3333333333333333", 60]
    ]
  );
});

test("dashboard uses the V2 final audience snapshot instead of the representative candidate sample", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  const finalAudienceUserIds = Array.from(
    { length: 100 },
    (_, index) => `final-user-${String(index + 1).padStart(3, "0")}`
  );
  let analyzedUserIds: string[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({}) as never,
      listPromotionSegmentSuggestions: async () =>
        sourceSuggestionList({
          audienceSnapshotId: "snapshot-final-1",
          candidateType: "funnel_recovery",
          hardPredicateKeys: ["booking_start_without_complete"],
          referenceLabels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          sampleSize: 84,
          segmentId: "segment-1",
          suggestionId: "suggestion-1",
          title: "예약 직전 이탈 고객"
        }),
      listPromotionSegmentSuggestionAudienceMemberIds: async () => finalAudienceUserIds
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      analyzeSourceRefinements: async (_projectId, source) => {
        analyzedUserIds = source.base_user_ids;
        return [];
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient()
  );

  const response = await service.promotionSegmentAssistantSourceContext(
    "hotel-client-a",
    "promo_summer",
    "suggestion-1"
  );

  assert.equal(response.sample_size, 100);
  assert.deepEqual(analyzedUserIds, finalAudienceUserIds);
});

test("quick refinement keeps the AI recommendation user IDs as the base audience", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  const previewCalls: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({}) as never,
      listPromotionSegmentSuggestions: async () =>
        sourceSuggestionList({
          candidateType: "funnel_recovery",
          hardPredicateKeys: ["booking_start_without_complete"],
          referenceLabels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          sampleSize: 140,
          segmentId: "segment-1",
          suggestionId: "suggestion-1",
          title: "예약 직전 이탈 고객"
        })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      analyzeSourceRefinements: async () => [
        refinementCandidate("ref_1111111111111111", "호텔 상세 조회 2회 이상", 110, 10)
      ],
      createAssistantQueryPreview: async (projectId, naturalLanguageQuery, plan, source) => {
        previewCalls.push({ projectId, naturalLanguageQuery, plan, source });
        return {
          query_preview_id: "seg_query_preview_refined",
          generated_sql: "SELECT user_id FROM funnel_step_events LIMIT 500",
          sample_size: 110,
          total_eligible_user_count: 613,
          sample_ratio: 110 / 613,
          sample_size_status: "valid" as const,
          columns: ["user_id"],
          rows: []
        };
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient()
  );

  const response = await service.assistPromotionSegment("hotel-client-a", "promo_summer", {
    message: "추천 고객군 안에서 호텔 상세 조회를 2회 이상 한 고객으로 좁혀줘",
    conversation: [],
    refinement_key: "ref_1111111111111111",
    source_suggestion: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      title: "예약 직전 이탈 고객",
      strategy_role: "예약 이탈 회수형",
      condition_labels: [],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      sample_size: 140
    }
  });

  const call = previewCalls[0] as {
    plan: { conditions: Array<{ event_name: string; minimum_count: number }> };
    source: { base_user_ids: string[] };
  };
  assert.equal(call.plan.conditions.length, 1);
  assert.equal(call.plan.conditions[0]?.event_name, "hotel_detail_view");
  assert.equal(call.plan.conditions[0]?.minimum_count, 2);
  assert.equal(call.source.base_user_ids.length, 140);
  assert.equal(response.base_audience?.sample_size, 140);
  assert.equal(response.preview?.sample_size, 110);
  assert.deepEqual(response.condition_labels, ["호텔 상세 조회 2회 이상", "예약 시작 후 미완료"]);
});

test("natural-language source refinement keeps base labels and binds promotion destinations", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  const previewCalls: Array<{
    plan: {
      conditions: Array<{
        destination: string | null;
        event_name: string;
        label: string;
      }>;
      execution_scope?: string;
    };
    source: { base_user_ids: string[]; destination_ids?: string[] };
  }> = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({}) as never,
      listPromotionSegmentSuggestions: async () =>
        sourceSuggestionList({
          candidateType: "funnel_recovery",
          destinationIds: ["jeju", "okinawa"],
          hardPredicateKeys: ["booking_start_without_complete", "recent_destination_search"],
          referenceLabels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          sampleSize: 100,
          segmentId: "segment-1",
          suggestionId: "suggestion-1",
          title: "예약 직전 이탈 고객"
        })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      createAssistantQueryPreview: async (_projectId, _query, plan, source) => {
        previewCalls.push({ plan, source: source! });
        return {
          query_preview_id: "seg_query_preview_destination_refinement",
          generated_sql: "SELECT user_id FROM funnel_step_events LIMIT 500",
          sample_size: 60,
          total_eligible_user_count: 946,
          sample_ratio: 60 / 946,
          sample_size_status: "too_small" as const,
          columns: ["user_id"],
          rows: []
        };
      },
      diagnoseAssistantPlan: async () => ({
        conditionDiagnostics: [],
        suggestedAdjustments: []
      })
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient(),
    {
      plan: async () => ({
        action: "segment_preview" as const,
        segment_name: "목적지 검색 추가 고객",
        lookback_days: 30,
        conditions: [
          {
            label: "목적지 검색",
            event_name: "hotel_search" as const,
            minimum_count: 1,
            maximum_count: null,
            destination: null,
            checkin_months: [],
            property_filters: []
          }
        ],
        clarification_message: null
      })
    } as never
  );

  const response = await service.assistPromotionSegment("hotel-client-a", "promo_summer", {
    message: "목적지 검색을 추가해줘",
    conversation: [],
    source_suggestion: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      title: "예약 직전 이탈 고객",
      strategy_role: "예약 이탈 회수형",
      condition_labels: [],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      sample_size: 100
    }
  });

  assert.equal(previewCalls[0]?.plan.execution_scope, "source_audience");
  assert.equal(previewCalls[0]?.plan.conditions.length, 1);
  assert.equal(previewCalls[0]?.plan.conditions[0]?.destination, "jeju, okinawa");
  assert.deepEqual(previewCalls[0]?.source.destination_ids, ["jeju", "okinawa"]);
  assert.equal(previewCalls[0]?.source.base_user_ids.length, 100);
  assert.deepEqual(response.condition_labels, [
    "호텔 상세 조회",
    "목적지 검색",
    "예약 시작 후 미완료"
  ]);
  assert.equal(response.base_audience?.sample_size, 100);
  assert.equal(response.preview?.sample_size, 60);
});

test("removing the last source refinement restores the complete base audience", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  const sourceUserIds = Array.from(
    { length: 100 },
    (_, index) => `user-${String(index + 1).padStart(3, "0")}`
  );
  let executedPlan: { conditions: unknown[]; execution_scope?: string } | undefined;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({}) as never,
      listPromotionSegmentSuggestions: async () =>
        sourceSuggestionList({
          candidateType: "funnel_recovery",
          destinationIds: ["jeju", "okinawa"],
          hardPredicateKeys: ["booking_start_without_complete", "recent_destination_search"],
          referenceLabels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          sampleSize: 100,
          segmentId: "segment-1",
          suggestionId: "suggestion-1",
          title: "예약 직전 이탈 고객"
        })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      readAssistantExecutionState: async () => ({
        assistant_plan: {
          action: "segment_preview" as const,
          execution_scope: "source_audience" as const,
          segment_name: "목적지 검색 추가 고객",
          lookback_days: 30,
          conditions: [
            {
              label: "목적지 검색",
              event_name: "hotel_search" as const,
              minimum_count: 1,
              maximum_count: null,
              destination: "jeju, okinawa",
              checkin_months: [],
              property_filters: []
            }
          ],
          clarification_message: null
        },
        source_audience: {
          suggestion_id: "suggestion-1",
          segment_id: "segment-1",
          candidate_type: "funnel_recovery",
          title: "예약 직전 이탈 고객",
          base_condition_labels: ["예약 시작 후 미완료", "프로모션 목적지 탐색"],
          hard_predicate_keys: ["booking_start_without_complete", "recent_destination_search"],
          destination_ids: ["jeju", "okinawa"],
          reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          base_user_ids: sourceUserIds
        }
      }),
      createAssistantQueryPreview: async (_projectId, _query, plan) => {
        executedPlan = plan;
        return {
          query_preview_id: "seg_query_preview_source_restored",
          generated_sql: "SELECT arrayJoin({baseUserIds:Array(String)}) AS user_id",
          sample_size: 100,
          total_eligible_user_count: 946,
          sample_ratio: 100 / 946,
          sample_size_status: "valid" as const,
          columns: ["user_id"],
          rows: []
        };
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient(),
    {
      plan: async () => {
        throw new Error("A deterministic refinement removal must not call the provider.");
      }
    } as never
  );

  const response = await service.assistPromotionSegment("hotel-client-a", "promo_summer", {
    message: "목적지 검색 조건을 빼줘",
    conversation: [],
    previous_query_preview_id: "seg_query_preview_destination_refinement",
    source_suggestion: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      title: "예약 직전 이탈 고객",
      strategy_role: "예약 이탈 회수형",
      condition_labels: [],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      sample_size: 100
    }
  });

  assert.equal(executedPlan?.execution_scope, "source_audience");
  assert.deepEqual(executedPlan?.conditions, []);
  assert.equal(response.preview?.sample_size, 100);
  assert.equal(response.base_audience?.sample_size, 100);
  assert.deepEqual(response.condition_labels, ["호텔 상세 조회", "예약 시작 후 미완료"]);
});

test("restoring the original recommendation after an edit keeps its condition labels", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  let executedConditionCount = -1;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({}) as never,
      listPromotionSegmentSuggestions: async () =>
        sourceSuggestionList({
          candidateType: "funnel_recovery",
          hardPredicateKeys: ["booking_start_without_complete"],
          referenceLabels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          sampleSize: 100,
          segmentId: "segment-1",
          suggestionId: "suggestion-1",
          title: "예약 직전 이탈 고객"
        })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      readAssistantExecutionState: async () => ({
        assistant_plan: {
          action: "segment_preview" as const,
          execution_scope: "all_eligible_users" as const,
          segment_name: "예약 완료 고객",
          lookback_days: 30,
          conditions: [
            segmentCondition("예약 시작", "booking_start", 1, null),
            segmentCondition("예약 완료", "booking_complete", 1, null),
            segmentCondition("호텔 상세 조회", "hotel_detail_view", 1, null)
          ],
          clarification_message: null
        },
        source_audience: {
          suggestion_id: "suggestion-1",
          segment_id: "segment-1",
          candidate_type: "funnel_recovery",
          title: "예약 직전 이탈 고객",
          base_condition_labels: ["예약 시작 후 미완료"],
          hard_predicate_keys: ["booking_start_without_complete"],
          reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          base_user_ids: Array.from(
            { length: 100 },
            (_, index) => `user-${String(index + 1).padStart(3, "0")}`
          )
        }
      }),
      createAssistantQueryPreview: async (_projectId, _query, plan) => {
        executedConditionCount = plan.conditions.length;
        return {
          query_preview_id: "seg_query_preview_source_only",
          generated_sql: "SELECT arrayJoin({baseUserIds:Array(String)}) AS user_id",
          sample_size: 100,
          total_eligible_user_count: 613,
          sample_ratio: 100 / 613,
          sample_size_status: "valid" as const,
          columns: ["user_id"],
          rows: []
        };
      }
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient(),
    {
      plan: async () => ({
        action: "segment_preview" as const,
        segment_name: "예약 직전 이탈 고객",
        lookback_days: 30,
        conditions: [segmentCondition("예약 미완료", "booking_complete", 0, 0)],
        clarification_message: null
      })
    } as never
  );

  const response = await service.assistPromotionSegment("hotel-client-a", "promo_summer", {
    message: "예약 완료를 예약 미완료로 바꿔봐",
    conversation: [],
    previous_query_preview_id: "seg_query_preview_completed_booking",
    source_suggestion: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      title: "예약 직전 이탈 고객",
      strategy_role: "예약 이탈 회수형",
      condition_labels: [],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      sample_size: 100
    }
  });

  assert.equal(executedConditionCount, 0);
  assert.equal(response.preview?.sample_size, 100);
  assert.equal(response.base_audience?.sample_size, 100);
  assert.deepEqual(response.condition_labels, ["호텔 상세 조회", "예약 시작 후 미완료"]);
});

test("natural-language source edits preserve other conditions and recompute against all eligible users", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  installCountingTransactionHost();
  const previewPlans: Array<{
    conditions: Array<{
      event_name: string;
      label: string;
      maximum_count: number | null;
      minimum_count: number;
    }>;
    execution_scope?: string;
  }> = [];
  const recomputedGlobalSampleSize = 80;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({}) as never,
      listPromotionSegmentSuggestions: async () =>
        sourceSuggestionList({
          candidateType: "funnel_recovery",
          hardPredicateKeys: ["booking_start_without_complete"],
          referenceLabels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
          sampleSize: 100,
          segmentId: "segment-1",
          suggestionId: "suggestion-1",
          title: "예약 직전 이탈 고객"
        })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    {
      ...emptySegmentQueryRepository(),
      createAssistantQueryPreview: async (_projectId, _query, plan) => {
        previewPlans.push(plan);
        return {
          query_preview_id: "seg_query_preview_source_edit",
          generated_sql: "SELECT user_id FROM funnel_step_events LIMIT 500",
          sample_size: recomputedGlobalSampleSize,
          total_eligible_user_count: 613,
          sample_ratio: recomputedGlobalSampleSize / 613,
          sample_size_status: "valid" as const,
          columns: ["user_id"],
          rows: []
        };
      },
      diagnoseAssistantPlan: async () => ({
        conditionDiagnostics: [],
        suggestedAdjustments: []
      })
    } as unknown as DashboardSegmentQueryRepository,
    emptyDecisionClient(),
    {
      plan: async () => ({
        action: "segment_preview" as const,
        segment_name: "예약 완료 고객",
        lookback_days: 30,
        conditions: [segmentCondition("예약 완료", "booking_complete", 1, null)],
        clarification_message: null
      })
    } as never
  );

  const response = await service.assistPromotionSegment("hotel-client-a", "promo_summer", {
    message: "기존 조건에서 예약 미완료 대신 예약 완료를 해봐",
    conversation: [],
    source_suggestion: {
      suggestion_id: "suggestion-1",
      segment_id: "segment-1",
      title: "예약 직전 이탈 고객",
      strategy_role: "예약 이탈 회수형",
      condition_labels: [],
      reference_labels: ["예약 시작", "예약 미완료", "호텔 상세 조회"],
      sample_size: 100
    }
  });

  assert.equal(previewPlans[0]?.execution_scope, "all_eligible_users");
  assert.deepEqual(
    previewPlans[0]?.conditions.map((condition) => [
      condition.label,
      condition.event_name,
      condition.minimum_count,
      condition.maximum_count
    ]),
    [
      ["예약 시작", "booking_start", 1, null],
      ["예약 완료", "booking_complete", 1, null],
      ["호텔 상세 조회", "hotel_detail_view", 1, null]
    ]
  );
  assert.deepEqual(response.condition_labels, ["예약 시작", "예약 완료", "호텔 상세 조회"]);
  assert.equal(response.base_audience, null);
  assert.equal(response.preview?.sample_size, recomputedGlobalSampleSize);
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
    operator_instruction: "숙소 상세 조회 후 미예약 고객 중심으로 추천",
    segment_instruction: "최근 제주 숙소를 반복 검색했고 예약 완료하지 않은 고객"
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
          operator_instruction: "숙소 상세 조회 후 미예약 고객 중심으로 추천",
          segment_instruction: "최근 제주 숙소를 반복 검색했고 예약 완료하지 않은 고객"
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
          target_segment_count: 2,
          updated_at: "2026-07-04T00:00:00.000Z"
        };
      },
      getPromotionGenerationResult: async () => {
        calls.push({ kind: "read-generation" });
        return {
          content_candidate_count: 3,
          generation_id: "generation_v2_existing",
          promotion_id: "promo_email_001",
          status: "completed"
        };
      },
      ensurePromotionTargetSegmentApproved: async (
        projectId,
        promotionId,
        analysisId,
        segmentId
      ) => {
        calls.push({ analysisId, kind: "approve-segment", projectId, promotionId, segmentId });
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

  const response = await service.startPromotionGeneration(
    "hotel-client-a",
    "promo_email_001",
    {
      analysis_id: "analysis_promo_email_001",
      segment_id: "segment_email_001",
      content_option_count: 3,
      operator_instruction: null,
      offer_set_id: "summer-lastcall",
      expected_catalog_id: "black-friday-hotels-lastcall",
      expected_catalog_version: "v3"
    },
    "dashboard-v3-generation:request-1"
  );

  assert.equal(response.generation_id, "generation_promo_email_001");
  assert.deepEqual(calls, [
    {
      kind: "read-promotion",
      projectId: "hotel-client-a",
      promotionId: "promo_email_001"
    },
    {
      analysisId: "analysis_promo_email_001",
      kind: "approve-segment",
      projectId: "hotel-client-a",
      promotionId: "promo_email_001",
      segmentId: "segment_email_001"
    },
    {
      kind: "decision",
      request: {
        campaignId: "camp_summer_2026",
        idempotencyKey: "dashboard-v3-generation:request-1",
        projectId: "hotel-client-a",
        promotionId: "promo_email_001",
        request: {
          analysis_id: "analysis_promo_email_001",
          segment_id: "segment_email_001",
          content_option_count: 3,
          operator_instruction: null,
          offer_set_id: "summer-lastcall",
          expected_catalog_id: "black-friday-hotels-lastcall",
          expected_catalog_version: "v3"
        }
      }
    }
  ]);
});

test("dashboard offer-set generation requires a browser idempotency key", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  let promotionRead = false;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => {
        promotionRead = true;
        return { campaign_id: "camp_summer_2026", channel: "email" } as never;
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  await assert.rejects(
    () =>
      service.startPromotionGeneration("hotel-client-a", "promo_email_001", {
        analysis_id: "analysis_promo_email_001",
        segment_id: "segment_email_001",
        offer_set_id: "summer-lastcall",
        expected_catalog_id: "black-friday-hotels-lastcall",
        expected_catalog_version: "v3"
      }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.code === "DASHBOARD_OFFER_SET_GENERATION_IDEMPOTENCY_KEY_REQUIRED"
  );
  assert.equal(promotionRead, false);
});

test("dashboard offer-set generation rejects non-email promotions with conflict", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  let segmentApproved = false;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () =>
        ({
          campaign_id: "camp_summer_2026",
          channel: "onsite_banner"
        }) as never,
      ensurePromotionTargetSegmentApproved: async () => {
        segmentApproved = true;
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  await assert.rejects(
    () =>
      service.startPromotionGeneration(
        "hotel-client-a",
        "promo_banner_001",
        {
          analysis_id: "analysis_promo_banner_001",
          segment_id: "segment_banner_001",
          offer_set_id: "summer-lastcall",
          expected_catalog_id: "black-friday-hotels-lastcall",
          expected_catalog_version: "v3"
        },
        "dashboard-v3-generation:request-2"
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "DASHBOARD_OFFER_SET_GENERATION_CHANNEL_UNSUPPORTED"
  );
  assert.equal(segmentApproved, false);
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

test("dashboard promotion generation retries when completed result has no candidates", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const decisionRequests: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({ campaign_id: "camp_summer_2026" }),
      getPromotionGenerationResult: async (_projectId, promotionId) => ({
        content_candidate_count: 0,
        generation_id: "generation_completed_without_candidates",
        promotion_id: promotionId,
        status: "completed"
      })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      startPromotionGeneration: async (request) => {
        decisionRequests.push(request);
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
  assert.equal(decisionRequests.length, 1);
});

test("dashboard promotion generation reuses a completed result with candidates", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const existingGeneration = {
    content_candidate_count: 3,
    generation_id: "generation_completed",
    promotion_id: "promo_banner_001",
    status: "completed"
  };
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async () => ({ campaign_id: "camp_summer_2026" }),
      getPromotionGenerationResult: async () => existingGeneration
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const response = await service.startPromotionGeneration("hotel-client-a", "promo_banner_001", {
    analysis_id: "analysis_promo_banner_001",
    content_option_count: 3,
    operator_instruction: null
  });

  assert.deepEqual(response, existingGeneration);
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

test("dashboard ad experiment evaluation refreshes only the selected segment experiment", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: unknown[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      findAdExperiment: async (projectId, promotionId, segmentId, adExperimentId) => {
        calls.push({ adExperimentId, kind: "find", projectId, promotionId, segmentId });
        return { promotion_run_id: "run-email-1" };
      },
      preparePromotionRunEvaluationCompatibility: async (projectId, promotionRunId) => {
        calls.push({ kind: "prepare-legacy-data", projectId, promotionRunId });
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      evaluateAdExperiment: async (request) => {
        calls.push({ kind: "decision", request });
        return {
          actual_value: 0.42,
          ad_experiment_id: request.adExperimentId,
          basis: "all_segments",
          denominator_count: 100,
          evaluation_id: "evaluation-1",
          feedback: null,
          metric: "booking_conversion_rate",
          next_loop_required: false,
          numerator_count: 42,
          promotion_id: "promotion-1",
          promotion_run_id: "run-email-1",
          sample_size: 100,
          segment_id: "segment-1",
          status: "goal_met",
          target_value: 0.3
        };
      }
    } as unknown as DashboardDecisionClient,
    undefined,
    {
      cancelPendingRunEvaluation: async () => {
        calls.push({ kind: "unexpected-cancel" });
        return null;
      },
      getRunConfig: async () => {
        calls.push({ kind: "unexpected-run-config" });
        throw new Error("Unexpected automatic evaluation call.");
      }
    } as unknown as DashboardPromotionAutomationRepository
  );

  const result = await service.evaluateAdExperiment(
    "project-1",
    "promotion-1",
    "segment-1",
    "experiment-1"
  );

  assert.equal(result.actual_value, 0.42);
  assert.deepEqual(calls, [
    {
      adExperimentId: "experiment-1",
      kind: "find",
      projectId: "project-1",
      promotionId: "promotion-1",
      segmentId: "segment-1"
    },
    {
      kind: "prepare-legacy-data",
      projectId: "project-1",
      promotionRunId: "run-email-1"
    },
    { kind: "decision", request: { adExperimentId: "experiment-1" } }
  ]);
});

test("dashboard ad experiment evaluation rejects ids outside the selected segment", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      findAdExperiment: async () => null
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      evaluateAdExperiment: async () => {
        throw new Error("Decision must not be called for an invalid segment experiment.");
      }
    } as unknown as DashboardDecisionClient
  );

  await assert.rejects(
    () => service.evaluateAdExperiment("project-1", "promotion-1", "segment-other", "experiment-1"),
    (error: unknown) =>
      error instanceof Error &&
      "code" in error &&
      error.code === "DASHBOARD_AD_EXPERIMENT_NOT_FOUND"
  );
});

test("automatic promotion evaluation creates, assigns, and queues the next failed loop", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: string[] = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      preparePromotionRunEvaluationCompatibility: async () => undefined
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      evaluatePromotionRun: async () => ({
        ad_experiment_results: [],
        failed_ad_experiment_ids: ["experiment-1"],
        failed_segment_ids: ["segment-1"],
        next_loop_required: true,
        promotion_id: "promotion-1",
        promotion_run_id: "run-1",
        status: "goal_not_met"
      }),
      createNextLoop: async ({ request }) => {
        calls.push(`next-loop:${request.content_approval_mode}`);
        return {
          content_approval_required: false,
          failed_segment_ids: [],
          loop_count: 2,
          next_ad_experiments: [],
          next_analysis_id: "analysis-2",
          next_generation_id: "generation-2",
          next_loop_preparation_id: null,
          next_promotion_run_id: "run-2",
          pending_content_ids: [],
          previous_promotion_run_id: "run-1",
          promotion_id: "promotion-1",
          segment_ids: ["segment-1"],
          status: "activated" as const
        };
      },
      buildPromotionRunSegmentAssignments: async ({ promotionRunId }) => {
        calls.push(`assign:${promotionRunId}`);
        return assignmentBuildResult(promotionRunId);
      }
    } as unknown as DashboardDecisionClient,
    undefined,
    {
      cancelPendingRunEvaluation: async () => null,
      getRunConfig: async () => ({
        executionMode: "automatic",
        loopCount: 1,
        loopIntervalUnit: "hour",
        loopIntervalValue: 1,
        maxLoopCount: 3,
        projectId: "hotel-client-a",
        promotionId: "promotion-1",
        promotionRunId: "run-1",
        promotionRunStatus: "running",
        promotionStatus: "running",
        scheduledEndAt: null,
        scheduledStartAt: null
      }),
      scheduleRunLaunch: async (_projectId, promotionRunId) => {
        calls.push(`queue:${promotionRunId}`);
        return { activationStatus: "automatic_start_queued" as const, scheduledStartAt: null };
      }
    } as unknown as DashboardPromotionAutomationRepository
  );

  await service.evaluatePromotionRun("hotel-client-a", "run-1");

  assert.deepEqual(calls, ["next-loop:automatic", "assign:run-2", "queue:run-2"]);
});

test("dashboard idempotently confirms V2 suggestions through Decision before enriching targets", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  const transactionHost = installCountingTransactionHost();
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getPromotionSummary: async (_projectId, promotionId) => ({
        campaign_id: "campaign-1",
        promotion_id: promotionId
      }),
      listPromotionSegmentSuggestions: async () => ({
        audience_allocation_preview_context: null,
        suggestions: [
          {
            analysis_id: "analysis-current",
            audience_snapshot_id: "snapshot-source-1",
            segment_id: "segment-ai",
            suggestion_id: "suggestion-current",
            suggestion_status: "confirmed"
          }
        ]
      }),
      confirmV2PromotionSegmentSuggestions: async (request) => {
        writes.push(request);
        return 1;
      },
      listPromotionScopedSegmentDefinitions: async () => ({
        segments: [
          {
            rule_json: { audience_resolution_contract: "segment_audience.v1" },
            segment_id: "segment-direct"
          }
        ]
      })
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      analyzePromotionSegments: async (request) => {
        writes.push({ decision: request });
        return {
          analysis_id: "analysis-confirmation",
          promotion_id: request.promotionId,
          status: "completed",
          target_segments: [
            {
              audience_snapshot_id: "snapshot-final-1",
              audience_status: "targetable",
              content_brief: { keywords: [], message_direction: "예약 유도" },
              estimated_size: 85,
              final_audience_count: 85,
              meets_min_sample_size: true,
              segment_id: "segment-ai",
              segment_name: "AI 고객군",
              segment_vector_id: "vector-1",
              targetable: true
            },
            {
              audience_snapshot_id: "snapshot-final-2",
              audience_status: "targetable",
              content_brief: { keywords: [], message_direction: "예약 유도" },
              estimated_size: 40,
              final_audience_count: 40,
              meets_min_sample_size: true,
              segment_id: "segment-direct",
              segment_name: "직접 생성 고객군",
              segment_vector_id: "vector-2",
              targetable: true
            }
          ]
        };
      }
    } as unknown as DashboardDecisionClient
  );

  const result = await service.confirmPromotionSegmentSuggestions(
    "hotel-client-a",
    "promo_banner_001",
    {
      analysis_id: "analysis-current",
      confirmed_by: "operator-1",
      segment_ids: ["segment-direct"],
      suggestion_ids: ["suggestion-current"]
    }
  );

  assert.equal(transactionHost.calls.length, 0);
  assert.deepEqual(writes, [
    {
      decision: {
        campaignId: "campaign-1",
        projectId: "hotel-client-a",
        promotionId: "promo_banner_001",
        request: {
          operator_instruction: null,
          segment_ids: ["segment-ai", "segment-direct"]
        }
      }
    },
    {
      confirmationAnalysisId: "analysis-confirmation",
      confirmedBy: "operator-1",
      projectId: "hotel-client-a",
      promotionId: "promo_banner_001",
      sourceAnalysisId: "analysis-current",
      suggestionIds: ["suggestion-current"]
    }
  ]);
  assert.equal(result.analysis_id, "analysis-confirmation");
  assert.equal(result.confirmed_segment_count, 2);
});

test("dashboard keeps legacy AI suggestion confirmation on the direct path", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: unknown[] = [];
  installCountingTransactionHost();
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      listPromotionSegmentSuggestions: async () => ({
        audience_allocation_preview_context: null,
        suggestions: [
          {
            analysis_id: "analysis-legacy",
            audience_snapshot_id: null,
            segment_id: "segment-legacy",
            suggestion_id: "suggestion-legacy",
            suggestion_status: "accepted"
          }
        ]
      }),
      confirmLegacyPromotionSegments: async (projectId, promotionId, request) => {
        writes.push({ projectId, promotionId, request });
        return {
          analysis_id: "analysis-legacy-confirmation",
          confirmed_segment_count: 1,
          promotion_id: promotionId,
          status: "confirmed",
          target_segments: []
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      analyzePromotionSegments: async () => {
        throw new Error("Legacy suggestions must not call Decision analyses.");
      }
    } as unknown as DashboardDecisionClient
  );

  const result = await service.confirmPromotionSegmentSuggestions(
    "hotel-client-a",
    "promo-banner-legacy",
    {
      analysis_id: "analysis-legacy",
      confirmed_by: "operator-1",
      segment_ids: [],
      suggestion_ids: ["suggestion-legacy"]
    }
  );

  assert.deepEqual(writes, [
    {
      projectId: "hotel-client-a",
      promotionId: "promo-banner-legacy",
      request: {
        analysis_id: "analysis-legacy",
        confirmed_by: "operator-1",
        segment_ids: [],
        suggestion_ids: ["suggestion-legacy"]
      }
    }
  ]);
  assert.equal(result.analysis_id, "analysis-legacy-confirmation");
  assert.equal(result.confirmed_segment_count, 1);
});

test("dashboard rejects suggestion ids outside the source analysis before Decision call", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  let decisionCalled = false;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      listPromotionSegmentSuggestions: async () =>
        ({
          suggestions: [
            {
              segment_id: "seg_destination",
              suggestion_id: "suggestion-current",
              suggestion_status: "suggested"
            }
          ]
        }) as never
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    {
      analyzePromotionSegments: async () => {
        decisionCalled = true;
        throw new Error("Unexpected analyzePromotionSegments call.");
      }
    } as unknown as DashboardDecisionClient
  );

  await assert.rejects(
    service.confirmPromotionSegmentSuggestions("hotel-client-a", "promo_banner_001", {
      analysis_id: "analysis-current",
      segment_ids: [],
      suggestion_ids: ["suggestion-unknown"]
    }),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { code?: string }).code === "DASHBOARD_SEGMENT_SUGGESTION_SELECTION_INVALID"
  );
  assert.equal(decisionCalled, false);
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

test("dashboard HTML source reads the original artifact when no edited HTML exists", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const sourceHtml =
    '<article><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약하기</a></article>';
  const candidate = dashboardHtmlCandidate(null);
  const requestedUrls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return new Response(sourceHtml, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 200
    });
  };

  try {
    const service = new DashboardQueryService(
      {
        ...emptyCampaignReader(),
        getContentCandidate: async () => candidate
      } as unknown as DashboardCampaignReader,
      emptyFunnelReader(),
      emptySegmentQueryRepository(),
      emptyDecisionClient()
    );

    const result = await service.contentCandidateHtmlSource(
      "project-a",
      "promotion-a",
      "segment-a",
      "content-a"
    );

    assert.equal(result.html, sourceHtml);
    assert.equal(result.revision, contentCandidateHtmlRevision(sourceHtml));
    assert.equal(result.updated_at, candidate.updated_at);
    assert.deepEqual(requestedUrls, ["https://assets.example.com/content-a.html"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dashboard HTML source prefers edited HTML without fetching the original artifact", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const editedHtml =
    '<article><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}" style="padding:20px">예약하기</a></article>';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Edited HTML source must not fetch the original artifact.");
  };

  try {
    const service = new DashboardQueryService(
      {
        ...emptyCampaignReader(),
        getContentCandidate: async () => dashboardHtmlCandidate(editedHtml)
      } as unknown as DashboardCampaignReader,
      emptyFunnelReader(),
      emptySegmentQueryRepository(),
      emptyDecisionClient()
    );

    const result = await service.contentCandidateHtmlSource(
      "project-a",
      "promotion-a",
      "segment-a",
      "content-a"
    );

    assert.equal(result.html, editedHtml);
    assert.equal(result.revision, contentCandidateHtmlRevision(editedHtml));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dashboard HTML preview returns only canonical safe HTML and rejects invalid or oversized input", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const sourceHtml =
    '<article><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약하기</a></article>';
  const candidate = dashboardHtmlCandidate(sourceHtml);
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getContentCandidate: async () => candidate,
      updateContentCandidateCopy: async () => {
        throw new Error("Preview must not save HTML.");
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient(),
    undefined,
    undefined,
    {
      planPatch: async () => {
        throw new Error("Manual HTML preview must not call AI.");
      },
      revise: async () => {
        throw new Error("Manual HTML preview must not call AI.");
      }
    } as unknown as DashboardCreativeRevisionAgent
  );
  const revisedHtml =
    '<article style="padding:24px"><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약하기</a></article>';

  const result = await service.previewContentCandidateHtml(
    "project-a",
    "promotion-a",
    "segment-a",
    "content-a",
    { html: revisedHtml }
  );

  assert.equal(result.html, revisedHtml);
  await assert.rejects(
    () =>
      service.previewContentCandidateHtml("project-a", "promotion-a", "segment-a", "content-a", {
        html: `${sourceHtml}<script>alert(1)</script>`
      }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 422 &&
      error.code === "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_INVALID"
  );
  await assert.rejects(
    () =>
      service.previewContentCandidateHtml("project-a", "promotion-a", "segment-a", "content-a", {
        html: sourceHtml + " ".repeat(2_000_001)
      }),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 422 &&
      error.code === "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_INVALID"
  );
});

test("dashboard manual HTML save validates the base revision and persists canonical HTML without AI", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const sourceHtml =
    '<article><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약하기</a></article>';
  const candidate = dashboardHtmlCandidate(sourceHtml);
  const writes: unknown[] = [];
  let simulateConcurrentWrite = false;
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getContentCandidate: async () => candidate,
      updateContentCandidateCopy: async (
        projectId,
        promotionId,
        segmentId,
        contentId,
        request,
        metadataJson,
        htmlUrl,
        expected
      ) => {
        writes.push({
          contentId,
          expected,
          htmlUrl,
          metadataJson,
          projectId,
          promotionId,
          request,
          segmentId
        });
        if (simulateConcurrentWrite) return null;
        return {
          body: request.body,
          content_id: contentId,
          cta: request.cta,
          headline: request.headline,
          html_url: htmlUrl,
          promotion_id: promotionId,
          segment_id: segmentId,
          status: "draft" as const,
          updated_at: "2026-07-21T00:00:01.000Z"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient(),
    undefined,
    undefined,
    {
      planPatch: async () => {
        throw new Error("Manual HTML save must not call AI.");
      },
      revise: async () => {
        throw new Error("Manual HTML save must not call AI.");
      }
    } as unknown as DashboardCreativeRevisionAgent
  );
  const revisedHtml =
    '<article style="padding:24px"><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약하기</a></article>';
  const baseRevision = contentCandidateHtmlRevision(sourceHtml);

  await assert.rejects(
    () =>
      service.saveContentCandidateHtml(
        "project-a",
        "promotion-a",
        "segment-a",
        "content-a",
        { base_revision: "f".repeat(64), html: revisedHtml },
        "https://dashboard.api.dev.loop-ad.org"
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_CONFLICT"
  );
  assert.equal(writes.length, 0);

  await assert.rejects(
    () =>
      service.saveContentCandidateHtml(
        "project-a",
        "promotion-a",
        "segment-a",
        "content-a",
        { base_revision: baseRevision, html: `${sourceHtml}<script>alert(1)</script>` },
        "https://dashboard.api.dev.loop-ad.org"
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 422 &&
      error.code === "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_INVALID"
  );
  assert.equal(writes.length, 0);

  const saved = await service.saveContentCandidateHtml(
    "project-a",
    "promotion-a",
    "segment-a",
    "content-a",
    { base_revision: baseRevision, html: revisedHtml },
    "https://dashboard.api.dev.loop-ad.org"
  );

  assert.equal(saved.html, revisedHtml);
  assert.equal(saved.revision, contentCandidateHtmlRevision(revisedHtml));
  assert.match(saved.html_url, new RegExp(`revision=${saved.revision}`));
  assert.equal(writes.length, 1);
  const write = writes[0] as {
    expected: { copy: unknown; metadataJson: unknown };
    metadataJson: Record<string, unknown>;
  };
  assert.deepEqual(write.expected, {
    copy: { body: "기존 본문", cta: "예약하기", headline: "기존 제목" },
    metadataJson: candidate.metadata_json
  });
  const creative = write.metadataJson.creative as Record<string, unknown>;
  assert.equal(creative.edited_html, revisedHtml);

  simulateConcurrentWrite = true;
  await assert.rejects(
    () =>
      service.saveContentCandidateHtml(
        "project-a",
        "promotion-a",
        "segment-a",
        "content-a",
        { base_revision: baseRevision, html: revisedHtml },
        "https://dashboard.api.dev.loop-ad.org"
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "DASHBOARD_CONTENT_CANDIDATE_HTML_REVISION_CONFLICT"
  );
});

test("dashboard manual HTML save rejects non-draft candidates", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const sourceHtml =
    '<article><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약하기</a></article>';
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getContentCandidate: async () => dashboardHtmlCandidate(sourceHtml, "approved"),
      updateContentCandidateCopy: async () => {
        throw new Error("Approved HTML must not be saved.");
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  await assert.rejects(
    () =>
      service.saveContentCandidateHtml(
        "project-a",
        "promotion-a",
        "segment-a",
        "content-a",
        { base_revision: contentCandidateHtmlRevision(sourceHtml), html: sourceHtml },
        "https://dashboard.api.dev.loop-ad.org"
      ),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 409 &&
      error.code === "DASHBOARD_CONTENT_CANDIDATE_NOT_EDITABLE"
  );
});

test("dashboard copy edit saves revised HTML without calling Decision API", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const writes: Array<{ htmlUrl: string; metadataJson: Record<string, unknown> }> = [];
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getContentCandidate: async () => ({
        analysis_id: "analysis-a",
        body: "기존 본문",
        channel: "onsite_banner",
        content_id: "content-a",
        content_option_id: "option-a",
        cta: "예약하기",
        data_evidence_json: {},
        generation_id: "generation-a",
        generation_prompt: null,
        image_prompt: null,
        image_url: null,
        landing_url: "https://example.com",
        message: null,
        message_strategy: null,
        metadata_json: {
          creative: {
            artifact: {
              artifact_status: "published",
              creative_format: "banner_html",
              public_url: "https://assets.example.com/content-a.html"
            },
            edited_html: "<h1>기존 제목</h1><p>기존 본문</p><a>예약하기</a>"
          }
        },
        preheader: null,
        promotion_id: "promotion-a",
        reason_summary: null,
        segment_id: "segment-a",
        status: "draft",
        subject: null,
        title: "기존 제목",
        updated_at: "2026-07-16T00:00:00.000Z"
      }),
      updateContentCandidateCopy: async (
        _projectId: string,
        promotionId: string,
        segmentId: string,
        contentId: string,
        request: { headline: string; body: string; cta: string },
        metadataJson: Record<string, unknown>,
        htmlUrl: string
      ) => {
        writes.push({ htmlUrl, metadataJson });
        return {
          body: request.body,
          content_id: contentId,
          cta: request.cta,
          headline: request.headline,
          html_url: htmlUrl,
          promotion_id: promotionId,
          segment_id: segmentId,
          status: "draft" as const,
          updated_at: "2026-07-16T00:00:00.000Z"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient()
  );

  const result = await service.updateContentCandidateCopy(
    "project-a",
    "promotion-a",
    "segment-a",
    "content-a",
    { headline: "새 제목", body: "새 본문", cta: "혜택 보기" },
    "https://dashboard.api.dev.loop-ad.org"
  );

  assert.equal(result.headline, "새 제목");
  assert.equal(writes.length, 1);
  assert.match(writes[0]?.htmlUrl ?? "", /dashboard\.api\.dev\.loop-ad\.org/);
  const creative = writes[0]?.metadataJson.creative as Record<string, unknown>;
  assert.equal(creative.edited_html, "<h1>새 제목</h1><p>새 본문</p><a>혜택 보기</a>");
});

test("dashboard AI feedback revision applies and stores a validated exact-text patch", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const calls: unknown[] = [];
  const sourceHtml =
    '<article><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약하기</a></article>';
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getContentCandidate: async () =>
        ({
          analysis_id: "analysis-a",
          body: "기존 본문",
          channel: "onsite_banner",
          content_id: "content-a",
          content_option_id: "option-a",
          cta: "예약하기",
          data_evidence_json: {},
          generation_id: "generation-a",
          generation_prompt: null,
          image_prompt: null,
          image_url: null,
          landing_url: "https://example.com",
          message: null,
          message_strategy: null,
          metadata_json: {
            creative: {
              artifact: {
                artifact_status: "published",
                creative_format: "banner_html",
                public_url: "https://assets.example.com/content-a.html"
              },
              edited_html: sourceHtml
            }
          },
          preheader: null,
          promotion_id: "promotion-a",
          reason_summary: null,
          segment_id: "segment-a",
          status: "draft",
          subject: null,
          title: "기존 제목",
          updated_at: "2026-07-16T00:00:00.000Z"
        }) as never,
      updateContentCandidateCopy: async (
        _projectId,
        promotionId,
        segmentId,
        contentId,
        request,
        metadataJson,
        htmlUrl
      ) => {
        calls.push({ htmlUrl, metadataJson, request });
        return {
          body: request.body,
          content_id: contentId,
          cta: request.cta,
          headline: request.headline,
          html_url: htmlUrl,
          promotion_id: promotionId,
          segment_id: segmentId,
          status: "draft" as const,
          updated_at: "2026-07-16T00:00:00.000Z"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient(),
    undefined,
    undefined,
    {
      planPatch: async (input) => {
        calls.push({ feedback: input.feedback });
        return {
          body: "혜택을 먼저 확인하세요",
          change_summary: "혜택과 CTA의 시각적 우선순위를 높였습니다.",
          cta: "혜택 보기",
          headline: "여름 숙박 혜택",
          replacements: [
            { before: "<article>", after: '<article style="padding:24px">' },
            { before: "기존 제목", after: "여름 숙박 혜택" },
            { before: "기존 본문", after: "혜택을 먼저 확인하세요" },
            { before: "예약하기", after: "혜택 보기" }
          ],
          strategy: "patch" as const
        };
      },
      revise: async () => {
        throw new Error("Full HTML fallback should not run for a valid patch.");
      }
    } as unknown as DashboardCreativeRevisionAgent
  );

  const result = await service.reviseContentCandidateHtml(
    "project-a",
    "promotion-a",
    "segment-a",
    "content-a",
    { feedback: "혜택과 버튼이 먼저 보이게 바꿔줘" },
    "https://dashboard.api.dev.loop-ad.org"
  );

  assert.equal(result.headline, "여름 숙박 혜택");
  assert.match(result.change_summary, /시각적 우선순위/);
  assert.deepEqual(calls[0], { feedback: "혜택과 버튼이 먼저 보이게 바꿔줘" });
  const saved = calls[1] as { metadataJson: Record<string, unknown> };
  const creative = saved.metadataJson.creative as Record<string, unknown>;
  assert.match(String(creative.edited_html), /\{\{redirect_url\}\}/);
  assert.match(String(creative.edited_html), /padding:24px/);
});

test("dashboard AI feedback revision falls back once for an invalid patch or model-requested full layout", async () => {
  setRequiredEnv();
  const { DashboardQueryService } =
    await import("../src/features/dashboard/service/dashboard-query.service.js");
  const sourceHtml =
    '<article><h1>기존 제목</h1><p>기존 본문</p><a href="{{redirect_url}}">예약하기</a></article>';
  let patchCalls = 0;
  let fullRevisionCalls = 0;
  let savedHtml = "";
  let revisionStrategy: "patch_validation_failure" | "full_revision" = "patch_validation_failure";
  const service = new DashboardQueryService(
    {
      ...emptyCampaignReader(),
      getContentCandidate: async () =>
        ({
          analysis_id: "analysis-a",
          body: "기존 본문",
          channel: "onsite_banner",
          content_id: "content-a",
          content_option_id: "option-a",
          cta: "예약하기",
          data_evidence_json: {},
          generation_id: "generation-a",
          generation_prompt: null,
          image_prompt: null,
          image_url: null,
          landing_url: "https://example.com",
          message: null,
          message_strategy: null,
          metadata_json: {
            creative: {
              artifact: {
                artifact_status: "published",
                creative_format: "banner_html",
                public_url: "https://assets.example.com/content-a.html"
              },
              edited_html: sourceHtml
            }
          },
          preheader: null,
          promotion_id: "promotion-a",
          reason_summary: null,
          segment_id: "segment-a",
          status: "draft",
          subject: null,
          title: "기존 제목",
          updated_at: "2026-07-16T00:00:00.000Z"
        }) as never,
      updateContentCandidateCopy: async (
        _projectId,
        promotionId,
        segmentId,
        contentId,
        request,
        metadataJson,
        htmlUrl
      ) => {
        const creative = metadataJson.creative as Record<string, unknown>;
        savedHtml = String(creative.edited_html);
        return {
          body: request.body,
          content_id: contentId,
          cta: request.cta,
          headline: request.headline,
          html_url: htmlUrl,
          promotion_id: promotionId,
          segment_id: segmentId,
          status: "draft" as const,
          updated_at: "2026-07-16T00:00:00.000Z"
        };
      }
    } as unknown as DashboardCampaignReader,
    emptyFunnelReader(),
    emptySegmentQueryRepository(),
    emptyDecisionClient(),
    undefined,
    undefined,
    {
      planPatch: async () => {
        patchCalls += 1;
        if (revisionStrategy === "full_revision") {
          return {
            body: "기존 본문",
            change_summary: "전체 레이아웃 변경이 필요합니다.",
            cta: "예약하기",
            headline: "기존 제목",
            replacements: [],
            strategy: "full_revision" as const
          };
        }
        return {
          body: "기존 본문",
          change_summary: "제목 색상을 변경했습니다.",
          cta: "예약하기",
          headline: "기존 제목",
          replacements: [{ before: "기존", after: "새로운" }],
          strategy: "patch" as const
        };
      },
      revise: async () => {
        fullRevisionCalls += 1;
        return {
          body: "새 본문",
          change_summary: "전체 HTML 경로로 안전하게 반영했습니다.",
          cta: "혜택 보기",
          headline: "새 제목",
          html: '<article><h1>새 제목</h1><p>새 본문</p><a href="{{redirect_url}}">혜택 보기</a></article>'
        };
      }
    } as unknown as DashboardCreativeRevisionAgent
  );

  const result = await service.reviseContentCandidateHtml(
    "project-a",
    "promotion-a",
    "segment-a",
    "content-a",
    { feedback: "전체 분위기를 바꿔줘" },
    "https://dashboard.api.dev.loop-ad.org"
  );

  assert.equal(patchCalls, 1);
  assert.equal(fullRevisionCalls, 1);
  assert.equal(result.headline, "새 제목");
  assert.match(result.change_summary, /전체 HTML 경로/);
  assert.match(savedHtml, /새 본문/);
  assert.match(savedHtml, /\{\{redirect_url\}\}/);

  revisionStrategy = "full_revision";
  patchCalls = 0;
  fullRevisionCalls = 0;
  savedHtml = "";
  const fullLayoutResult = await service.reviseContentCandidateHtml(
    "project-a",
    "promotion-a",
    "segment-a",
    "content-a",
    { feedback: "전체 레이아웃을 새롭게 바꿔줘" },
    "https://dashboard.api.dev.loop-ad.org"
  );

  assert.equal(patchCalls, 1);
  assert.equal(fullRevisionCalls, 1);
  assert.equal(fullLayoutResult.headline, "새 제목");
  assert.match(savedHtml, /새 본문/);
  assert.match(savedHtml, /\{\{redirect_url\}\}/);
});

function dashboardHtmlCandidate(
  editedHtml: string | null,
  status = "draft"
): DashboardContentCandidate {
  return {
    analysis_id: "analysis-a",
    body: "기존 본문",
    channel: "onsite_banner",
    content_id: "content-a",
    content_option_id: "option-a",
    cta: "예약하기",
    data_evidence_json: {},
    generation_id: "generation-a",
    generation_prompt: null,
    image_prompt: null,
    image_url: null,
    landing_url: "https://example.com",
    message: null,
    message_strategy: null,
    metadata_json: {
      creative: {
        artifact: {
          artifact_status: "published",
          creative_format: "banner_html",
          public_url: "https://assets.example.com/content-a.html",
          storage_key: "generated/content-a.html"
        },
        ...(editedHtml === null ? {} : { edited_html: editedHtml })
      }
    },
    next_loop_preparation_id: null,
    preheader: null,
    promotion_id: "promotion-a",
    reason_summary: null,
    segment_id: "segment-a",
    status,
    subject: null,
    title: "기존 제목",
    updated_at: "2026-07-21T00:00:00.000Z"
  };
}

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

function segmentCondition(
  label: string,
  eventName: "booking_start" | "booking_complete" | "hotel_detail_view",
  minimumCount: number,
  maximumCount: number | null
) {
  return {
    label,
    event_name: eventName,
    minimum_count: minimumCount,
    maximum_count: maximumCount,
    destination: null,
    checkin_months: [],
    property_filters: []
  };
}

function sourceSuggestionList(input: {
  audienceSnapshotId?: string | null;
  candidateType: string;
  destinationIds?: string[];
  hardPredicateKeys: string[];
  referenceLabels: string[];
  sampleSize: number;
  segmentId: string;
  suggestionId: string;
  title: string;
}) {
  return {
    suggestions: [
      {
        audience_snapshot_id: input.audienceSnapshotId ?? null,
        suggestion_id: input.suggestionId,
        segment_id: input.segmentId,
        segment_name: input.title,
        sample_size: input.sampleSize,
        display_copy: {
          title: input.title,
          strategy_role: "예약 이탈 회수형",
          signal_chips: input.referenceLabels
        },
        rule_json: {
          candidate_type: input.candidateType,
          candidate_user_ids: Array.from(
            { length: input.sampleSize },
            (_, index) => `user-${String(index + 1).padStart(3, "0")}`
          ),
          segment_audience_spec: {
            hard_predicate_keys: input.hardPredicateKeys,
            parameters: {
              destination_ids: input.destinationIds ?? []
            }
          }
        }
      }
    ],
    audience_allocation_preview_context: null
  } as never;
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

function refinementCandidate(key: string, label: string, sampleSize: number, priority: number) {
  return {
    key,
    dimensionKey: key,
    priority,
    prompt: `추천 고객군 안에서 '${label}' 조건으로 좁혀줘`,
    sampleSize,
    condition: {
      label,
      event_name: "hotel_detail_view" as const,
      minimum_count: 2,
      maximum_count: null,
      destination: null,
      checkin_months: [],
      property_filters: []
    }
  };
}

function assignmentBuildResult(promotionRunId: string) {
  return {
    activation_status: "manual_start_required" as const,
    ann_candidate_count: 80,
    ann_candidate_limit: 100,
    ann_underfilled_user_count: 0,
    assignment_count: 40,
    batch_has_fallback: false,
    below_threshold_fallback_count: 0,
    completion_scope: "current_request" as const,
    exact_reranked_pair_count: 60,
    fallback_count: 0,
    insufficient_segment_count: 0,
    invalid_user_vector_fallback_count: 0,
    matching_mode: "hybrid",
    no_candidate_fallback_count: 0,
    promotion_run_id: promotionRunId,
    scheduled_start_at: null,
    skipped_existing_count: 0,
    status: "completed",
    vector_version: "v1"
  };
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

import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type {
  DashboardBuildPromotionRunAssignmentsResult,
  DashboardAnalyzePromotionSegmentsRequest,
  DashboardCreateNextLoopRequest,
  DashboardCreateNextLoopResult,
  DashboardCreatePromotionRunRequest,
  DashboardCreatePromotionRunResult,
  DashboardEvaluatePromotionRunResult,
  DashboardPromotionAnalysisResult,
  DashboardRecommendPromotionSegmentsRequest,
  DashboardStartPromotionGenerationRequest,
  DashboardStartPromotionGenerationResult
} from "@loopad/shared";
import { env } from "../../../infra/env/env.js";
import { durationMs, log } from "../../../infra/logger/index.js";
import { dashboardErrors } from "../dashboard-errors.js";

const decisionPromotionAnalysisResponseSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  status: z.string()
});

const decisionPromotionGenerationResponseSchema = z
  .object({
    generation_id: z.string(),
    promotion_id: z.string(),
    status: z.string(),
    content_candidate_count: z.number().int().nonnegative().optional(),
    content_candidates: z.array(z.unknown()).optional()
  })
  .transform((response) => ({
    generation_id: response.generation_id,
    promotion_id: response.promotion_id,
    status: response.status,
    content_candidate_count: response.content_candidate_count ?? response.content_candidates?.length
  }));
const decisionPromotionRunResponseSchema = z.object({
  promotion_run_id: z.string(),
  project_id: z.string(),
  campaign_id: z.string(),
  promotion_id: z.string(),
  analysis_id: z.string(),
  generation_id: z.string(),
  loop_count: z.number().int().min(1),
  status: z.string(),
  goal_snapshot_json: z.record(z.string(), z.unknown()),
  segment_ids: z.array(z.string().min(1)).min(1),
  ad_experiments: z.array(
    z.object({
      ad_experiment_id: z.string(),
      segment_id: z.string(),
      segment_name: z.string().nullable().optional(),
      content_id: z.string(),
      content_option_id: z.string(),
      channel: z.string(),
      is_fallback: z.boolean(),
      loop_count: z.number().int().min(1),
      status: z.string()
    })
  )
});
const decisionSegmentAssignmentBuildResponseSchema = z.object({
  promotion_run_id: z.string(),
  matching_mode: z.string(),
  vector_version: z.string(),
  ann_candidate_limit: z.number().int().nonnegative(),
  ann_candidate_count: z.number().int().nonnegative(),
  exact_reranked_pair_count: z.number().int().nonnegative(),
  assignment_count: z.number().int().nonnegative(),
  batch_has_fallback: z.boolean(),
  completion_scope: z.literal("current_request"),
  fallback_count: z.number().int().nonnegative(),
  below_threshold_fallback_count: z.number().int().nonnegative(),
  no_candidate_fallback_count: z.number().int().nonnegative(),
  invalid_user_vector_fallback_count: z.number().int().nonnegative(),
  ann_underfilled_user_count: z.number().int().nonnegative(),
  skipped_existing_count: z.number().int().nonnegative(),
  insufficient_segment_count: z.number().int().nonnegative(),
  status: z.string()
});
const decisionPromotionRunEvaluateResponseSchema = z.object({
  promotion_run_id: z.string(),
  promotion_id: z.string(),
  status: z.string(),
  ad_experiment_results: z.array(
    z.object({
      ad_experiment_id: z.string(),
      segment_id: z.string(),
      actual_value: z.coerce.number().nonnegative(),
      status: z.string()
    })
  ),
  next_loop_required: z.boolean(),
  failed_segment_ids: z.array(z.string()),
  failed_ad_experiment_ids: z.array(z.string())
});
const decisionNextLoopResponseSchema = z.object({
  previous_promotion_run_id: z.string(),
  next_promotion_run_id: z.string().nullable(),
  promotion_id: z.string(),
  loop_count: z.number().int().min(1),
  segment_ids: z.array(z.string().min(1)).min(1),
  next_analysis_id: z.string().nullable(),
  next_generation_id: z.string().nullable(),
  next_ad_experiments: z.array(
    z.object({
      ad_experiment_id: z.string(),
      segment_id: z.string(),
      segment_name: z.string().nullable().optional(),
      content_id: z.string(),
      content_option_id: z.string(),
      channel: z.string(),
      is_fallback: z.boolean(),
      loop_count: z.number().int().min(1),
      status: z.string()
    })
  )
});

const DEFAULT_ASSIGNMENT_ELIGIBLE_USER_LIMIT = 10_000;

@Injectable()
export class DashboardDecisionClient {
  recommendPromotionSegments(request: {
    campaignId: string;
    projectId: string;
    promotionId: string;
    request: DashboardRecommendPromotionSegmentsRequest;
  }): Promise<DashboardPromotionAnalysisResult> {
    return requestDecisionApi({
      body: {
        project_id: request.projectId,
        campaign_id: request.campaignId,
        promotion_id: request.promotionId,
        operator_instruction: request.request.operator_instruction ?? null,
        segment_instruction: request.request.segment_instruction ?? null
      },
      path: `/decision/v1/promotions/${encodeURIComponent(request.promotionId)}/segment-suggestions/recommend`,
      request,
      schema: decisionPromotionAnalysisResponseSchema
    });
  }

  analyzePromotionSegments(request: {
    campaignId: string;
    projectId: string;
    promotionId: string;
    request: DashboardAnalyzePromotionSegmentsRequest;
  }): Promise<DashboardPromotionAnalysisResult> {
    return requestDecisionApi({
      body: {
        project_id: request.projectId,
        campaign_id: request.campaignId,
        promotion_id: request.promotionId,
        segment_ids: request.request.segment_ids,
        operator_instruction: request.request.operator_instruction ?? null
      },
      path: `/decision/v1/promotions/${encodeURIComponent(request.promotionId)}/analyses`,
      request,
      schema: decisionPromotionAnalysisResponseSchema
    });
  }

  startPromotionGeneration(request: {
    campaignId: string;
    projectId: string;
    promotionId: string;
    request: DashboardStartPromotionGenerationRequest;
  }): Promise<DashboardStartPromotionGenerationResult> {
    return requestDecisionApi({
      body: {
        project_id: request.projectId,
        campaign_id: request.campaignId,
        promotion_id: request.promotionId,
        analysis_id: request.request.analysis_id,
        content_option_count: request.request.content_option_count ?? 3,
        operator_instruction: request.request.operator_instruction ?? null
      },
      idempotencyKey: `dashboard-generation:${randomUUID()}`,
      path: `/decision/v1/promotions/${encodeURIComponent(request.promotionId)}/generation`,
      request,
      schema: decisionPromotionGenerationResponseSchema
    });
  }

  createPromotionRun(request: {
    promotionId: string;
    request: DashboardCreatePromotionRunRequest;
  }): Promise<DashboardCreatePromotionRunResult> {
    return requestDecisionApi({
      body: {
        analysis_id: request.request.analysis_id,
        generation_id: request.request.generation_id,
        segment_ids: request.request.segment_ids,
        loop_count: request.request.loop_count
      },
      path: `/decision/v1/promotions/${encodeURIComponent(request.promotionId)}/runs`,
      request,
      schema: decisionPromotionRunResponseSchema
    });
  }

  buildPromotionRunSegmentAssignments(request: {
    projectId: string;
    promotionRunId: string;
  }): Promise<DashboardBuildPromotionRunAssignmentsResult> {
    return requestDecisionApi({
      body: {
        eligible_user_limit: DEFAULT_ASSIGNMENT_ELIGIBLE_USER_LIMIT
      },
      path: `/decision/v1/promotion-runs/${encodeURIComponent(request.promotionRunId)}/segment-assignments/build`,
      request,
      schema: decisionSegmentAssignmentBuildResponseSchema
    });
  }

  evaluatePromotionRun(request: {
    promotionRunId: string;
  }): Promise<DashboardEvaluatePromotionRunResult> {
    return requestDecisionApi({
      body: {},
      path: `/decision/v1/promotion-runs/${encodeURIComponent(request.promotionRunId)}/evaluate`,
      request,
      schema: decisionPromotionRunEvaluateResponseSchema
    });
  }

  createNextLoop(request: {
    promotionRunId: string;
    request: DashboardCreateNextLoopRequest;
  }): Promise<DashboardCreateNextLoopResult> {
    return requestDecisionApi({
      body: {
        failed_segment_ids: request.request.failed_segment_ids,
        failed_ad_experiment_ids: request.request.failed_ad_experiment_ids,
        operator_instruction: request.request.operator_instruction ?? null
      },
      path: `/decision/v1/promotion-runs/${encodeURIComponent(request.promotionRunId)}/next-loop`,
      request,
      schema: decisionNextLoopResponseSchema
    });
  }
}

async function requestDecisionApi<T>(input: {
  body: unknown;
  idempotencyKey?: string;
  path: string;
  request: unknown;
  schema: z.ZodType<T>;
}): Promise<T> {
  const url = new URL(input.path, env.decision.apiBaseUrl);
  const startedAt = Date.now();
  const provider = "decision-api";
  const endpoint = url.pathname;
  const requestSummary = decisionRequestLogSummary(input.request);
  log.info("provider_request_prepared", { endpoint, provider, request: requestSummary });

  let response: Response;
  try {
    response = await fetch(url, {
      body: JSON.stringify(input.body),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
        "X-Loop-Ad-Internal-Key": env.decision.internalApiKey
      },
      method: "POST"
    });
  } catch (error) {
    log.warn("provider_request_failed", {
      durationMs: durationMs(startedAt),
      endpoint,
      err: error,
      provider,
      request: requestSummary
    });
    throw dashboardErrors.decisionRequestFailed(error);
  }

  if (!response.ok) {
    const error = await readDecisionError(response);
    log.warn("provider_request_failed", {
      durationMs: durationMs(startedAt),
      endpoint,
      error,
      provider,
      statusCode: response.status
    });
    throw dashboardErrors.decisionRequestFailed(error);
  }

  const body: unknown = await response.json();
  const parsed = input.schema.safeParse(body);
  if (!parsed.success) {
    log.warn("provider_response_invalid", {
      endpoint,
      err: parsed.error,
      provider,
      responseKeys: objectKeys(body),
      statusCode: response.status
    });
    throw dashboardErrors.decisionRequestFailed(parsed.error);
  }

  log.info("provider_request_completed", {
    durationMs: durationMs(startedAt),
    endpoint,
    provider,
    result: decisionResponseLogSummary(parsed.data),
    statusCode: response.status
  });
  return parsed.data;
}

function decisionRequestLogSummary(request: unknown) {
  if (!request || typeof request !== "object") {
    return {};
  }

  const envelope = request as Record<string, unknown>;
  const body =
    envelope.request && typeof envelope.request === "object"
      ? (envelope.request as Record<string, unknown>)
      : {};
  const operatorInstruction = body.operator_instruction;
  const segmentInstruction = body.segment_instruction;
  const segmentIds = body.segment_ids;

  return {
    analysisId: stringValue(body.analysis_id),
    campaignId: stringValue(envelope.campaignId),
    generationId: stringValue(body.generation_id),
    hasOperatorInstruction:
      typeof operatorInstruction === "string" && operatorInstruction.length > 0,
    operatorInstructionLength:
      typeof operatorInstruction === "string" ? operatorInstruction.length : 0,
    hasSegmentInstruction: typeof segmentInstruction === "string" && segmentInstruction.length > 0,
    segmentInstructionLength:
      typeof segmentInstruction === "string" ? segmentInstruction.length : 0,
    projectId: stringValue(envelope.projectId),
    promotionId: stringValue(envelope.promotionId),
    promotionRunId: stringValue(envelope.promotionRunId),
    selectedSegmentCount: Array.isArray(segmentIds) ? segmentIds.length : 0
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function decisionResponseLogSummary(value: unknown) {
  if (!value || typeof value !== "object") {
    return { responseType: typeof value };
  }

  const response = value as Record<string, unknown>;
  return {
    analysisId: stringValue(response.analysis_id),
    assignmentCount: Array.isArray(response.assignments) ? response.assignments.length : undefined,
    experimentCount: Array.isArray(response.experiments) ? response.experiments.length : undefined,
    generationId: stringValue(response.generation_id),
    promotionId: stringValue(response.promotion_id),
    promotionRunId: stringValue(response.promotion_run_id),
    responseKeys: objectKeys(response),
    status: stringValue(response.status)
  };
}

function objectKeys(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>)
    : [];
}

async function readDecisionError(response: Response) {
  const fallback = {
    status: response.status,
    statusText: response.statusText
  };

  try {
    const body: unknown = await response.clone().json();
    return {
      ...fallback,
      detail: readDecisionErrorDetail(body)
    };
  } catch {
    return fallback;
  }
}

function readDecisionErrorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("detail" in body)) {
    return undefined;
  }

  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") {
    return detail;
  }

  try {
    return JSON.stringify(detail);
  } catch {
    return undefined;
  }
}

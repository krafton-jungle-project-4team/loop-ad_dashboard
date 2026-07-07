import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type {
  DashboardBuildPromotionRunAssignmentsResult,
  DashboardCreateNextLoopRequest,
  DashboardCreateNextLoopResult,
  DashboardCreatePromotionRunRequest,
  DashboardCreatePromotionRunResult,
  DashboardEvaluatePromotionRunResult,
  DashboardStartPromotionAnalysisRequest,
  DashboardStartPromotionAnalysisResult,
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
  ad_experiments: z.array(
    z.object({
      ad_experiment_id: z.string(),
      segment_id: z.string(),
      segment_name: z.string().nullable().optional(),
      content_id: z.string(),
      content_option_id: z.string(),
      channel: z.string(),
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
      loop_count: z.number().int().min(1),
      status: z.string()
    })
  )
});

const DEFAULT_ASSIGNMENT_ELIGIBLE_USER_LIMIT = 10_000;

@Injectable()
export class DashboardDecisionClient {
  async startPromotionAnalysis(request: {
    campaignId: string;
    projectId: string;
    promotionId: string;
    request: DashboardStartPromotionAnalysisRequest;
  }): Promise<DashboardStartPromotionAnalysisResult> {
    const url = new URL(
      `/decision/v1/promotions/${encodeURIComponent(request.promotionId)}/analysis`,
      env.decision.apiBaseUrl
    );
    const startedAt = Date.now();
    const provider = "decision-api";
    const endpoint = url.pathname;
    log.info("provider_request_prepared", { endpoint, provider, request });

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify({
          project_id: request.projectId,
          campaign_id: request.campaignId,
          promotion_id: request.promotionId,
          focus_segment_ids: request.request.focus_segment_ids ?? null,
          operator_instruction: request.request.operator_instruction ?? null
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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
        request
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
    const parsed = decisionPromotionAnalysisResponseSchema.safeParse(body);
    if (!parsed.success) {
      log.warn("provider_response_invalid", {
        body,
        endpoint,
        err: parsed.error,
        provider,
        statusCode: response.status
      });
      throw dashboardErrors.decisionRequestFailed(parsed.error);
    }

    log.info("provider_request_completed", {
      durationMs: durationMs(startedAt),
      endpoint,
      provider,
      result: parsed.data,
      statusCode: response.status
    });
    return parsed.data;
  }

  async startPromotionGeneration(request: {
    campaignId: string;
    projectId: string;
    promotionId: string;
    request: DashboardStartPromotionGenerationRequest;
  }): Promise<DashboardStartPromotionGenerationResult> {
    const url = new URL(
      `/decision/v1/promotions/${encodeURIComponent(request.promotionId)}/generation`,
      env.decision.apiBaseUrl
    );
    const startedAt = Date.now();
    const provider = "decision-api";
    const endpoint = url.pathname;
    log.info("provider_request_prepared", { endpoint, provider, request });

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify({
          project_id: request.projectId,
          campaign_id: request.campaignId,
          promotion_id: request.promotionId,
          analysis_id: request.request.analysis_id,
          content_option_count: request.request.content_option_count ?? 3,
          operator_instruction: request.request.operator_instruction ?? null
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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
        request
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
    const parsed = decisionPromotionGenerationResponseSchema.safeParse(body);
    if (!parsed.success) {
      log.warn("provider_response_invalid", {
        body,
        endpoint,
        err: parsed.error,
        provider,
        statusCode: response.status
      });
      throw dashboardErrors.decisionRequestFailed(parsed.error);
    }

    log.info("provider_request_completed", {
      durationMs: durationMs(startedAt),
      endpoint,
      provider,
      result: parsed.data,
      statusCode: response.status
    });
    return parsed.data;
  }

  async createPromotionRun(request: {
    promotionId: string;
    request: DashboardCreatePromotionRunRequest;
  }): Promise<DashboardCreatePromotionRunResult> {
    const url = new URL(
      `/decision/v1/promotions/${encodeURIComponent(request.promotionId)}/runs`,
      env.decision.apiBaseUrl
    );
    const startedAt = Date.now();
    const provider = "decision-api";
    const endpoint = url.pathname;
    log.info("provider_request_prepared", { endpoint, provider, request });

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify({
          analysis_id: request.request.analysis_id,
          generation_id: request.request.generation_id,
          loop_count: request.request.loop_count
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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
        request
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
    const parsed = decisionPromotionRunResponseSchema.safeParse(body);
    if (!parsed.success) {
      log.warn("provider_response_invalid", {
        body,
        endpoint,
        err: parsed.error,
        provider,
        statusCode: response.status
      });
      throw dashboardErrors.decisionRequestFailed(parsed.error);
    }

    log.info("provider_request_completed", {
      durationMs: durationMs(startedAt),
      endpoint,
      provider,
      result: parsed.data,
      statusCode: response.status
    });
    return parsed.data;
  }

  async buildPromotionRunSegmentAssignments(request: {
    projectId: string;
    promotionRunId: string;
  }): Promise<DashboardBuildPromotionRunAssignmentsResult> {
    const url = new URL(
      `/decision/v1/promotion-runs/${encodeURIComponent(request.promotionRunId)}/segment-assignments/build`,
      env.decision.apiBaseUrl
    );
    const startedAt = Date.now();
    const provider = "decision-api";
    const endpoint = url.pathname;
    log.info("provider_request_prepared", { endpoint, provider, request });

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify({
          eligible_user_limit: DEFAULT_ASSIGNMENT_ELIGIBLE_USER_LIMIT
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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
        request
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
    const parsed = decisionSegmentAssignmentBuildResponseSchema.safeParse(body);
    if (!parsed.success) {
      log.warn("provider_response_invalid", {
        body,
        endpoint,
        err: parsed.error,
        provider,
        statusCode: response.status
      });
      throw dashboardErrors.decisionRequestFailed(parsed.error);
    }

    log.info("provider_request_completed", {
      durationMs: durationMs(startedAt),
      endpoint,
      provider,
      result: parsed.data,
      statusCode: response.status
    });
    return parsed.data;
  }

  async evaluatePromotionRun(request: {
    promotionRunId: string;
  }): Promise<DashboardEvaluatePromotionRunResult> {
    const url = new URL(
      `/decision/v1/promotion-runs/${encodeURIComponent(request.promotionRunId)}/evaluate`,
      env.decision.apiBaseUrl
    );
    const startedAt = Date.now();
    const provider = "decision-api";
    const endpoint = url.pathname;
    log.info("provider_request_prepared", { endpoint, provider, request });

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify({}),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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
        request
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
    const parsed = decisionPromotionRunEvaluateResponseSchema.safeParse(body);
    if (!parsed.success) {
      log.warn("provider_response_invalid", {
        body,
        endpoint,
        err: parsed.error,
        provider,
        statusCode: response.status
      });
      throw dashboardErrors.decisionRequestFailed(parsed.error);
    }

    log.info("provider_request_completed", {
      durationMs: durationMs(startedAt),
      endpoint,
      provider,
      result: parsed.data,
      statusCode: response.status
    });
    return parsed.data;
  }

  async createNextLoop(request: {
    promotionRunId: string;
    request: DashboardCreateNextLoopRequest;
  }): Promise<DashboardCreateNextLoopResult> {
    const url = new URL(
      `/decision/v1/promotion-runs/${encodeURIComponent(request.promotionRunId)}/next-loop`,
      env.decision.apiBaseUrl
    );
    const startedAt = Date.now();
    const provider = "decision-api";
    const endpoint = url.pathname;
    log.info("provider_request_prepared", { endpoint, provider, request });

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify({
          failed_segment_ids: request.request.failed_segment_ids,
          failed_ad_experiment_ids: request.request.failed_ad_experiment_ids,
          operator_instruction: request.request.operator_instruction ?? null
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
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
        request
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
    const parsed = decisionNextLoopResponseSchema.safeParse(body);
    if (!parsed.success) {
      log.warn("provider_response_invalid", {
        body,
        endpoint,
        err: parsed.error,
        provider,
        statusCode: response.status
      });
      throw dashboardErrors.decisionRequestFailed(parsed.error);
    }

    log.info("provider_request_completed", {
      durationMs: durationMs(startedAt),
      endpoint,
      provider,
      result: parsed.data,
      statusCode: response.status
    });
    return parsed.data;
  }
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

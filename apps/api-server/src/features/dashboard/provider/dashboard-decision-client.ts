import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type {
  DashboardStartPromotionAnalysisRequest,
  DashboardStartPromotionAnalysisResult,
  DashboardStartPromotionGenerationRequest,
  DashboardStartPromotionGenerationResult
} from "@loopad/shared";
import { env } from "../../../infra/env/env.js";
import { dashboardErrors } from "../dashboard-errors.js";

const decisionPromotionAnalysisResponseSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  status: z.string()
});

const decisionPromotionGenerationResponseSchema = z.object({
  generation_id: z.string(),
  promotion_id: z.string(),
  status: z.string(),
  content_candidate_count: z.number().int().nonnegative().optional()
});

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

    let response: Response;
    try {
      response = await fetch(url, {
        body: JSON.stringify({
          project_id: request.projectId,
          campaign_id: request.campaignId,
          promotion_id: request.promotionId,
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
      throw dashboardErrors.decisionRequestFailed(error);
    }

    if (!response.ok) {
      throw dashboardErrors.decisionRequestFailed({
        status: response.status,
        statusText: response.statusText
      });
    }

    const body: unknown = await response.json();
    const parsed = decisionPromotionAnalysisResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw dashboardErrors.decisionRequestFailed(parsed.error);
    }

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
      throw dashboardErrors.decisionRequestFailed(error);
    }

    if (!response.ok) {
      throw dashboardErrors.decisionRequestFailed({
        status: response.status,
        statusText: response.statusText
      });
    }

    const body: unknown = await response.json();
    const parsed = decisionPromotionGenerationResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw dashboardErrors.decisionRequestFailed(parsed.error);
    }

    return parsed.data;
  }
}

import { Injectable } from "@nestjs/common";
import { z } from "zod";
import type {
  DashboardStartPromotionAnalysisRequest,
  DashboardStartPromotionAnalysisResult
} from "@loopad/shared";
import { env } from "../../../infra/env/env.js";
import { dashboardErrors } from "../dashboard-errors.js";

const decisionPromotionAnalysisResponseSchema = z.object({
  analysis_id: z.string(),
  promotion_id: z.string(),
  status: z.string()
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
}

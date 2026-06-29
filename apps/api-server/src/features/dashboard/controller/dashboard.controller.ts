import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import {
  DashboardAiAnalysisSchema,
  DashboardAiGenerationSchema,
  DashboardAiRecommendationSchema,
  DashboardMainSchema,
  DashboardPurchaseConversionSchema
} from "@loopad/shared";
import { success } from "../../../infra/http/api-response.js";
import { DashboardQueryService } from "../service/index.js";

@Controller()
export class DashboardController {
  constructor(private readonly dashboardQuery: DashboardQueryService) {}

  @Get("dashboard/main")
  async main(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(DashboardMainSchema.parse(await this.dashboardQuery.main(requiredProjectId)));
  }

  @Get("dashboard/purchase-conversion")
  async purchaseConversion(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardPurchaseConversionSchema.parse(
        await this.dashboardQuery.purchaseConversion(requiredProjectId)
      )
    );
  }

  @Get("dashboard/ai-analysis")
  async aiAnalysis(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardAiAnalysisSchema.parse(await this.dashboardQuery.aiAnalysis(requiredProjectId))
    );
  }

  @Get("dashboard/ai-recommendation")
  async aiRecommendation(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardAiRecommendationSchema.parse(
        await this.dashboardQuery.aiRecommendation(requiredProjectId)
      )
    );
  }

  @Get("dashboard/ai-generation")
  async aiGeneration(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardAiGenerationSchema.parse(await this.dashboardQuery.aiGeneration(requiredProjectId))
    );
  }
}

function requireProjectId(projectId: string | undefined): string {
  if (!projectId) {
    throw new BadRequestException("projectId query param is required.");
  }
  return projectId;
}

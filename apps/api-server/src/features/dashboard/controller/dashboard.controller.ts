import { Controller, Get, Inject, Query } from "@nestjs/common";
import {
  DashboardAiAnalysisSchema,
  DashboardAiGenerationSchema,
  DashboardAiRecommendationSchema,
  DashboardMainSchema,
  DashboardPurchaseConversionSchema
} from "@loopad/shared";
import { dashboardErrors } from "../dashboard-errors.js";
import { DashboardQueryService } from "../service/index.js";

@Controller()
export class DashboardController {
  constructor(
    @Inject(DashboardQueryService)
    private readonly dashboardQuery: DashboardQueryService
  ) {}

  @Get("dashboard/main")
  async main(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardMainSchema.parse(await this.dashboardQuery.main(requiredProjectId));
  }

  @Get("dashboard/purchase-conversion")
  async purchaseConversion(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardPurchaseConversionSchema.parse(
      await this.dashboardQuery.purchaseConversion(requiredProjectId)
    );
  }

  @Get("dashboard/ai-analysis")
  async aiAnalysis(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardAiAnalysisSchema.parse(await this.dashboardQuery.aiAnalysis(requiredProjectId));
  }

  @Get("dashboard/ai-recommendation")
  async aiRecommendation(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardAiRecommendationSchema.parse(
      await this.dashboardQuery.aiRecommendation(requiredProjectId)
    );
  }

  @Get("dashboard/ai-generation")
  async aiGeneration(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardAiGenerationSchema.parse(
      await this.dashboardQuery.aiGeneration(requiredProjectId)
    );
  }
}

function requireProjectId(projectId: string | undefined): string {
  if (!projectId) {
    throw dashboardErrors.projectIdRequired();
  }
  return projectId;
}

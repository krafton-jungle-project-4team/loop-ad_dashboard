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

  @Get("api/dashboard/v1/main")
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
  async aiAnalysis(
    @Query("projectId") projectId?: string,
    @Query("selectedCustomerId") selectedCustomerId?: string,
    @Query("analysisDate") analysisDate?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardAiAnalysisSchema.parse(
      await this.dashboardQuery.aiAnalysis(requiredProjectId, selectedCustomerId, analysisDate)
    );
  }

  @Get("dashboard/ai-recommendation")
  async aiRecommendation(
    @Query("projectId") projectId?: string,
    @Query("selectedCustomerId") selectedCustomerId?: string,
    @Query("analysisDate") analysisDate?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardAiRecommendationSchema.parse(
      await this.dashboardQuery.aiRecommendation(
        requiredProjectId,
        selectedCustomerId,
        analysisDate
      )
    );
  }

  @Get("dashboard/ai-generation")
  async aiGeneration(
    @Query("projectId") projectId?: string,
    @Query("selectedCustomerId") selectedCustomerId?: string,
    @Query("analysisDate") analysisDate?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardAiGenerationSchema.parse(
      await this.dashboardQuery.aiGeneration(requiredProjectId, selectedCustomerId, analysisDate)
    );
  }
}

function requireProjectId(projectId: string | undefined): string {
  if (!projectId) {
    throw dashboardErrors.projectIdRequired();
  }
  return projectId;
}

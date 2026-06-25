import { Controller, Get, Inject, Query } from "@nestjs/common";
import {
  CreativeReportSchema,
  ConversionReportSchema,
  DashboardOverviewSchema,
  InsightReportSchema,
  RecommendationReportSchema
} from "@loopad/shared";
import { success } from "../../../infra/http/api-response.js";
import { DashboardService } from "../service/dashboard.service.js";

@Controller()
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get("dashboard/overview")
  async overview(@Query("projectId") projectId?: string) {
    return success(DashboardOverviewSchema.parse(await this.dashboardService.overview(projectId)));
  }

  @Get("dashboard/conversion")
  async conversion(@Query("projectId") projectId?: string) {
    return success(ConversionReportSchema.parse(await this.dashboardService.conversion(projectId)));
  }

  @Get("dashboard/ai-insights")
  async insights(@Query("projectId") projectId?: string) {
    return success(InsightReportSchema.parse(await this.dashboardService.insights(projectId)));
  }

  @Get("dashboard/ai-recommendations")
  async recommendations(@Query("projectId") projectId?: string) {
    return success(
      RecommendationReportSchema.parse(await this.dashboardService.recommendations(projectId))
    );
  }

  @Get("creatives/generated")
  async creatives(@Query("projectId") projectId?: string) {
    return success(CreativeReportSchema.parse(await this.dashboardService.creatives(projectId)));
  }
}

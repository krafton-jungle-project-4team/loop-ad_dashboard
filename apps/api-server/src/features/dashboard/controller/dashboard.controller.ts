import { BadRequestException, Controller, Get, Inject, Param, Query } from "@nestjs/common";
import {
  DashboardEventsSummarySchema,
  DashboardExperimentPerformanceSchema,
  DashboardExperimentSchema,
  DashboardFunnelSchema,
  DashboardRecommendationsSchema
} from "@loopad/shared";
import { success } from "../../../infra/http/api-response.js";
import { DashboardService } from "../service/dashboard.service.js";

@Controller()
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get("dashboard/events/summary")
  async eventsSummary(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardEventsSummarySchema.parse(
        await this.dashboardService.eventsSummary(requiredProjectId)
      )
    );
  }

  @Get("dashboard/funnel")
  async funnel(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardFunnelSchema.parse(await this.dashboardService.funnel(requiredProjectId))
    );
  }

  @Get("dashboard/recommendations")
  async recommendations(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardRecommendationsSchema.parse(
        await this.dashboardService.recommendations(requiredProjectId)
      )
    );
  }

  @Get("dashboard/experiments/:experiment_id")
  async experiment(
    @Param("experiment_id") experimentId: string,
    @Query("projectId") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardExperimentSchema.parse(
        await this.dashboardService.experiment(requiredProjectId, experimentId)
      )
    );
  }

  @Get("dashboard/experiments/:experiment_id/performance")
  async experimentPerformance(
    @Param("experiment_id") experimentId: string,
    @Query("projectId") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardExperimentPerformanceSchema.parse(
        await this.dashboardService.experimentPerformance(requiredProjectId, experimentId)
      )
    );
  }
}

function requireProjectId(projectId: string | undefined): string {
  if (!projectId) {
    throw new BadRequestException("projectId query param is required.");
  }
  return projectId;
}

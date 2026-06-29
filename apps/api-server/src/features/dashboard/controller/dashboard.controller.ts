import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  DashboardActionResultSchema,
  DashboardEventsSummarySchema,
  DashboardExperimentPerformancePageSchema,
  DashboardFunnelSchema,
  DashboardRecommendationsSchema
} from "@loopad/shared";
import { success } from "../../../infra/http/api-response.js";
import {
  DashboardCommandService,
  DashboardQueryService,
  type DashboardActionRequest
} from "../service/index.js";

@Controller()
export class DashboardController {
  constructor(
    private readonly dashboardQuery: DashboardQueryService,
    private readonly dashboardCommand: DashboardCommandService
  ) {}

  @Get("dashboard/overview")
  async overview(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardEventsSummarySchema.parse(await this.dashboardQuery.eventsSummary(requiredProjectId))
    );
  }

  @Get("dashboard/funnel-segments")
  async funnelSegments(@Query("projectId") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardFunnelSchema.parse(await this.dashboardQuery.funnel(requiredProjectId))
    );
  }

  @Get("dashboard/recommendation-results")
  async recommendationResults(
    @Query("projectId") projectId?: string,
    @Query("recommendationResultId") recommendationResultId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardRecommendationsSchema.parse(
        await this.dashboardQuery.recommendations(requiredProjectId, recommendationResultId)
      )
    );
  }

  @Get("dashboard/content-results")
  async contentResults(
    @Query("projectId") projectId?: string,
    @Query("recommendationResultId") recommendationResultId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return success(
      DashboardRecommendationsSchema.parse(
        await this.dashboardQuery.recommendations(requiredProjectId, recommendationResultId)
      )
    );
  }

  @Get("dashboard/experiment-performance")
  async experimentPerformance(
    @Query("experimentId") experimentId: string | undefined,
    @Query("projectId") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const requiredExperimentId = requireExperimentId(experimentId);
    return success(
      DashboardExperimentPerformancePageSchema.parse(
        await this.dashboardQuery.experimentPerformancePage(requiredProjectId, requiredExperimentId)
      )
    );
  }

  @Post("dashboard/recommendations/generate")
  async generateRecommendations(@Body() body: DashboardActionRequest) {
    return success(
      DashboardActionResultSchema.parse(
        await this.dashboardCommand.generateRecommendations(requireActionBody(body))
      )
    );
  }

  @Post("dashboard/contents/generate")
  async generateContents(@Body() body: DashboardActionRequest) {
    return success(
      DashboardActionResultSchema.parse(
        await this.dashboardCommand.generateContents(requireContentActionBody(body))
      )
    );
  }

  @Post("dashboard/experiments/:experimentId/evaluate")
  async evaluateExperiment(
    @Param("experimentId") experimentId: string,
    @Body() body: DashboardActionRequest
  ) {
    return success(
      DashboardActionResultSchema.parse(
        await this.dashboardCommand.evaluateExperiment(experimentId, requireActionBody(body))
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

function requireExperimentId(experimentId: string | undefined): string {
  if (!experimentId) {
    throw new BadRequestException("experimentId query param is required.");
  }
  return experimentId;
}

function requireActionBody(body: DashboardActionRequest | undefined): DashboardActionRequest {
  if (!body?.project_id) {
    throw new BadRequestException("project_id body field is required.");
  }
  return body;
}

function requireContentActionBody(
  body: DashboardActionRequest | undefined
): DashboardActionRequest {
  const requiredBody = requireActionBody(body);
  if (!requiredBody.recommendation_result_id) {
    throw new BadRequestException("recommendation_result_id body field is required.");
  }
  return requiredBody;
}

import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from "@nestjs/common";
import {
  DashboardCampaignDetailSchema,
  DashboardCreateFunnelRequestSchema,
  DashboardDeleteFunnelResultSchema,
  DashboardEventCatalogSchema,
  DashboardFunnelListSchema,
  DashboardFunnelMetricsSchema,
  DashboardFunnelSchema,
  DashboardMainSchema,
  DashboardPromotionDetailSchema,
  DashboardSavedSegmentListSchema,
  DashboardSavedSegmentSchema,
  DashboardSaveSegmentRequestSchema,
  DashboardSegmentDetailSchema,
  DashboardSegmentQueryPreviewRequestSchema,
  DashboardSegmentQueryPreviewSchema
} from "@loopad/shared";
import { dashboardErrors } from "../dashboard-errors.js";
import { DashboardQueryService } from "../service/index.js";

@Controller("dashboard/v1")
export class DashboardController {
  constructor(
    @Inject(DashboardQueryService)
    private readonly dashboardQuery: DashboardQueryService
  ) {}

  @Get("main")
  async main(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardMainSchema.parse(await this.dashboardQuery.main(requiredProjectId));
  }

  @Get("campaigns/:campaign_id")
  async campaignDetail(
    @Param("campaign_id") campaignId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardCampaignDetailSchema.parse(
      await this.dashboardQuery.campaignDetail(requiredProjectId, campaignId)
    );
  }

  @Get("promotions/:promotion_id")
  async promotionDetail(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardPromotionDetailSchema.parse(
      await this.dashboardQuery.promotionDetail(requiredProjectId, promotionId)
    );
  }

  @Get("promotions/:promotion_id/segments/:segment_id")
  async segmentDetail(
    @Param("promotion_id") promotionId: string,
    @Param("segment_id") segmentId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardSegmentDetailSchema.parse(
      await this.dashboardQuery.segmentDetail(requiredProjectId, promotionId, segmentId)
    );
  }

  @Get("funnels")
  async funnels(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardFunnelListSchema.parse(await this.dashboardQuery.funnels(requiredProjectId));
  }

  @Get("funnels/:funnel_id/metrics")
  async funnelMetrics(
    @Param("funnel_id") funnelId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardFunnelMetricsSchema.parse(
      await this.dashboardQuery.funnelMetrics(requiredProjectId, funnelId)
    );
  }

  @Get("event-catalog")
  async eventCatalog(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardEventCatalogSchema.parse(
      await this.dashboardQuery.eventCatalog(requiredProjectId)
    );
  }

  @Post("funnels")
  async createFunnel(@Query("project_id") projectId: string | undefined, @Body() body: unknown) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardCreateFunnelRequestSchema.parse(body);
    return DashboardFunnelSchema.parse(
      await this.dashboardQuery.createFunnel(requiredProjectId, request)
    );
  }

  @Delete("funnels/:funnel_id")
  async deleteFunnel(
    @Param("funnel_id") funnelId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardDeleteFunnelResultSchema.parse(
      await this.dashboardQuery.deleteFunnel(requiredProjectId, funnelId)
    );
  }

  @Post("segments/query-preview")
  async createSegmentQueryPreview(
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardSegmentQueryPreviewRequestSchema.parse(body);
    return DashboardSegmentQueryPreviewSchema.parse(
      await this.dashboardQuery.createSegmentQueryPreview(requiredProjectId, request)
    );
  }

  @Get("segments")
  async savedSegments(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardSavedSegmentListSchema.parse(
      await this.dashboardQuery.savedSegments(requiredProjectId)
    );
  }

  @Post("segments")
  async saveSegment(@Query("project_id") projectId: string | undefined, @Body() body: unknown) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardSaveSegmentRequestSchema.parse(body);
    return DashboardSavedSegmentSchema.parse(
      await this.dashboardQuery.saveSegment(requiredProjectId, request)
    );
  }
}

function requireProjectId(projectId: string | undefined): string {
  if (!projectId) {
    throw dashboardErrors.projectIdRequired();
  }
  return projectId;
}

import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import {
  DashboardAdExperimentSchema,
  DashboardApproveContentCandidateRequestSchema,
  DashboardAttachSegmentRequestSchema,
  DashboardCampaignDetailSchema,
  DashboardCampaignSegmentSchema,
  DashboardCampaignSummarySchema,
  DashboardConfirmSegmentSuggestionsRequestSchema,
  DashboardConfirmSegmentSuggestionsResultSchema,
  DashboardCreateCampaignRequestSchema,
  DashboardCreateFunnelRequestSchema,
  DashboardCreatePromotionSegmentDefinitionRequestSchema,
  DashboardCreatePromotionRequestSchema,
  DashboardDecideSegmentSuggestionRequestSchema,
  DashboardDeleteCampaignResultSchema,
  DashboardDeleteFunnelResultSchema,
  DashboardDeletePromotionResultSchema,
  DashboardDeletePromotionSegmentResultSchema,
  DashboardEventCatalogSchema,
  DashboardFunnelListSchema,
  DashboardFunnelMetricsSchema,
  DashboardFunnelSchema,
  DashboardMainSchema,
  DashboardNextLoopAnalysisSchema,
  DashboardPromotionDetailSchema,
  DashboardPromotionScopedSegmentDefinitionListSchema,
  DashboardPromotionScopedSegmentDefinitionSchema,
  DashboardPromotionSegmentSuggestionListSchema,
  DashboardPromotionSegmentSuggestionSchema,
  DashboardPromotionSummarySchema,
  DashboardRejectContentCandidateRequestSchema,
  DashboardRejectContentCandidateResultSchema,
  DashboardSavedSegmentSchema,
  DashboardSaveSegmentRequestSchema,
  DashboardSegmentDetailSchema,
  DashboardSegmentQueryPreviewRequestSchema,
  DashboardSegmentQueryPreviewSchema,
  DashboardStartPromotionAnalysisRequestSchema,
  DashboardStartPromotionAnalysisResultSchema,
  DashboardStartNextLoopRequestSchema,
  DashboardUpdateCampaignRequestSchema,
  DashboardUpdatePromotionRequestSchema,
  DashboardUpdatePromotionSegmentRequestSchema
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

  @Post("campaigns")
  async createCampaign(
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardCreateCampaignRequestSchema.parse(body);
    return DashboardCampaignSummarySchema.parse(
      await this.dashboardQuery.createCampaign(requiredProjectId, request)
    );
  }

  @Patch("campaigns/:campaign_id")
  async updateCampaign(
    @Param("campaign_id") campaignId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardUpdateCampaignRequestSchema.parse(body);
    return DashboardCampaignSummarySchema.parse(
      await this.dashboardQuery.updateCampaign(requiredProjectId, campaignId, request)
    );
  }

  @Delete("campaigns/:campaign_id")
  async deleteCampaign(
    @Param("campaign_id") campaignId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardDeleteCampaignResultSchema.parse(
      await this.dashboardQuery.stopCampaign(requiredProjectId, campaignId)
    );
  }

  @Post("campaigns/:campaign_id/promotions")
  async createPromotion(
    @Param("campaign_id") campaignId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardCreatePromotionRequestSchema.parse(body);
    return DashboardPromotionSummarySchema.parse(
      await this.dashboardQuery.createPromotion(requiredProjectId, campaignId, request)
    );
  }

  @Patch("promotions/:promotion_id")
  async updatePromotion(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardUpdatePromotionRequestSchema.parse(body);
    return DashboardPromotionSummarySchema.parse(
      await this.dashboardQuery.updatePromotion(requiredProjectId, promotionId, request)
    );
  }

  @Delete("promotions/:promotion_id")
  async deletePromotion(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardDeletePromotionResultSchema.parse(
      await this.dashboardQuery.stopPromotion(requiredProjectId, promotionId)
    );
  }

  @Post("promotions/:promotion_id/segments")
  async attachSegmentToPromotion(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardAttachSegmentRequestSchema.parse(body);
    return DashboardCampaignSegmentSchema.parse(
      await this.dashboardQuery.attachSegmentToPromotion(requiredProjectId, promotionId, request)
    );
  }

  @Patch("promotions/:promotion_id/segments/:segment_id")
  async updatePromotionSegment(
    @Param("promotion_id") promotionId: string,
    @Param("segment_id") segmentId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardUpdatePromotionSegmentRequestSchema.parse(body);
    return DashboardCampaignSegmentSchema.parse(
      await this.dashboardQuery.updatePromotionSegment(
        requiredProjectId,
        promotionId,
        segmentId,
        request
      )
    );
  }

  @Delete("promotions/:promotion_id/segments/:segment_id")
  async deletePromotionSegment(
    @Param("promotion_id") promotionId: string,
    @Param("segment_id") segmentId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardDeletePromotionSegmentResultSchema.parse(
      await this.dashboardQuery.stopPromotionSegment(requiredProjectId, promotionId, segmentId)
    );
  }

  @Post("promotions/:promotion_id/next-loop")
  async startNextLoopAnalysis(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardStartNextLoopRequestSchema.parse(body);
    return DashboardNextLoopAnalysisSchema.parse(
      await this.dashboardQuery.startNextLoopAnalysis(requiredProjectId, promotionId, request)
    );
  }

  @Post("promotions/:promotion_id/segments/:segment_id/content-candidates/:content_id/approve")
  async approveContentCandidate(
    @Param("promotion_id") promotionId: string,
    @Param("segment_id") segmentId: string,
    @Param("content_id") contentId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardApproveContentCandidateRequestSchema.parse(body);
    return DashboardAdExperimentSchema.parse(
      await this.dashboardQuery.approveContentCandidate(
        requiredProjectId,
        promotionId,
        segmentId,
        contentId,
        request
      )
    );
  }

  @Post("promotions/:promotion_id/segments/:segment_id/content-candidates/:content_id/reject")
  async rejectContentCandidate(
    @Param("promotion_id") promotionId: string,
    @Param("segment_id") segmentId: string,
    @Param("content_id") contentId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardRejectContentCandidateRequestSchema.parse(body);
    return DashboardRejectContentCandidateResultSchema.parse(
      await this.dashboardQuery.rejectContentCandidate(
        requiredProjectId,
        promotionId,
        segmentId,
        contentId,
        request
      )
    );
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

  @Get("promotions/:promotion_id/segment-suggestions")
  async promotionSegmentSuggestions(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId?: string,
    @Query("analysis_id") analysisId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardPromotionSegmentSuggestionListSchema.parse(
      await this.dashboardQuery.promotionSegmentSuggestions(
        requiredProjectId,
        promotionId,
        analysisId ?? null
      )
    );
  }

  @Post("promotions/:promotion_id/segment-suggestions/analyze")
  async startPromotionAnalysis(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardStartPromotionAnalysisRequestSchema.parse(body ?? {});
    return DashboardStartPromotionAnalysisResultSchema.parse(
      await this.dashboardQuery.startPromotionAnalysis(requiredProjectId, promotionId, request)
    );
  }

  @Get("promotions/:promotion_id/segment-definitions")
  async promotionScopedSegmentDefinitions(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardPromotionScopedSegmentDefinitionListSchema.parse(
      await this.dashboardQuery.promotionScopedSegmentDefinitions(requiredProjectId, promotionId)
    );
  }

  @Post("promotions/:promotion_id/segment-definitions")
  async createPromotionScopedSegmentDefinition(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardCreatePromotionSegmentDefinitionRequestSchema.parse(body);
    return DashboardPromotionScopedSegmentDefinitionSchema.parse(
      await this.dashboardQuery.createPromotionScopedSegmentDefinition(
        requiredProjectId,
        promotionId,
        request
      )
    );
  }

  @Patch("promotions/:promotion_id/segment-suggestions/:suggestion_id")
  async decidePromotionSegmentSuggestion(
    @Param("promotion_id") promotionId: string,
    @Param("suggestion_id") suggestionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardDecideSegmentSuggestionRequestSchema.parse(body);
    return DashboardPromotionSegmentSuggestionSchema.parse(
      await this.dashboardQuery.decidePromotionSegmentSuggestion(
        requiredProjectId,
        promotionId,
        suggestionId,
        request
      )
    );
  }

  @Post("promotions/:promotion_id/segment-suggestions/confirm")
  async confirmPromotionSegmentSuggestions(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardConfirmSegmentSuggestionsRequestSchema.parse(body);
    return DashboardConfirmSegmentSuggestionsResultSchema.parse(
      await this.dashboardQuery.confirmPromotionSegmentSuggestions(
        requiredProjectId,
        promotionId,
        request
      )
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

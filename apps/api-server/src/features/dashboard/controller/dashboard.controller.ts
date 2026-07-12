import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import {
  DashboardArchivePromotionScopedSegmentDefinitionResultSchema,
  DashboardAnalyzePromotionSegmentsRequestSchema,
  DashboardApproveContentCandidateRequestSchema,
  DashboardApproveContentCandidateResultSchema,
  DashboardAttachSegmentRequestSchema,
  DashboardBuildPromotionRunAssignmentsResultSchema,
  DashboardCampaignDetailSchema,
  DashboardCampaignSegmentSchema,
  DashboardCampaignSummarySchema,
  DashboardConfirmSegmentSuggestionsRequestSchema,
  DashboardConfirmSegmentSuggestionsResultSchema,
  DashboardCreateCampaignRequestSchema,
  DashboardCreateNextLoopRequestSchema,
  DashboardCreateNextLoopResultSchema,
  DashboardCreateProjectRequestSchema,
  DashboardCreateFunnelRequestSchema,
  DashboardCreatePromotionRunRequestSchema,
  DashboardCreatePromotionRunResultSchema,
  DashboardCreatePromotionSegmentDefinitionRequestSchema,
  DashboardCreatePromotionRequestSchema,
  DashboardDecideSegmentSuggestionRequestSchema,
  DashboardDeleteCampaignResultSchema,
  DashboardDeleteProjectResultSchema,
  DashboardDeleteFunnelResultSchema,
  DashboardDeletePromotionResultSchema,
  DashboardDeletePromotionSegmentResultSchema,
  DashboardEntitySearchQuerySchema,
  DashboardEntitySearchResponseSchema,
  DashboardEventCatalogSchema,
  DashboardEvaluatePromotionRunResultSchema,
  DashboardFunnelListSchema,
  DashboardFunnelMetricsDateRangeSchema,
  DashboardFunnelMetricsSchema,
  DashboardFunnelMetricsScopeSchema,
  DashboardFunnelPreviewRequestSchema,
  DashboardFunnelPreviewSchema,
  DashboardFunnelSchema,
  DashboardMainSchema,
  DashboardNextLoopAnalysisSchema,
  DashboardProjectListSchema,
  DashboardProjectSchema,
  DashboardProjectExperimentListSchema,
  DashboardPromotionDetailSchema,
  DashboardPromotionAnalysisResultSchema,
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
  DashboardRecommendPromotionSegmentsRequestSchema,
  DashboardStartAdExperimentResultSchema,
  DashboardStartPromotionGenerationRequestSchema,
  DashboardStartPromotionGenerationResultSchema,
  DashboardStartNextLoopRequestSchema,
  DashboardUpdateCampaignRequestSchema,
  DashboardUpdateFunnelRequestSchema,
  DashboardUpdatePromotionRequestSchema,
  DashboardUpdatePromotionSegmentRequestSchema
} from "@loopad/shared";
import type { DashboardFunnelMetricsScope } from "@loopad/shared";
import { dashboardErrors } from "../dashboard-errors.js";
import {
  DashboardEntitySearchService,
  DashboardProjectExperimentsService,
  DashboardQueryService
} from "../service/index.js";

@Controller("dashboard/v1")
export class DashboardController {
  constructor(
    @Inject(DashboardQueryService)
    private readonly dashboardQuery: DashboardQueryService,
    @Inject(DashboardEntitySearchService)
    private readonly entitySearch?: DashboardEntitySearchService,
    @Inject(DashboardProjectExperimentsService)
    private readonly projectExperiments?: DashboardProjectExperimentsService
  ) {}

  @Get("projects")
  async projects() {
    return DashboardProjectListSchema.parse(await this.dashboardQuery.projects());
  }

  @Post("projects")
  async createProject(@Body() body: unknown) {
    const request = DashboardCreateProjectRequestSchema.parse(body);
    return DashboardProjectSchema.parse(await this.dashboardQuery.createProject(request));
  }

  @Delete("projects/:project_id")
  async deleteProject(@Param("project_id") projectId: string) {
    return DashboardDeleteProjectResultSchema.parse(
      await this.dashboardQuery.archiveProject(projectId)
    );
  }

  @Get("main")
  async main(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardMainSchema.parse(await this.dashboardQuery.main(requiredProjectId));
  }

  @Get("entity-search")
  async searchEntities(
    @Query("project_id") projectId?: string,
    @Query("q") query?: string,
    @Query("entity_type") entityType?: string
  ) {
    const request = DashboardEntitySearchQuerySchema.parse({
      entity_type: entityType,
      project_id: projectId,
      q: query
    });
    if (!this.entitySearch) {
      throw new Error("DashboardEntitySearchService is not available.");
    }

    return DashboardEntitySearchResponseSchema.parse(
      await this.entitySearch.search(request.project_id, request.q, request.entity_type)
    );
  }

  @Get("experiments")
  async experiments(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    if (!this.projectExperiments) {
      throw new Error("DashboardProjectExperimentsService is not available.");
    }

    return DashboardProjectExperimentListSchema.parse(
      await this.projectExperiments.list(requiredProjectId)
    );
  }

  @Post("campaigns")
  async createCampaign(@Query("project_id") projectId: string | undefined, @Body() body: unknown) {
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
      await this.dashboardQuery.deleteCampaign(requiredProjectId, campaignId)
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
    return DashboardApproveContentCandidateResultSchema.parse(
      await this.dashboardQuery.approveContentCandidate(
        requiredProjectId,
        promotionId,
        segmentId,
        contentId,
        request
      )
    );
  }

  @Post("promotions/:promotion_id/runs")
  async createPromotionRun(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardCreatePromotionRunRequestSchema.parse(body ?? {});
    return DashboardCreatePromotionRunResultSchema.parse(
      await this.dashboardQuery.createPromotionRun(requiredProjectId, promotionId, request)
    );
  }

  @Post("promotion-runs/:promotion_run_id/segment-assignments/build")
  async buildPromotionRunAssignments(
    @Param("promotion_run_id") promotionRunId: string,
    @Query("project_id") projectId: string | undefined
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardBuildPromotionRunAssignmentsResultSchema.parse(
      await this.dashboardQuery.buildPromotionRunAssignments(requiredProjectId, promotionRunId)
    );
  }

  @Post("promotion-runs/:promotion_run_id/evaluate")
  async evaluatePromotionRun(
    @Param("promotion_run_id") promotionRunId: string,
    @Query("project_id") projectId: string | undefined
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardEvaluatePromotionRunResultSchema.parse(
      await this.dashboardQuery.evaluatePromotionRun(requiredProjectId, promotionRunId)
    );
  }

  @Post("promotion-runs/:promotion_run_id/next-loop")
  async createNextLoop(
    @Param("promotion_run_id") promotionRunId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardCreateNextLoopRequestSchema.parse(body ?? {});
    return DashboardCreateNextLoopResultSchema.parse(
      await this.dashboardQuery.createNextLoop(requiredProjectId, promotionRunId, request)
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

  @Post("promotions/:promotion_id/ad-experiments/:ad_experiment_id/start")
  async startAdExperiment(
    @Param("promotion_id") promotionId: string,
    @Param("ad_experiment_id") adExperimentId: string,
    @Query("project_id") projectId: string | undefined
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardStartAdExperimentResultSchema.parse(
      await this.dashboardQuery.startAdExperiment(requiredProjectId, promotionId, adExperimentId)
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

  @Post("promotions/:promotion_id/segment-suggestions/recommend")
  async recommendPromotionSegments(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardRecommendPromotionSegmentsRequestSchema.parse(body ?? {});
    return DashboardPromotionAnalysisResultSchema.parse(
      await this.dashboardQuery.recommendPromotionSegments(requiredProjectId, promotionId, request)
    );
  }

  @Post("promotions/:promotion_id/analyses")
  async analyzePromotionSegments(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardAnalyzePromotionSegmentsRequestSchema.parse(body ?? {});
    return DashboardPromotionAnalysisResultSchema.parse(
      await this.dashboardQuery.analyzePromotionSegments(requiredProjectId, promotionId, request)
    );
  }

  @Post("promotions/:promotion_id/generation")
  async startPromotionGeneration(
    @Param("promotion_id") promotionId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardStartPromotionGenerationRequestSchema.parse(body ?? {});
    return DashboardStartPromotionGenerationResultSchema.parse(
      await this.dashboardQuery.startPromotionGeneration(requiredProjectId, promotionId, request)
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

  @Delete("promotions/:promotion_id/segment-definitions/:segment_id")
  async archivePromotionScopedSegmentDefinition(
    @Param("promotion_id") promotionId: string,
    @Param("segment_id") segmentId: string,
    @Query("project_id") projectId?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardArchivePromotionScopedSegmentDefinitionResultSchema.parse(
      await this.dashboardQuery.archivePromotionScopedSegmentDefinition(
        requiredProjectId,
        promotionId,
        segmentId
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

  @Get("funnels/:funnel_id")
  async funnel(@Param("funnel_id") funnelId: string, @Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardFunnelSchema.parse(
      await this.dashboardQuery.funnel(requiredProjectId, funnelId)
    );
  }

  @Get("funnels/:funnel_id/metrics")
  async funnelMetrics(
    @Param("funnel_id") funnelId: string,
    @Query("project_id") projectId?: string,
    @Query("scope_type") scopeType?: string,
    @Query("campaign_id") campaignId?: string,
    @Query("promotion_id") promotionId?: string,
    @Query("segment_id") segmentId?: string,
    @Query("dateRange") dateRange?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const scope = parseFunnelMetricsScope({ campaignId, promotionId, scopeType, segmentId });
    const parsedDateRange = DashboardFunnelMetricsDateRangeSchema.parse(
      dateRange ?? "last-14-days"
    );
    return DashboardFunnelMetricsSchema.parse(
      await this.dashboardQuery.funnelMetrics(requiredProjectId, funnelId, scope, parsedDateRange)
    );
  }

  @Get("event-catalog")
  async eventCatalog(@Query("project_id") projectId?: string) {
    const requiredProjectId = requireProjectId(projectId);
    return DashboardEventCatalogSchema.parse(
      await this.dashboardQuery.eventCatalog(requiredProjectId)
    );
  }

  @Post("funnels/preview")
  async previewFunnelMetrics(
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown,
    @Query("dateRange") dateRange?: string
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardFunnelPreviewRequestSchema.parse(body);
    const parsedDateRange = DashboardFunnelMetricsDateRangeSchema.parse(
      dateRange ?? "last-14-days"
    );
    return DashboardFunnelPreviewSchema.parse(
      await this.dashboardQuery.previewFunnelMetrics(requiredProjectId, request, parsedDateRange)
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

  @Patch("funnels/:funnel_id")
  async updateFunnel(
    @Param("funnel_id") funnelId: string,
    @Query("project_id") projectId: string | undefined,
    @Body() body: unknown
  ) {
    const requiredProjectId = requireProjectId(projectId);
    const request = DashboardUpdateFunnelRequestSchema.parse(body);
    return DashboardFunnelSchema.parse(
      await this.dashboardQuery.updateFunnel(requiredProjectId, funnelId, request)
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

function parseFunnelMetricsScope({
  campaignId,
  promotionId,
  scopeType,
  segmentId
}: {
  campaignId?: string;
  promotionId?: string;
  scopeType?: string;
  segmentId?: string;
}): DashboardFunnelMetricsScope | undefined {
  if (!scopeType) {
    return undefined;
  }

  switch (scopeType) {
    case "campaign":
      return DashboardFunnelMetricsScopeSchema.parse({
        scope_type: scopeType,
        campaign_id: campaignId
      });
    case "promotion":
      return DashboardFunnelMetricsScopeSchema.parse({
        scope_type: scopeType,
        promotion_id: promotionId
      });
    case "segment":
      return DashboardFunnelMetricsScopeSchema.parse({
        scope_type: scopeType,
        promotion_id: promotionId || undefined,
        segment_id: segmentId
      });
    default:
      return DashboardFunnelMetricsScopeSchema.parse({ scope_type: scopeType });
  }
}

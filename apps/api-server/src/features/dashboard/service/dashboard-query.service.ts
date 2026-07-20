import { Inject, Injectable, Optional } from "@nestjs/common";
import { Transactional } from "@nestjs-cls/transactional";
import type {
  DashboardArchivePromotionScopedSegmentDefinitionResult,
  DashboardAnalyzePromotionSegmentsRequest,
  DashboardApproveContentCandidateResult,
  DashboardApproveContentCandidateRequest,
  DashboardBuildPromotionRunAssignmentsResult,
  DashboardConfirmSegmentSuggestionsRequest,
  DashboardConfirmSegmentSuggestionsResult,
  DashboardCreateNextLoopRequest,
  DashboardCreateNextLoopResult,
  DashboardCreatePromotionRunRequest,
  DashboardCreatePromotionRunResult,
  DashboardCreateFunnelRequest,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardAttachSegmentRequest,
  DashboardCreateCampaignRequest,
  DashboardCreateProjectRequest,
  DashboardCreatePromotionSegmentDefinitionRequest,
  DashboardDecideSegmentSuggestionRequest,
  DashboardDeleteCampaignResult,
  DashboardDeleteProjectResult,
  DashboardCreatePromotionRequest,
  DashboardDeletePromotionResult,
  DashboardDeletePromotionSegmentResult,
  DashboardDeleteFunnelResult,
  DashboardEventCatalog,
  DashboardEvaluatePromotionRunResult,
  DashboardFunnel,
  DashboardFunnelList,
  DashboardFunnelMetrics,
  DashboardFunnelMetricsDateRange,
  DashboardFunnelMetricsScope,
  DashboardFunnelPreview,
  DashboardFunnelPreviewRequest,
  DashboardMain,
  DashboardNextLoopAnalysis,
  DashboardProject,
  DashboardProjectList,
  DashboardPromotionDetail,
  DashboardPromotionAnalysisResult,
  DashboardPromotionOfferCatalog,
  DashboardPromotionScopedSegmentDefinition,
  DashboardPromotionScopedSegmentDefinitionList,
  DashboardPromotionSegmentSuggestion,
  DashboardPromotionSegmentSuggestionList,
  DashboardPromotionSummary,
  DashboardRejectContentCandidateRequest,
  DashboardRejectContentCandidateResult,
  DashboardReviseContentCandidateHtmlRequest,
  DashboardReviseContentCandidateHtmlResult,
  DashboardSavedSegment,
  DashboardSaveSegmentRequest,
  DashboardSegmentDetail,
  DashboardSegmentAssistantRequest,
  DashboardSegmentAssistantResponse,
  DashboardSegmentQueryPreview,
  DashboardSegmentQueryPreviewRequest,
  DashboardRecommendPromotionSegmentsRequest,
  DashboardStartAdExperimentResult,
  DashboardStartPromotionGenerationRequest,
  DashboardStartPromotionGenerationResult,
  DashboardStartNextLoopRequest,
  DashboardUnapproveContentCandidateRequest,
  DashboardUnapproveContentCandidateResult,
  DashboardUpdateCampaignRequest,
  DashboardUpdateContentCandidateCopyRequest,
  DashboardUpdateContentCandidateCopyResult,
  DashboardUpdateFunnelRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest
} from "@loopad/shared";
import {
  isCampaignDateRangeValid,
  isCampaignScheduleExpired,
  isPromotionScheduleWithinCampaign
} from "@loopad/shared";
import {
  DashboardCampaignReader,
  DashboardFunnelReader,
  DashboardPromotionAutomationRepository,
  DashboardSegmentQueryRepository,
  MIN_SEGMENT_USER_COUNT,
  type SegmentAssistantDiagnostics
} from "../repository/index.js";
import { dashboardErrors } from "../dashboard-errors.js";
import {
  DashboardCreativeRevisionAgent,
  DashboardDecisionClient,
  DashboardSegmentAssistantAgent
} from "../provider/index.js";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import {
  contentCandidateCopy,
  contentCandidateHtmlRevision,
  contentCandidateHtmlUrl,
  editableCreative,
  editedCreativeMetadata,
  rewriteCreativeHtmlCopy,
  sanitizeCreativeHtmlRevision
} from "./content-candidate-copy.js";

const AI_CREATIVE_HTML_INPUT_LIMIT_BYTES = 500_000;

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(DashboardCampaignReader)
    private readonly campaignReader: DashboardCampaignReader,
    @Inject(DashboardFunnelReader)
    private readonly funnelReader: DashboardFunnelReader,
    @Inject(DashboardSegmentQueryRepository)
    private readonly segmentQueryRepository: DashboardSegmentQueryRepository,
    @Inject(DashboardDecisionClient)
    private readonly decisionClient: DashboardDecisionClient,
    @Optional()
    @Inject(DashboardSegmentAssistantAgent)
    private readonly segmentAssistantAgent?: DashboardSegmentAssistantAgent,
    @Optional()
    @Inject(DashboardPromotionAutomationRepository)
    private readonly promotionAutomationRepository?: DashboardPromotionAutomationRepository,
    @Optional()
    @Inject(DashboardCreativeRevisionAgent)
    private readonly creativeRevisionAgent?: DashboardCreativeRevisionAgent
  ) {}

  @LogContextScope()
  async main(projectId: string): Promise<DashboardMain> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const [campaigns, realtimeMetrics] = await Promise.all([
      this.campaignReader.listCampaigns(projectId),
      this.funnelReader.getProjectRealtimeMetrics(projectId)
    ]);
    const response = { campaigns, realtime_metrics: realtimeMetrics };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async projects(): Promise<DashboardProjectList> {
    const startedAt = Date.now();
    log.info("started");
    const response = await this.campaignReader.listProjects();

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createProject(request: DashboardCreateProjectRequest): Promise<DashboardProject> {
    const startedAt = Date.now();
    log.info("started", { request });
    const response = await this.campaignReader.createProject(request);
    log.assignContext({ projectId: response.project_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async archiveProject(projectId: string): Promise<DashboardDeleteProjectResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = await this.campaignReader.archiveProject(projectId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createCampaign(
    projectId: string,
    request: DashboardCreateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request });
    const response = await this.campaignReader.createCampaign(projectId, request);
    log.assignContext({ campaignId: response.campaign_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async updateCampaign(
    projectId: string,
    campaignId: string,
    request: DashboardUpdateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId, request });
    await this.validateCampaignScheduleUpdate(projectId, campaignId, request);
    const response = await this.campaignReader.updateCampaign(projectId, campaignId, request);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async deleteCampaign(
    projectId: string,
    campaignId: string
  ): Promise<DashboardDeleteCampaignResult> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId });

    const response = await this.campaignReader.deleteCampaign(projectId, campaignId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createPromotion(
    projectId: string,
    campaignId: string,
    request: DashboardCreatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId, request });
    const campaign = await this.campaignReader.getCampaignSummary(projectId, campaignId);
    assertCampaignExecutionWindowOpen(campaign);
    assertPromotionScheduleWithinCampaign(request, campaign);
    const response = await this.campaignReader.createPromotion(projectId, campaignId, request);
    log.assignContext({ promotionId: response.promotion_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionOffers(projectId: string): Promise<DashboardPromotionOfferCatalog> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = await this.decisionClient.promotionOffers({ projectId });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async updatePromotion(
    projectId: string,
    promotionId: string,
    request: DashboardUpdatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    const campaign = await this.campaignReader.getCampaignSummary(projectId, promotion.campaign_id);
    assertCampaignExecutionWindowOpen(campaign);
    assertPromotionScheduleWithinCampaign(
      {
        scheduled_end_at: Object.hasOwn(request, "scheduled_end_at")
          ? request.scheduled_end_at
          : promotion.scheduled_end_at,
        scheduled_start_at: Object.hasOwn(request, "scheduled_start_at")
          ? request.scheduled_start_at
          : promotion.scheduled_start_at
      },
      campaign
    );
    const response = await this.campaignReader.updatePromotion(projectId, promotionId, request);
    await this.promotionAutomationRepository?.syncPendingJobs(projectId, promotionId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  private async validateCampaignScheduleUpdate(
    projectId: string,
    campaignId: string,
    request: DashboardUpdateCampaignRequest
  ) {
    if (!Object.hasOwn(request, "start_date") && !Object.hasOwn(request, "end_date")) {
      return;
    }

    const [campaign, promotions] = await Promise.all([
      this.campaignReader.getCampaignSummary(projectId, campaignId),
      this.campaignReader.listCampaignPromotions(projectId, campaignId)
    ]);
    const nextCampaignSchedule = {
      end_date: Object.hasOwn(request, "end_date") ? request.end_date : campaign.end_date,
      start_date: Object.hasOwn(request, "start_date") ? request.start_date : campaign.start_date
    };
    if (
      !isCampaignDateRangeValid(nextCampaignSchedule.start_date, nextCampaignSchedule.end_date) ||
      promotions.some(
        (promotion) => !isPromotionScheduleWithinCampaign(promotion, nextCampaignSchedule)
      )
    ) {
      throw dashboardErrors.campaignPromotionScheduleConflict();
    }
  }

  @LogContextScope()
  @Transactional()
  async stopPromotion(
    projectId: string,
    promotionId: string
  ): Promise<DashboardDeletePromotionResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId });
    const response = await this.campaignReader.stopPromotion(projectId, promotionId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async attachSegmentToPromotion(
    projectId: string,
    promotionId: string,
    request: DashboardAttachSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const response = await this.campaignReader.attachSegmentToPromotion(
      projectId,
      promotionId,
      request
    );
    log.assignContext({ segmentId: response.segment_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async updatePromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string,
    request: DashboardUpdatePromotionSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, request });
    const response = await this.campaignReader.updatePromotionSegment(
      projectId,
      promotionId,
      segmentId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async stopPromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardDeletePromotionSegmentResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId });
    const response = await this.campaignReader.stopPromotionSegment(
      projectId,
      promotionId,
      segmentId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionSegmentSuggestions(
    projectId: string,
    promotionId: string,
    analysisId?: string | null
  ): Promise<DashboardPromotionSegmentSuggestionList> {
    const startedAt = Date.now();
    log.assignContext({ analysisId, projectId, promotionId });
    log.info("started", { projectId, promotionId, analysisId });
    const response = await this.campaignReader.listPromotionSegmentSuggestions(
      projectId,
      promotionId,
      analysisId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async recommendPromotionSegments(
    projectId: string,
    promotionId: string,
    request: DashboardRecommendPromotionSegmentsRequest
  ): Promise<DashboardPromotionAnalysisResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", {
      hasOperatorInstruction: Boolean(request.operator_instruction),
      operatorInstructionLength: request.operator_instruction?.length ?? 0,
      hasSegmentInstruction: Boolean(request.segment_instruction),
      segmentInstructionLength: request.segment_instruction?.length ?? 0
    });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    log.info("promotion_loaded", {
      channel: promotion.channel,
      goalMetric: promotion.goal_metric,
      status: promotion.status
    });
    const response = await this.decisionClient.recommendPromotionSegments({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", {
      analysisId: response.analysis_id,
      status: response.status,
      durationMs: durationMs(startedAt)
    });
    return response;
  }

  @LogContextScope()
  async analyzePromotionSegments(
    projectId: string,
    promotionId: string,
    request: DashboardAnalyzePromotionSegmentsRequest
  ): Promise<DashboardPromotionAnalysisResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", {
      hasOperatorInstruction: Boolean(request.operator_instruction),
      operatorInstructionLength: request.operator_instruction?.length ?? 0,
      selectedSegmentCount: request.segment_ids.length
    });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    log.info("promotion_loaded", {
      channel: promotion.channel,
      goalMetric: promotion.goal_metric,
      status: promotion.status
    });
    const response = await this.decisionClient.analyzePromotionSegments({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", {
      analysisId: response.analysis_id,
      status: response.status,
      durationMs: durationMs(startedAt)
    });
    return response;
  }

  @LogContextScope()
  async startPromotionGeneration(
    projectId: string,
    promotionId: string,
    request: DashboardStartPromotionGenerationRequest
  ): Promise<DashboardStartPromotionGenerationResult> {
    const startedAt = Date.now();
    log.assignContext({ analysisId: request.analysis_id, projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    if (request.segment_id) {
      await this.campaignReader.ensurePromotionTargetSegmentApproved(
        projectId,
        promotionId,
        request.analysis_id,
        request.segment_id
      );
    }
    log.info("promotion_loaded", { promotion });
    const existingGeneration = await this.campaignReader.getPromotionGenerationResult(
      projectId,
      promotionId,
      request.analysis_id,
      request.segment_id
    );

    const completedWithoutCandidates =
      existingGeneration?.status === "completed" &&
      existingGeneration.content_candidate_count === 0;

    if (
      existingGeneration &&
      existingGeneration.status !== "failed" &&
      !completedWithoutCandidates
    ) {
      log.info("promotion_generation_reused", { existingGeneration });
      log.info("completed", { response: existingGeneration, durationMs: durationMs(startedAt) });
      return existingGeneration;
    }

    if (existingGeneration) {
      log.info("promotion_generation_retrying", { existingGeneration });
    }

    const response = await this.decisionClient.startPromotionGeneration({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionScopedSegmentDefinitions(
    projectId: string,
    promotionId: string
  ): Promise<DashboardPromotionScopedSegmentDefinitionList> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId });
    const response = await this.campaignReader.listPromotionScopedSegmentDefinitions(
      projectId,
      promotionId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createPromotionScopedSegmentDefinition(
    projectId: string,
    promotionId: string,
    request: DashboardCreatePromotionSegmentDefinitionRequest
  ): Promise<DashboardPromotionScopedSegmentDefinition> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const response = await this.campaignReader.createPromotionScopedSegmentDefinition(
      projectId,
      promotionId,
      request
    );
    log.assignContext({ segmentId: response.segment_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async archivePromotionScopedSegmentDefinition(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardArchivePromotionScopedSegmentDefinitionResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId });
    const response = await this.campaignReader.archivePromotionScopedSegmentDefinition(
      projectId,
      promotionId,
      segmentId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async decidePromotionSegmentSuggestion(
    projectId: string,
    promotionId: string,
    suggestionId: string,
    request: DashboardDecideSegmentSuggestionRequest
  ): Promise<DashboardPromotionSegmentSuggestion> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, suggestionId });
    log.info("started", { projectId, promotionId, suggestionId, request });
    const response = await this.campaignReader.decidePromotionSegmentSuggestion(
      projectId,
      promotionId,
      suggestionId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async confirmPromotionSegmentSuggestions(
    projectId: string,
    promotionId: string,
    request: DashboardConfirmSegmentSuggestionsRequest
  ): Promise<DashboardConfirmSegmentSuggestionsResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", {
      directSegmentCount: request.segment_ids.length,
      selectedSuggestionCount: request.suggestion_ids.length
    });

    const sourceAnalysisId = request.analysis_id;
    if (request.suggestion_ids.length > 0 && !sourceAnalysisId) {
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_source_batch_mismatch",
          reason: "AI 고객군 후보의 추천 회차를 확인할 수 없어요."
        },
        status: 409
      });
    }

    const selectedSuggestions = sourceAnalysisId
      ? (
          await this.campaignReader.listPromotionSegmentSuggestions(
            projectId,
            promotionId,
            sourceAnalysisId
          )
        ).suggestions.filter((suggestion) =>
          request.suggestion_ids.includes(suggestion.suggestion_id)
        )
      : [];
    const validSelection =
      selectedSuggestions.length === request.suggestion_ids.length &&
      selectedSuggestions.every(
        (suggestion) =>
          suggestion.analysis_id === sourceAnalysisId &&
          (suggestion.suggestion_status === "accepted" ||
            suggestion.suggestion_status === "confirmed")
      );
    if (!validSelection) {
      log.warn("segment_suggestion_selection_invalid", {
        requestedSuggestionCount: request.suggestion_ids.length,
        resolvedSuggestionCount: selectedSuggestions.length
      });
      throw dashboardErrors.segmentSuggestionSelectionInvalid();
    }

    const selectedDirectSegmentIds = new Set(request.segment_ids);
    const scopedSegments =
      selectedDirectSegmentIds.size > 0
        ? await this.campaignReader.listPromotionScopedSegmentDefinitions(projectId, promotionId)
        : { segments: [] };
    const selectedDirectSegments = scopedSegments.segments.filter((segment) =>
      selectedDirectSegmentIds.has(segment.segment_id)
    );
    if (selectedDirectSegments.length !== selectedDirectSegmentIds.size) {
      log.warn("segment_suggestion_selection_invalid", {
        invalidDirectSegmentCount: selectedDirectSegmentIds.size - selectedDirectSegments.length,
        selectedDirectSegmentCount: selectedDirectSegmentIds.size
      });
      throw dashboardErrors.segmentSuggestionSelectionInvalid();
    }

    const v2SuggestionCount = selectedSuggestions.filter(
      (suggestion) => suggestion.audience_snapshot_id !== null
    ).length;
    const v2DirectSegmentCount = selectedDirectSegments.filter(
      (segment) => segment.rule_json.audience_resolution_contract === "segment_audience.v1"
    ).length;
    const totalSelectedCount = selectedSuggestions.length + selectedDirectSegments.length;
    const totalV2Count = v2SuggestionCount + v2DirectSegmentCount;
    if (totalSelectedCount === 0) {
      throw dashboardErrors.segmentSuggestionSelectionInvalid();
    }
    if (totalV2Count === 0) {
      const response = await this.campaignReader.confirmLegacyPromotionSegments(
        projectId,
        promotionId,
        request
      );

      log.info("completed", { response, durationMs: durationMs(startedAt) });
      return response;
    }
    if (totalV2Count !== totalSelectedCount) {
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_contract_mixed",
          reason: "기존 방식과 새 방식의 고객군 후보를 함께 확정할 수 없어요."
        },
        status: 409
      });
    }

    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    const segmentIds = [
      ...new Set([
        ...selectedSuggestions.map((suggestion) => suggestion.segment_id),
        ...selectedDirectSegments.map((segment) => segment.segment_id)
      ])
    ].sort((left, right) => left.localeCompare(right));
    log.assignContext({ campaignId: promotion.campaign_id });
    const analysis = await this.decisionClient.analyzePromotionSegments({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request: { operator_instruction: null, segment_ids: segmentIds }
    });
    const returnedSegmentIds = analysis.target_segments
      .map((segment) => segment.segment_id)
      .sort((left, right) => left.localeCompare(right));
    const hasCompleteV2Targets =
      returnedSegmentIds.length === segmentIds.length &&
      returnedSegmentIds.every((segmentId, index) => segmentId === segmentIds[index]) &&
      analysis.target_segments.every(
        (target) => target.audience_snapshot_id != null && target.final_audience_count != null
      );
    if (!hasCompleteV2Targets) {
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_confirmation_incomplete",
          reason: "Decision에서 최종 고객군 배정 정보를 완성하지 못했어요."
        },
        status: 502
      });
    }

    log.assignContext({ analysisId: analysis.analysis_id });
    const confirmedSuggestionCount =
      request.suggestion_ids.length > 0 && sourceAnalysisId
        ? await this.campaignReader.confirmV2PromotionSegmentSuggestions({
            confirmationAnalysisId: analysis.analysis_id,
            confirmedBy: request.confirmed_by ?? null,
            projectId,
            promotionId,
            sourceAnalysisId,
            suggestionIds: request.suggestion_ids
          })
        : 0;
    if (confirmedSuggestionCount !== request.suggestion_ids.length) {
      log.warn("segment_suggestion_confirmation_mismatch", {
        confirmedSuggestionCount,
        selectedSuggestionCount: request.suggestion_ids.length
      });
      throw dashboardErrors.segmentSuggestionSelectionInvalid();
    }
    const response: DashboardConfirmSegmentSuggestionsResult = {
      analysis_id: analysis.analysis_id,
      confirmed_segment_count: segmentIds.length,
      promotion_id: analysis.promotion_id,
      status: "confirmed",
      target_segments: analysis.target_segments.map((target) => ({
        audience_snapshot_id: target.audience_snapshot_id ?? null,
        audience_status: target.audience_status ?? null,
        final_audience_count: target.final_audience_count ?? null,
        meets_min_sample_size: target.meets_min_sample_size ?? null,
        segment_id: target.segment_id,
        targetable: target.targetable ?? null
      }))
    };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async startNextLoopAnalysis(
    projectId: string,
    promotionId: string,
    request: DashboardStartNextLoopRequest
  ): Promise<DashboardNextLoopAnalysis> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const response = await this.campaignReader.startNextLoopAnalysis(
      projectId,
      promotionId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async approveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardApproveContentCandidateRequest
  ): Promise<DashboardApproveContentCandidateResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, contentId, request });
    const response = await this.campaignReader.approveContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async unapproveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardUnapproveContentCandidateRequest
  ): Promise<DashboardUnapproveContentCandidateResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, contentId, request });
    const response = await this.campaignReader.unapproveContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async updateContentCandidateCopy(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardUpdateContentCandidateCopyRequest,
    publicOrigin: string
  ): Promise<DashboardUpdateContentCandidateCopyResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, contentId });
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    if (candidate.status !== "draft") {
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const creative = editableCreative(candidate);
    if (!creative) {
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const sourceHtml = await readContentCandidateHtml(creative);
    const rewritten = rewriteCreativeHtmlCopy(sourceHtml, contentCandidateCopy(candidate), request);
    if (rewritten.missingFields.length > 0) {
      throw dashboardErrors.contentCandidateCopyNotFound();
    }

    const revision = contentCandidateHtmlRevision(rewritten.html);
    const htmlUrl = contentCandidateHtmlUrl({
      contentId,
      origin: publicOrigin,
      projectId,
      promotionId,
      revision,
      segmentId
    });
    const { metadataJson } = editedCreativeMetadata({
      candidate,
      creative,
      html: rewritten.html,
      htmlUrl
    });
    const response = await this.campaignReader.updateContentCandidateCopy(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request,
      metadataJson,
      htmlUrl
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async reviseContentCandidateHtml(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardReviseContentCandidateHtmlRequest,
    publicOrigin: string
  ): Promise<DashboardReviseContentCandidateHtmlResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", {
      contentId,
      feedbackLength: request.feedback.length,
      projectId,
      promotionId,
      segmentId
    });
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    if (candidate.status !== "draft") {
      throw dashboardErrors.contentCandidateNotEditable();
    }

    const creative = editableCreative(candidate);
    if (!creative) {
      throw dashboardErrors.contentCandidateNotEditable();
    }
    if (!this.creativeRevisionAgent) {
      throw dashboardErrors.contentCandidateHtmlRevisionFailed();
    }

    const sourceHtml = await readContentCandidateHtml(creative);
    if (Buffer.byteLength(sourceHtml) > AI_CREATIVE_HTML_INPUT_LIMIT_BYTES) {
      throw dashboardErrors.contentCandidateHtmlRevisionInvalid();
    }

    const currentCopy = contentCandidateCopy(candidate);
    let revision;
    try {
      revision = await this.creativeRevisionAgent.revise({
        ...currentCopy,
        channel: candidate.channel,
        feedback: request.feedback,
        html: sourceHtml
      });
    } catch (error) {
      throw dashboardErrors.contentCandidateHtmlRevisionFailed(error);
    }

    const nextCopy = {
      body: revision.body,
      cta: revision.cta,
      headline: revision.headline
    };
    let revisedHtml: string;
    try {
      revisedHtml = sanitizeCreativeHtmlRevision({
        copy: nextCopy,
        revisedHtml: revision.html,
        sourceHtml
      });
    } catch (error) {
      log.warn("creative_revision_rejected", {
        err: error,
        outputHtmlBytes: Buffer.byteLength(revision.html)
      });
      throw dashboardErrors.contentCandidateHtmlRevisionInvalid(error);
    }

    const htmlRevision = contentCandidateHtmlRevision(revisedHtml);
    const htmlUrl = contentCandidateHtmlUrl({
      contentId,
      origin: publicOrigin,
      projectId,
      promotionId,
      revision: htmlRevision,
      segmentId
    });
    const { metadataJson } = editedCreativeMetadata({
      candidate,
      creative,
      html: revisedHtml,
      htmlUrl
    });
    const saved = await this.campaignReader.updateContentCandidateCopy(
      projectId,
      promotionId,
      segmentId,
      contentId,
      nextCopy,
      metadataJson,
      htmlUrl
    );
    const response = { ...saved, change_summary: revision.change_summary };

    log.info("completed", {
      changeSummaryLength: revision.change_summary.length,
      durationMs: durationMs(startedAt),
      outputHtmlBytes: Buffer.byteLength(revisedHtml),
      status: saved.status
    });
    return response;
  }

  async contentCandidateHtml(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string
  ): Promise<string> {
    const candidate = await this.campaignReader.getContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId
    );
    const creative = editableCreative(candidate);
    if (!creative?.editedHtml) {
      throw dashboardErrors.contentCandidateHtmlUnavailable();
    }

    return creative.editedHtml;
  }

  @LogContextScope()
  async createPromotionRun(
    projectId: string,
    promotionId: string,
    request: DashboardCreatePromotionRunRequest
  ): Promise<DashboardCreatePromotionRunResult> {
    const startedAt = Date.now();
    log.assignContext({
      analysisId: request.analysis_id,
      generationId: request.generation_id,
      projectId,
      promotionId,
      segmentIds: request.segment_ids
    });
    log.info("started", { projectId, promotionId, request });
    const response = await this.decisionClient.createPromotionRun({
      promotionId,
      request
    });
    log.assignContext({
      campaignId: response.campaign_id,
      promotionRunId: response.promotion_run_id
    });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async buildPromotionRunAssignments(
    projectId: string,
    promotionRunId: string
  ): Promise<DashboardBuildPromotionRunAssignmentsResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionRunId });
    log.info("started", { projectId, promotionRunId });
    const response = await this.decisionClient.buildPromotionRunSegmentAssignments({
      projectId,
      promotionRunId
    });
    const activation = this.promotionAutomationRepository
      ? await this.promotionAutomationRepository.scheduleRunLaunch(projectId, promotionRunId)
      : { activationStatus: "manual_start_required" as const, scheduledStartAt: null };
    const result: DashboardBuildPromotionRunAssignmentsResult = {
      ...response,
      activation_status: activation.activationStatus,
      scheduled_start_at: activation.scheduledStartAt
    };

    log.info("completed", {
      activationStatus: result.activation_status,
      durationMs: durationMs(startedAt),
      response: result,
      scheduledStartAt: result.scheduled_start_at
    });
    return result;
  }

  @LogContextScope()
  async evaluatePromotionRun(
    projectId: string,
    promotionRunId: string
  ): Promise<DashboardEvaluatePromotionRunResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionRunId });
    log.info("started", { projectId, promotionRunId });
    await this.promotionAutomationRepository?.cancelPendingRunEvaluation(promotionRunId);
    await this.campaignReader.preparePromotionRunEvaluationCompatibility(projectId, promotionRunId);
    const response = await this.decisionClient.evaluatePromotionRun({ promotionRunId });
    log.assignContext({ promotionId: response.promotion_id });
    await this.continueAutomaticPromotionLoop(projectId, promotionRunId, response);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  private async continueAutomaticPromotionLoop(
    projectId: string,
    promotionRunId: string,
    evaluation: DashboardEvaluatePromotionRunResult
  ) {
    if (!this.promotionAutomationRepository || !evaluation.next_loop_required) {
      return;
    }
    const config = await this.promotionAutomationRepository.getRunConfig(projectId, promotionRunId);
    if (config.executionMode !== "automatic") {
      return;
    }
    if (config.loopCount >= config.maxLoopCount) {
      log.info("automatic_next_loop_skipped", {
        loopCount: config.loopCount,
        maxLoopCount: config.maxLoopCount,
        reason: "max_loop_count_reached"
      });
      return;
    }
    if (config.scheduledEndAt && Date.parse(config.scheduledEndAt) <= Date.now()) {
      log.info("automatic_next_loop_skipped", { reason: "promotion_window_closed" });
      return;
    }

    const nextLoop = await this.decisionClient.createNextLoop({
      promotionRunId,
      request: {
        content_approval_mode: "automatic",
        failed_ad_experiment_ids: evaluation.failed_ad_experiment_ids,
        failed_segment_ids: evaluation.failed_segment_ids,
        operator_instruction: null
      }
    });
    if (nextLoop.status !== "activated" || !nextLoop.next_promotion_run_id) {
      throw new Error("Automatic next loop did not activate a promotion run.");
    }
    const assignment = await this.buildPromotionRunAssignments(
      projectId,
      nextLoop.next_promotion_run_id
    );
    log.info("automatic_next_loop_prepared", {
      activationStatus: assignment.activation_status,
      loopCount: nextLoop.loop_count,
      nextPromotionRunId: nextLoop.next_promotion_run_id
    });
  }

  @LogContextScope()
  async createNextLoop(
    projectId: string,
    promotionRunId: string,
    request: DashboardCreateNextLoopRequest
  ): Promise<DashboardCreateNextLoopResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionRunId });
    log.info("started", { projectId, promotionRunId, request });
    const response = await this.decisionClient.createNextLoop({
      promotionRunId,
      request
    });
    log.assignContext({ nextPromotionRunId: response.next_promotion_run_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async rejectContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardRejectContentCandidateRequest
  ): Promise<DashboardRejectContentCandidateResult> {
    const startedAt = Date.now();
    log.assignContext({ contentId, projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId, contentId, request });
    const response = await this.campaignReader.rejectContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async startAdExperiment(
    projectId: string,
    promotionId: string,
    adExperimentId: string
  ): Promise<DashboardStartAdExperimentResult> {
    const startedAt = Date.now();
    log.assignContext({ adExperimentId, projectId, promotionId });
    log.info("started", { projectId, promotionId, adExperimentId });
    const response = await this.campaignReader.startAdExperiment(
      projectId,
      promotionId,
      adExperimentId
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async campaignDetail(projectId: string, campaignId: string): Promise<DashboardCampaignDetail> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId });
    const [detail, realtimeMetrics] = await Promise.all([
      this.campaignReader.getCampaignDetail(projectId, campaignId),
      this.funnelReader.getCampaignRealtimeMetrics(projectId, campaignId)
    ]);

    const response = {
      ...detail,
      realtime_metrics: realtimeMetrics
    };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async promotionDetail(projectId: string, promotionId: string): Promise<DashboardPromotionDetail> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId });
    const detail = await this.campaignReader.getPromotionDetail(projectId, promotionId);
    const latestAnalysisId = detail.analyses[0]?.analysis_id;
    const [realtimeMetrics, segmentRealtimeSummaries, generation] = await Promise.all([
      this.funnelReader.getPromotionRealtimeMetrics(projectId, promotionId),
      this.funnelReader.getPromotionSegmentRealtimeSummaries(projectId, promotionId),
      latestAnalysisId
        ? this.campaignReader.getPromotionGenerationResult(projectId, promotionId, latestAnalysisId)
        : Promise.resolve(undefined)
    ]);

    const response = {
      ...detail,
      generation: generation ?? null,
      realtime_metrics: realtimeMetrics,
      segment_realtime_summaries: segmentRealtimeSummaries
    };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async segmentDetail(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardSegmentDetail> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId, segmentId });
    log.info("started", { projectId, promotionId, segmentId });
    const detailPromise = this.campaignReader.getSegmentDetail(projectId, promotionId, segmentId);
    const realtimeMetricsPromise = this.funnelReader.getSegmentRealtimeMetrics(
      projectId,
      promotionId,
      segmentId
    );
    const detail = await detailPromise;
    const [realtimeMetrics, generation] = await Promise.all([
      realtimeMetricsPromise,
      this.campaignReader.getPromotionGenerationResult(
        projectId,
        promotionId,
        detail.segment.analysis_id,
        segmentId
      )
    ]);

    const response = {
      ...detail,
      generation: generation ?? null,
      realtime_metrics: realtimeMetrics
    };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async funnels(projectId: string): Promise<DashboardFunnelList> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = { funnels: await this.funnelReader.listFunnels(projectId) };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async funnel(projectId: string, funnelId: string): Promise<DashboardFunnel> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId });
    const response = await this.funnelReader.getFunnel(projectId, funnelId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async eventCatalog(projectId: string): Promise<DashboardEventCatalog> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = { events: await this.funnelReader.listEventCatalog(projectId) };

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async funnelMetrics(
    projectId: string,
    funnelId: string,
    scope?: DashboardFunnelMetricsScope,
    dateRange: DashboardFunnelMetricsDateRange = "last-14-days"
  ): Promise<DashboardFunnelMetrics> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId, dateRange, scope });
    const response = await this.funnelReader.getFunnelMetrics(
      projectId,
      funnelId,
      scope,
      dateRange
    );

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async previewFunnelMetrics(
    projectId: string,
    request: DashboardFunnelPreviewRequest,
    dateRange: DashboardFunnelMetricsDateRange = "last-14-days"
  ): Promise<DashboardFunnelPreview> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request, dateRange });
    const response = await this.funnelReader.previewFunnelMetrics(projectId, request, dateRange);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnel> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request });
    const response = await this.funnelReader.createFunnel(projectId, request);
    log.assignContext({ funnelId: response.funnel_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async updateFunnel(
    projectId: string,
    funnelId: string,
    request: DashboardUpdateFunnelRequest
  ): Promise<DashboardFunnel> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId, request });
    const response = await this.funnelReader.updateFunnel(projectId, funnelId, request);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async deleteFunnel(projectId: string, funnelId: string): Promise<DashboardDeleteFunnelResult> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId });
    const response = await this.funnelReader.deleteFunnel(projectId, funnelId);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createSegmentQueryPreview(
    projectId: string,
    request: DashboardSegmentQueryPreviewRequest
  ): Promise<DashboardSegmentQueryPreview> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request });
    const response = await this.segmentQueryRepository.createQueryPreview(projectId, request);
    log.assignContext({ queryPreviewId: response.query_preview_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async assistPromotionSegment(
    projectId: string,
    promotionId: string,
    request: DashboardSegmentAssistantRequest
  ): Promise<DashboardSegmentAssistantResponse> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", {
      conversationCount: request.conversation.length,
      hasSourceSuggestion: Boolean(request.source_suggestion),
      messageLength: request.message.length
    });
    await this.campaignReader.getPromotionSummary(projectId, promotionId);

    if (!this.segmentAssistantAgent) {
      throw new Error("Dashboard segment assistant agent is not configured.");
    }
    const sourceContext = request.source_suggestion
      ? {
          role: "assistant" as const,
          content: segmentAssistantSourceContext(request.source_suggestion)
        }
      : null;
    const plan = await this.segmentAssistantAgent.plan({
      conversation: sourceContext
        ? [sourceContext, ...request.conversation.slice(-11)]
        : request.conversation,
      message: request.message
    });
    if (plan.action === "clarification") {
      const response: DashboardSegmentAssistantResponse = {
        action: "clarification",
        assistant_message:
          plan.clarification_message ??
          "조회하거나 만들 고객군의 목적지, 기간, 행동 조건을 조금 더 구체적으로 알려주세요.",
        segment_name: null,
        lookback_days: plan.lookback_days,
        condition_labels: [],
        minimum_sample_size: MIN_SEGMENT_USER_COUNT,
        condition_diagnostics: [],
        suggested_adjustments: [],
        preview: null
      };
      log.info("completed", {
        action: response.action,
        durationMs: durationMs(startedAt)
      });
      return response;
    }

    const preview = await this.segmentQueryRepository.createAssistantQueryPreview(
      projectId,
      segmentAssistantNaturalLanguageQuery(request),
      plan
    );
    log.assignContext({ queryPreviewId: preview.query_preview_id });
    const diagnostics =
      preview.sample_size_status === "too_small"
        ? await this.segmentQueryRepository.diagnoseAssistantPlan(
            projectId,
            plan,
            preview.sample_size
          )
        : emptySegmentAssistantDiagnostics();
    const segmentName = plan.segment_name ?? `${plan.conditions[0]?.label ?? "맞춤 행동"} 고객`;
    const response: DashboardSegmentAssistantResponse = {
      action: plan.action,
      assistant_message: segmentAssistantMessage(
        plan.action,
        plan.lookback_days,
        preview,
        diagnostics
      ),
      segment_name: segmentName,
      lookback_days: plan.lookback_days,
      condition_labels: plan.conditions.map((condition) => condition.label),
      minimum_sample_size: MIN_SEGMENT_USER_COUNT,
      condition_diagnostics: diagnostics.conditionDiagnostics,
      suggested_adjustments: diagnostics.suggestedAdjustments,
      preview
    };

    log.info("completed", {
      action: response.action,
      conditionCount: response.condition_labels.length,
      durationMs: durationMs(startedAt),
      sampleRatio: preview.sample_ratio,
      sampleSize: preview.sample_size,
      sampleSizeStatus: preview.sample_size_status,
      totalEligibleUserCount: preview.total_eligible_user_count
    });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async saveSegment(
    projectId: string,
    request: DashboardSaveSegmentRequest
  ): Promise<DashboardSavedSegment> {
    const startedAt = Date.now();
    log.assignContext({ projectId, queryPreviewId: request.query_preview_id });
    log.info("started", { projectId, request });
    const response = await this.segmentQueryRepository.saveSegment(projectId, request);
    log.assignContext({ segmentId: response.segment_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }
}

function segmentAssistantMessage(
  action: "audience_query" | "segment_preview",
  lookbackDays: number,
  preview: DashboardSegmentQueryPreview,
  diagnostics: SegmentAssistantDiagnostics
) {
  if (preview.sample_size === 0) {
    return `최근 ${lookbackDays}일 기준으로 조건에 맞는 고객을 찾지 못했습니다. 조건이나 조회 기간을 조정해 보세요.`;
  }
  const ratio = (preview.sample_ratio * 100).toLocaleString("ko-KR", {
    maximumFractionDigits: 2
  });
  const counts = `최근 ${lookbackDays}일 기준 조건에 맞는 고객은 ${preview.sample_size.toLocaleString("ko-KR")}명이며, 분석 가능 사용자 ${preview.total_eligible_user_count.toLocaleString("ko-KR")}명의 ${ratio}%입니다.`;
  if (preview.sample_size_status === "too_small") {
    const bottleneck = diagnostics.conditionDiagnostics.find(
      (condition) => condition.is_bottleneck
    );
    const adjustment = diagnostics.suggestedAdjustments.find(
      (item) => item.kind === "remove_condition"
    );
    const reason = bottleneck
      ? ` '${bottleneck.condition_label}' 조건이 대상 범위를 가장 크게 제한하고 있습니다.`
      : " 현재 조건은 고객군 운영 기준을 충족하지 못했습니다.";
    const recovery = adjustment?.estimated_sample_size
      ? ` 이 조건을 제외하면 약 ${adjustment.estimated_sample_size.toLocaleString("ko-KR")}명으로 늘어납니다.`
      : " 아래 조정안을 선택해 다시 계산할 수 있습니다.";
    return `${counts}${reason}${recovery}`;
  }
  return action === "audience_query"
    ? counts
    : `${counts} 조건을 확인한 뒤 이 고객군을 후보로 추가할 수 있습니다.`;
}

function emptySegmentAssistantDiagnostics(): SegmentAssistantDiagnostics {
  return { conditionDiagnostics: [], suggestedAdjustments: [] };
}

function segmentAssistantNaturalLanguageQuery(request: DashboardSegmentAssistantRequest) {
  return request.source_suggestion
    ? `${request.source_suggestion.title} 수정: ${request.message}`
    : request.message;
}

function segmentAssistantSourceContext(
  source: NonNullable<DashboardSegmentAssistantRequest["source_suggestion"]>
) {
  const conditions = source.condition_labels.length
    ? source.condition_labels.join(", ")
    : "표시된 행동 조건 없음";
  return [
    "현재 사용자가 수정 중인 추천 고객군 정보입니다.",
    `제목: ${source.title}`,
    `전략: ${source.strategy_role ?? "추천 전략 후보"}`,
    `현재 대표 표본: ${source.sample_size}명`,
    `현재 조건: ${conditions}`,
    "이후 요청은 이 고객군을 기준으로 조건을 유지, 추가, 제거하거나 완화하는 수정 요청으로 해석하세요."
  ].join("\n");
}

async function readContentCandidateHtml(
  creative: NonNullable<ReturnType<typeof editableCreative>>
) {
  if (creative.editedHtml) {
    return creative.editedHtml;
  }

  try {
    const response = await fetch(creative.artifact.public_url as string, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) {
      throw new Error(`HTML artifact read failed with ${response.status}.`);
    }
    const html = await response.text();
    if (Buffer.byteLength(html) > 2_000_000) {
      throw new Error("HTML artifact exceeds the 2 MB edit limit.");
    }
    return html;
  } catch (error) {
    throw dashboardErrors.contentCandidateHtmlUnavailable(error);
  }
}

function assertCampaignExecutionWindowOpen(campaign: DashboardCampaignSummary) {
  if (
    campaign.status === "completed" ||
    campaign.status === "stopped" ||
    isCampaignScheduleExpired(campaign)
  ) {
    throw dashboardErrors.campaignExecutionWindowClosed();
  }
}

function assertPromotionScheduleWithinCampaign(
  promotion: {
    scheduled_end_at: string | null | undefined;
    scheduled_start_at: string | null | undefined;
  },
  campaign: DashboardCampaignSummary
) {
  if (!isPromotionScheduleWithinCampaign(promotion, campaign)) {
    throw dashboardErrors.promotionCampaignScheduleInvalid();
  }
}

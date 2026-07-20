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
  DashboardCampaignReader,
  DashboardFunnelReader,
  DashboardSegmentQueryRepository
} from "../repository/index.js";
import { dashboardErrors } from "../dashboard-errors.js";
import { DashboardDecisionClient, DashboardSegmentAssistantAgent } from "../provider/index.js";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import {
  contentCandidateCopy,
  contentCandidateHtmlRevision,
  contentCandidateHtmlUrl,
  editableCreative,
  editedCreativeMetadata,
  rewriteCreativeHtmlCopy
} from "./content-candidate-copy.js";

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
    private readonly segmentAssistantAgent?: DashboardSegmentAssistantAgent
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
    const response = await this.campaignReader.updatePromotion(projectId, promotionId, request);

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
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

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
  }

  @LogContextScope()
  async evaluatePromotionRun(
    projectId: string,
    promotionRunId: string
  ): Promise<DashboardEvaluatePromotionRunResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionRunId });
    log.info("started", { projectId, promotionRunId });
    await this.campaignReader.preparePromotionRunEvaluationCompatibility(projectId, promotionRunId);
    const response = await this.decisionClient.evaluatePromotionRun({ promotionRunId });
    log.assignContext({ promotionId: response.promotion_id });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
    return response;
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
    const [detail, realtimeMetrics] = await Promise.all([
      this.campaignReader.getSegmentDetail(projectId, promotionId, segmentId),
      this.funnelReader.getSegmentRealtimeMetrics(projectId, promotionId, segmentId)
    ]);

    const response = {
      ...detail,
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
      messageLength: request.message.length
    });
    await this.campaignReader.getPromotionSummary(projectId, promotionId);

    if (!this.segmentAssistantAgent) {
      throw new Error("Dashboard segment assistant agent is not configured.");
    }
    const plan = await this.segmentAssistantAgent.plan({
      conversation: request.conversation,
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
      request.message,
      plan
    );
    log.assignContext({ queryPreviewId: preview.query_preview_id });
    const segmentName = plan.segment_name ?? `${plan.conditions[0]?.label ?? "맞춤 행동"} 고객`;
    const response: DashboardSegmentAssistantResponse = {
      action: plan.action,
      assistant_message: segmentAssistantMessage(plan.action, plan.lookback_days, preview),
      segment_name: segmentName,
      lookback_days: plan.lookback_days,
      condition_labels: plan.conditions.map((condition) => condition.label),
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
  preview: DashboardSegmentQueryPreview
) {
  if (preview.sample_size === 0) {
    return `최근 ${lookbackDays}일 기준으로 조건에 맞는 고객을 찾지 못했습니다. 조건이나 조회 기간을 조정해 보세요.`;
  }
  const ratio = (preview.sample_ratio * 100).toLocaleString("ko-KR", {
    maximumFractionDigits: 2
  });
  const counts = `최근 ${lookbackDays}일 기준 조건에 맞는 고객은 ${preview.sample_size.toLocaleString("ko-KR")}명이며, 분석 가능 사용자 ${preview.total_eligible_user_count.toLocaleString("ko-KR")}명의 ${ratio}%입니다.`;
  return action === "audience_query"
    ? counts
    : `${counts} 조건을 확인한 뒤 이 고객군을 세그먼트로 추가할 수 있습니다.`;
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

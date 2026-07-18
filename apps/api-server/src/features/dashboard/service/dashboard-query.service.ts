import { Inject, Injectable } from "@nestjs/common";
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
import { DashboardDecisionClient } from "../provider/index.js";
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
    private readonly decisionClient: DashboardDecisionClient
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
    log.info("started", { projectId, promotionId, request });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    log.info("promotion_loaded", { promotion });
    const response = await this.decisionClient.recommendPromotionSegments({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
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
    log.info("started", { projectId, promotionId, request });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    log.info("promotion_loaded", { promotion });
    const response = await this.decisionClient.analyzePromotionSegments({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", { response, durationMs: durationMs(startedAt) });
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
    log.info("promotion_loaded", { promotion });
    const existingGeneration = await this.campaignReader.getPromotionGenerationResult(
      projectId,
      promotionId,
      request.analysis_id
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
  @Transactional()
  async confirmPromotionSegmentSuggestions(
    projectId: string,
    promotionId: string,
    request: DashboardConfirmSegmentSuggestionsRequest
  ): Promise<DashboardConfirmSegmentSuggestionsResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    if (request.suggestion_ids.length === 0) {
      const response = await this.campaignReader.confirmLegacyPromotionSegments(
        projectId,
        promotionId,
        request
      );

      log.info("completed", { response, durationMs: durationMs(startedAt) });
      return response;
    }

    const sourceAnalysisId = request.analysis_id;
    if (!sourceAnalysisId || request.segment_ids.length > 0) {
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_source_batch_mismatch",
          reason: "같은 추천 회차의 AI 고객군 후보만 함께 확정할 수 있어요."
        },
        status: 409
      });
    }

    const sourceBatch = await this.campaignReader.listPromotionSegmentSuggestions(
      projectId,
      promotionId,
      sourceAnalysisId
    );
    const selectedSuggestionIds = new Set(request.suggestion_ids);
    const selectedSuggestions = sourceBatch.suggestions.filter((suggestion) =>
      selectedSuggestionIds.has(suggestion.suggestion_id)
    );
    const validSelection =
      selectedSuggestions.length === request.suggestion_ids.length &&
      selectedSuggestions.every(
        (suggestion) =>
          suggestion.analysis_id === sourceAnalysisId &&
          (suggestion.suggestion_status === "accepted" ||
            suggestion.suggestion_status === "confirmed")
      );
    if (!validSelection) {
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_source_batch_mismatch",
          reason: "선택한 후보가 최신 추천 결과와 일치하지 않아요. 후보를 새로 불러와 주세요."
        },
        status: 409
      });
    }

    const v2SuggestionCount = selectedSuggestions.filter(
      (suggestion) => suggestion.audience_snapshot_id !== null
    ).length;
    if (v2SuggestionCount === 0) {
      const response = await this.campaignReader.confirmLegacyPromotionSegments(
        projectId,
        promotionId,
        request
      );

      log.info("completed", { response, durationMs: durationMs(startedAt) });
      return response;
    }
    if (v2SuggestionCount !== selectedSuggestions.length) {
      throw dashboardErrors.decisionRequestFailed({
        detail: {
          code: "segment_audience_contract_mixed",
          reason: "기존 방식과 새 방식의 고객군 후보를 함께 확정할 수 없어요."
        },
        status: 409
      });
    }

    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    const segmentIds = selectedSuggestions
      .map((suggestion) => suggestion.segment_id)
      .sort((left, right) => left.localeCompare(right));
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

    const confirmedSegmentCount = await this.campaignReader.confirmV2PromotionSegmentSuggestions({
      confirmationAnalysisId: analysis.analysis_id,
      confirmedBy: request.confirmed_by ?? null,
      projectId,
      promotionId,
      sourceAnalysisId,
      suggestionIds: request.suggestion_ids
    });
    const response: DashboardConfirmSegmentSuggestionsResult = {
      analysis_id: analysis.analysis_id,
      confirmed_segment_count: confirmedSegmentCount,
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

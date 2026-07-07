import { Inject, Injectable } from "@nestjs/common";
import { Transactional } from "@nestjs-cls/transactional";
import type {
  DashboardArchivePromotionScopedSegmentDefinitionResult,
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
  DashboardFunnelList,
  DashboardFunnelMetrics,
  DashboardMain,
  DashboardNextLoopAnalysis,
  DashboardProject,
  DashboardProjectList,
  DashboardPromotionDetail,
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
  DashboardStartPromotionAnalysisRequest,
  DashboardStartPromotionAnalysisResult,
  DashboardStartAdExperimentResult,
  DashboardStartPromotionGenerationRequest,
  DashboardStartPromotionGenerationResult,
  DashboardStartNextLoopRequest,
  DashboardUpdateCampaignRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest
} from "@loopad/shared";
import {
  DashboardCampaignReader,
  DashboardFunnelReader,
  DashboardSegmentQueryRepository
} from "../repository/index.js";
import { DashboardDecisionClient } from "../provider/index.js";
import { LogContextScope, log } from "../../../infra/logger/index.js";

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
    const response = { campaigns: await this.campaignReader.listCampaigns(projectId) };

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  async projects(): Promise<DashboardProjectList> {
    const startedAt = Date.now();
    log.info("started");
    const response = await this.campaignReader.listProjects();

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createProject(request: DashboardCreateProjectRequest): Promise<DashboardProject> {
    const startedAt = Date.now();
    log.info("started", { request });
    const response = await this.campaignReader.createProject(request);
    log.assignContext({ projectId: response.project_id });

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async archiveProject(projectId: string): Promise<DashboardDeleteProjectResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = await this.campaignReader.archiveProject(projectId);

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async stopCampaign(
    projectId: string,
    campaignId: string
  ): Promise<DashboardDeleteCampaignResult> {
    const startedAt = Date.now();
    log.assignContext({ campaignId, projectId });
    log.info("started", { projectId, campaignId });
    const response = await this.campaignReader.stopCampaign(projectId, campaignId);

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  async startPromotionAnalysis(
    projectId: string,
    promotionId: string,
    request: DashboardStartPromotionAnalysisRequest
  ): Promise<DashboardStartPromotionAnalysisResult> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId, request });
    const promotion = await this.campaignReader.getPromotionSummary(projectId, promotionId);
    log.assignContext({ campaignId: promotion.campaign_id });
    log.info("promotion_loaded", { promotion });
    const response = await this.decisionClient.startPromotionAnalysis({
      campaignId: promotion.campaign_id,
      projectId,
      promotionId,
      request
    });

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    if (existingGeneration && existingGeneration.status !== "failed") {
      log.info("promotion_generation_reused", { existingGeneration });
      log.info("completed", { response: existingGeneration, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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
    const response = await this.campaignReader.confirmPromotionSegmentSuggestions(
      projectId,
      promotionId,
      request
    );

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
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
      promotionId
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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
    const response = await this.decisionClient.evaluatePromotionRun({ promotionRunId });
    log.assignContext({ promotionId: response.promotion_id });

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  async promotionDetail(projectId: string, promotionId: string): Promise<DashboardPromotionDetail> {
    const startedAt = Date.now();
    log.assignContext({ projectId, promotionId });
    log.info("started", { projectId, promotionId });
    const [detail, realtimeMetrics, segmentRealtimeSummaries] = await Promise.all([
      this.campaignReader.getPromotionDetail(projectId, promotionId),
      this.funnelReader.getPromotionRealtimeMetrics(projectId, promotionId),
      this.funnelReader.getPromotionSegmentRealtimeSummaries(projectId, promotionId)
    ]);

    const response = {
      ...detail,
      realtime_metrics: realtimeMetrics,
      segment_realtime_summaries: segmentRealtimeSummaries
    };

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  async funnels(projectId: string): Promise<DashboardFunnelList> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = { funnels: await this.funnelReader.listFunnels(projectId) };

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  async eventCatalog(projectId: string): Promise<DashboardEventCatalog> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = { events: await this.funnelReader.listEventCatalog(projectId) };

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  async funnelMetrics(projectId: string, funnelId: string): Promise<DashboardFunnelMetrics> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId });
    const response = await this.funnelReader.getFunnelMetrics(projectId, funnelId);

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnelList["funnels"][number]> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId, request });
    const response = await this.funnelReader.createFunnel(projectId, request);
    log.assignContext({ funnelId: response.funnel_id });

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }

  @LogContextScope()
  @Transactional()
  async deleteFunnel(projectId: string, funnelId: string): Promise<DashboardDeleteFunnelResult> {
    const startedAt = Date.now();
    log.assignContext({ funnelId, projectId });
    log.info("started", { projectId, funnelId });
    const response = await this.funnelReader.deleteFunnel(projectId, funnelId);

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
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

    log.info("completed", { response, durationMs: Date.now() - startedAt });
    return response;
  }
}

import { Inject, Injectable } from "@nestjs/common";
import { Transactional } from "@nestjs-cls/transactional";
import type {
  DashboardAdExperiment,
  DashboardApproveContentCandidateRequest,
  DashboardCreateFunnelRequest,
  DashboardCampaignDetail,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardAttachSegmentRequest,
  DashboardCreateCampaignRequest,
  DashboardDeleteCampaignResult,
  DashboardDeleteSavedSegmentResult,
  DashboardCreatePromotionRequest,
  DashboardDeletePromotionResult,
  DashboardDeletePromotionSegmentResult,
  DashboardDeleteFunnelResult,
  DashboardEventCatalog,
  DashboardFunnelList,
  DashboardFunnelMetrics,
  DashboardMain,
  DashboardNextLoopAnalysis,
  DashboardPromotionDetail,
  DashboardPromotionSummary,
  DashboardRejectContentCandidateRequest,
  DashboardRejectContentCandidateResult,
  DashboardSavedSegment,
  DashboardSavedSegmentList,
  DashboardSaveSegmentRequest,
  DashboardSegmentDetail,
  DashboardSegmentQueryPreview,
  DashboardSegmentQueryPreviewRequest,
  DashboardStartNextLoopRequest,
  DashboardUpdateCampaignRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest,
  DashboardUpdateSavedSegmentRequest
} from "@loopad/shared";
import {
  DashboardCampaignReader,
  DashboardFunnelReader,
  DashboardSegmentQueryRepository
} from "../repository/index.js";

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(DashboardCampaignReader)
    private readonly campaignReader: DashboardCampaignReader,
    @Inject(DashboardFunnelReader)
    private readonly funnelReader: DashboardFunnelReader,
    @Inject(DashboardSegmentQueryRepository)
    private readonly segmentQueryRepository: DashboardSegmentQueryRepository
  ) {}

  async main(projectId: string): Promise<DashboardMain> {
    return { campaigns: await this.campaignReader.listCampaigns(projectId) };
  }

  @Transactional()
  async createCampaign(
    projectId: string,
    request: DashboardCreateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    return this.campaignReader.createCampaign(projectId, request);
  }

  @Transactional()
  async updateCampaign(
    projectId: string,
    campaignId: string,
    request: DashboardUpdateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    return this.campaignReader.updateCampaign(projectId, campaignId, request);
  }

  @Transactional()
  async stopCampaign(
    projectId: string,
    campaignId: string
  ): Promise<DashboardDeleteCampaignResult> {
    return this.campaignReader.stopCampaign(projectId, campaignId);
  }

  @Transactional()
  async createPromotion(
    projectId: string,
    campaignId: string,
    request: DashboardCreatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    return this.campaignReader.createPromotion(projectId, campaignId, request);
  }

  @Transactional()
  async updatePromotion(
    projectId: string,
    promotionId: string,
    request: DashboardUpdatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    return this.campaignReader.updatePromotion(projectId, promotionId, request);
  }

  @Transactional()
  async stopPromotion(
    projectId: string,
    promotionId: string
  ): Promise<DashboardDeletePromotionResult> {
    return this.campaignReader.stopPromotion(projectId, promotionId);
  }

  @Transactional()
  async attachSegmentToPromotion(
    projectId: string,
    promotionId: string,
    request: DashboardAttachSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    return this.campaignReader.attachSegmentToPromotion(projectId, promotionId, request);
  }

  @Transactional()
  async updatePromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string,
    request: DashboardUpdatePromotionSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    return this.campaignReader.updatePromotionSegment(projectId, promotionId, segmentId, request);
  }

  @Transactional()
  async stopPromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardDeletePromotionSegmentResult> {
    return this.campaignReader.stopPromotionSegment(projectId, promotionId, segmentId);
  }

  @Transactional()
  async startNextLoopAnalysis(
    projectId: string,
    promotionId: string,
    request: DashboardStartNextLoopRequest
  ): Promise<DashboardNextLoopAnalysis> {
    return this.campaignReader.startNextLoopAnalysis(projectId, promotionId, request);
  }

  @Transactional()
  async approveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardApproveContentCandidateRequest
  ): Promise<DashboardAdExperiment> {
    return this.campaignReader.approveContentCandidate(
      projectId,
      promotionId,
      segmentId,
      contentId,
      request
    );
  }

  @Transactional()
  async rejectContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardRejectContentCandidateRequest
  ): Promise<DashboardRejectContentCandidateResult> {
    return this.campaignReader.rejectContentCandidate(projectId, promotionId, segmentId, contentId, request);
  }

  async campaignDetail(projectId: string, campaignId: string): Promise<DashboardCampaignDetail> {
    const [detail, realtimeMetrics] = await Promise.all([
      this.campaignReader.getCampaignDetail(projectId, campaignId),
      this.funnelReader.getCampaignRealtimeMetrics(projectId, campaignId)
    ]);

    return {
      ...detail,
      realtime_metrics: realtimeMetrics
    };
  }

  async promotionDetail(
    projectId: string,
    promotionId: string
  ): Promise<DashboardPromotionDetail> {
    const [detail, realtimeMetrics, segmentRealtimeSummaries] = await Promise.all([
      this.campaignReader.getPromotionDetail(projectId, promotionId),
      this.funnelReader.getPromotionRealtimeMetrics(projectId, promotionId),
      this.funnelReader.getPromotionSegmentRealtimeSummaries(projectId, promotionId)
    ]);

    return {
      ...detail,
      realtime_metrics: realtimeMetrics,
      segment_realtime_summaries: segmentRealtimeSummaries
    };
  }

  async segmentDetail(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardSegmentDetail> {
    const [detail, realtimeMetrics] = await Promise.all([
      this.campaignReader.getSegmentDetail(projectId, promotionId, segmentId),
      this.funnelReader.getSegmentRealtimeMetrics(projectId, promotionId, segmentId)
    ]);

    return {
      ...detail,
      realtime_metrics: realtimeMetrics
    };
  }

  async funnels(projectId: string): Promise<DashboardFunnelList> {
    return { funnels: await this.funnelReader.listFunnels(projectId) };
  }

  async eventCatalog(projectId: string): Promise<DashboardEventCatalog> {
    return { events: await this.funnelReader.listEventCatalog(projectId) };
  }

  async funnelMetrics(projectId: string, funnelId: string): Promise<DashboardFunnelMetrics> {
    return this.funnelReader.getFunnelMetrics(projectId, funnelId);
  }

  @Transactional()
  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnelList["funnels"][number]> {
    return this.funnelReader.createFunnel(projectId, request);
  }

  @Transactional()
  async deleteFunnel(
    projectId: string,
    funnelId: string
  ): Promise<DashboardDeleteFunnelResult> {
    return this.funnelReader.deleteFunnel(projectId, funnelId);
  }

  @Transactional()
  async createSegmentQueryPreview(
    projectId: string,
    request: DashboardSegmentQueryPreviewRequest
  ): Promise<DashboardSegmentQueryPreview> {
    return this.segmentQueryRepository.createQueryPreview(projectId, request);
  }

  @Transactional()
  async saveSegment(
    projectId: string,
    request: DashboardSaveSegmentRequest
  ): Promise<DashboardSavedSegment> {
    return this.segmentQueryRepository.saveSegment(projectId, request);
  }

  @Transactional()
  async updateSavedSegment(
    projectId: string,
    segmentId: string,
    request: DashboardUpdateSavedSegmentRequest
  ): Promise<DashboardSavedSegment> {
    return this.segmentQueryRepository.updateSavedSegment(projectId, segmentId, request);
  }

  @Transactional()
  async archiveSavedSegment(
    projectId: string,
    segmentId: string
  ): Promise<DashboardDeleteSavedSegmentResult> {
    return this.segmentQueryRepository.archiveSavedSegment(projectId, segmentId);
  }

  async savedSegments(projectId: string): Promise<DashboardSavedSegmentList> {
    return this.segmentQueryRepository.listSavedSegments(projectId);
  }
}

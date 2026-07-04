import { Inject, Injectable } from "@nestjs/common";
import { InjectTransactionHost, TransactionHost } from "@nestjs-cls/transactional";
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
  DashboardSavedSegment,
  DashboardSavedSegmentList,
  DashboardSaveSegmentRequest,
  DashboardSegmentDetail,
  DashboardSegmentQueryPreview,
  DashboardSegmentQueryPreviewRequest,
  DashboardStartNextLoopRequest,
  DashboardUpdateCampaignRequest,
  DashboardUpdatePromotionRequest,
  DashboardUpdatePromotionSegmentRequest
} from "@loopad/shared";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
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
    private readonly segmentQueryRepository: DashboardSegmentQueryRepository,
    @InjectTransactionHost()
    private readonly transactionHost: TransactionHost<PgTypedTransactionalAdapter>
  ) {}

  async main(projectId: string): Promise<DashboardMain> {
    return { campaigns: await this.campaignReader.listCampaigns(projectId) };
  }

  async createCampaign(
    projectId: string,
    request: DashboardCreateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.createCampaign(projectId, request)
    );
  }

  async updateCampaign(
    projectId: string,
    campaignId: string,
    request: DashboardUpdateCampaignRequest
  ): Promise<DashboardCampaignSummary> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.updateCampaign(projectId, campaignId, request)
    );
  }

  async stopCampaign(
    projectId: string,
    campaignId: string
  ): Promise<DashboardDeleteCampaignResult> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.stopCampaign(projectId, campaignId)
    );
  }

  async createPromotion(
    projectId: string,
    campaignId: string,
    request: DashboardCreatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.createPromotion(projectId, campaignId, request)
    );
  }

  async updatePromotion(
    projectId: string,
    promotionId: string,
    request: DashboardUpdatePromotionRequest
  ): Promise<DashboardPromotionSummary> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.updatePromotion(projectId, promotionId, request)
    );
  }

  async stopPromotion(
    projectId: string,
    promotionId: string
  ): Promise<DashboardDeletePromotionResult> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.stopPromotion(projectId, promotionId)
    );
  }

  async attachSegmentToPromotion(
    projectId: string,
    promotionId: string,
    request: DashboardAttachSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.attachSegmentToPromotion(projectId, promotionId, request)
    );
  }

  async updatePromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string,
    request: DashboardUpdatePromotionSegmentRequest
  ): Promise<DashboardCampaignSegment> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.updatePromotionSegment(projectId, promotionId, segmentId, request)
    );
  }

  async stopPromotionSegment(
    projectId: string,
    promotionId: string,
    segmentId: string
  ): Promise<DashboardDeletePromotionSegmentResult> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.stopPromotionSegment(projectId, promotionId, segmentId)
    );
  }

  async startNextLoopAnalysis(
    projectId: string,
    promotionId: string,
    request: DashboardStartNextLoopRequest
  ): Promise<DashboardNextLoopAnalysis> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.startNextLoopAnalysis(projectId, promotionId, request)
    );
  }

  async approveContentCandidate(
    projectId: string,
    promotionId: string,
    segmentId: string,
    contentId: string,
    request: DashboardApproveContentCandidateRequest
  ): Promise<DashboardAdExperiment> {
    return this.transactionHost.withTransaction(() =>
      this.campaignReader.approveContentCandidate(
        projectId,
        promotionId,
        segmentId,
        contentId,
        request
      )
    );
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
    const [detail, realtimeMetrics] = await Promise.all([
      this.campaignReader.getPromotionDetail(projectId, promotionId),
      this.funnelReader.getPromotionRealtimeMetrics(projectId, promotionId)
    ]);

    return {
      ...detail,
      realtime_metrics: realtimeMetrics
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

  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnelList["funnels"][number]> {
    return this.transactionHost.withTransaction(() =>
      this.funnelReader.createFunnel(projectId, request)
    );
  }

  async deleteFunnel(
    projectId: string,
    funnelId: string
  ): Promise<DashboardDeleteFunnelResult> {
    return this.transactionHost.withTransaction(() =>
      this.funnelReader.deleteFunnel(projectId, funnelId)
    );
  }

  async createSegmentQueryPreview(
    projectId: string,
    request: DashboardSegmentQueryPreviewRequest
  ): Promise<DashboardSegmentQueryPreview> {
    return this.transactionHost.withTransaction(() =>
      this.segmentQueryRepository.createQueryPreview(projectId, request)
    );
  }

  async saveSegment(
    projectId: string,
    request: DashboardSaveSegmentRequest
  ): Promise<DashboardSavedSegment> {
    return this.transactionHost.withTransaction(() =>
      this.segmentQueryRepository.saveSegment(projectId, request)
    );
  }

  async savedSegments(projectId: string): Promise<DashboardSavedSegmentList> {
    return this.segmentQueryRepository.listSavedSegments(projectId);
  }
}

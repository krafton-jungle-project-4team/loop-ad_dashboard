import { Inject, Injectable } from "@nestjs/common";
import { InjectTransactionHost, TransactionHost } from "@nestjs-cls/transactional";
import type {
  DashboardCreateFunnelRequest,
  DashboardCampaignDetail,
  DashboardDeleteFunnelResult,
  DashboardEventCatalog,
  DashboardFunnelList,
  DashboardFunnelMetrics,
  DashboardMain,
  DashboardPromotionDetail,
  DashboardSegmentDetail
} from "@loopad/shared";
import { PgTypedTransactionalAdapter } from "../../../infra/database/pgtyped-transactional.adapter.js";
import { DashboardCampaignReader, DashboardFunnelReader } from "../repository/index.js";

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(DashboardCampaignReader)
    private readonly campaignReader: DashboardCampaignReader,
    @Inject(DashboardFunnelReader)
    private readonly funnelReader: DashboardFunnelReader,
    @InjectTransactionHost()
    private readonly transactionHost: TransactionHost<PgTypedTransactionalAdapter>
  ) {}

  async main(projectId: string): Promise<DashboardMain> {
    return { campaigns: await this.campaignReader.listCampaigns(projectId) };
  }

  async campaignDetail(projectId: string, campaignId: string): Promise<DashboardCampaignDetail> {
    return this.campaignReader.getCampaignDetail(projectId, campaignId);
  }

  async promotionDetail(
    projectId: string,
    promotionId: string
  ): Promise<DashboardPromotionDetail> {
    return this.campaignReader.getPromotionDetail(projectId, promotionId);
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
}

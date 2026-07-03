import { Inject, Injectable } from "@nestjs/common";
import { TransactionHost } from "@nestjs-cls/transactional";
import type {
  DashboardCreateFunnelRequest,
  DashboardEventCatalog,
  DashboardFunnelList,
  DashboardMain
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
    private readonly transactionHost: TransactionHost<PgTypedTransactionalAdapter>
  ) {}

  async main(projectId: string): Promise<DashboardMain> {
    return { campaigns: await this.campaignReader.listCampaigns(projectId) };
  }

  async funnels(projectId: string): Promise<DashboardFunnelList> {
    return { funnels: await this.funnelReader.listFunnels(projectId) };
  }

  async eventCatalog(projectId: string): Promise<DashboardEventCatalog> {
    return { events: await this.funnelReader.listEventCatalog(projectId) };
  }

  async createFunnel(
    projectId: string,
    request: DashboardCreateFunnelRequest
  ): Promise<DashboardFunnelList["funnels"][number]> {
    return this.transactionHost.withTransaction(() =>
      this.funnelReader.createFunnel(projectId, request)
    );
  }
}

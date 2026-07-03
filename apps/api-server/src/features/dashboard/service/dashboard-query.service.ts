import { Inject, Injectable } from "@nestjs/common";
import type { DashboardMain } from "@loopad/shared";
import { DashboardCampaignReader } from "../repository/index.js";

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(DashboardCampaignReader)
    private readonly campaignReader: DashboardCampaignReader
  ) {}

  async main(projectId: string): Promise<DashboardMain> {
    return { campaigns: await this.campaignReader.listCampaigns(projectId) };
  }
}

import { Inject, Injectable } from "@nestjs/common";
import type {
  DashboardAiAnalysis,
  DashboardAiGeneration,
  DashboardAiRecommendation,
  DashboardMain,
  DashboardPurchaseConversion
} from "@loopad/shared";
import { DashboardViewDomain } from "../domain/index.js";
import { DashboardEventQuery, DashboardRecommendationReader } from "../repository/index.js";

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(DashboardEventQuery)
    private readonly eventQuery: DashboardEventQuery,
    @Inject(DashboardRecommendationReader)
    private readonly recommendationReader: DashboardRecommendationReader
  ) {}

  async main(projectId: string): Promise<DashboardMain> {
    return DashboardViewDomain.toMain(await this.queryEventAnalysis(projectId));
  }

  async purchaseConversion(projectId: string): Promise<DashboardPurchaseConversion> {
    const eventAnalysis = await this.queryEventAnalysis(projectId);

    return DashboardViewDomain.toPurchaseConversion(
      eventAnalysis.funnel,
      eventAnalysis.deviceFunnels,
      eventAnalysis.customerGroupsHigh
    );
  }

  async aiAnalysis(
    projectId: string,
    selectedCustomerId: string | undefined
  ): Promise<DashboardAiAnalysis> {
    const [eventViews, recommendationRows] = await Promise.all([
      this.eventQuery.queryEventViews(projectId),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const eventAnalysis = DashboardViewDomain.analyzeEventViews(eventViews);

    return DashboardViewDomain.toAiAnalysis(
      eventAnalysis.customerGroupsHigh,
      recommendationRows,
      selectedCustomerId
    );
  }

  async aiRecommendation(
    projectId: string,
    selectedCustomerId: string | undefined
  ): Promise<DashboardAiRecommendation> {
    const [eventViews, recommendationRows] = await Promise.all([
      this.eventQuery.queryEventViews(projectId),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const eventAnalysis = DashboardViewDomain.analyzeEventViews(eventViews);

    return DashboardViewDomain.toAiRecommendation(
      eventAnalysis.customerGroupsHigh,
      recommendationRows,
      selectedCustomerId
    );
  }

  async aiGeneration(
    projectId: string,
    selectedCustomerId: string | undefined
  ): Promise<DashboardAiGeneration> {
    const [eventViews, recommendationRows] = await Promise.all([
      this.eventQuery.queryEventViews(projectId),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const eventAnalysis = DashboardViewDomain.analyzeEventViews(eventViews);

    return DashboardViewDomain.toAiGeneration(
      eventAnalysis.customerGroupsHigh,
      recommendationRows,
      selectedCustomerId
    );
  }

  private async queryEventAnalysis(projectId: string) {
    return DashboardViewDomain.analyzeEventViews(await this.eventQuery.queryEventViews(projectId));
  }
}

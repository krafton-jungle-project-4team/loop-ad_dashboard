import { Inject, Injectable } from "@nestjs/common";
import type {
  DashboardAiAnalysis,
  DashboardAiGeneration,
  DashboardAiRecommendation,
  DashboardMain,
  DashboardPurchaseConversion
} from "@loopad/shared";
import { DashboardViewDomain } from "../domain/index.js";
import {
  DashboardEventQuery,
  DashboardRecommendationReader,
  DashboardSegmentMetricsReader
} from "../repository/index.js";

@Injectable()
export class DashboardQueryService {
  constructor(
    @Inject(DashboardEventQuery)
    private readonly eventQuery: DashboardEventQuery,
    @Inject(DashboardRecommendationReader)
    private readonly recommendationReader: DashboardRecommendationReader,
    @Inject(DashboardSegmentMetricsReader)
    private readonly segmentMetricsReader: DashboardSegmentMetricsReader
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
    selectedCustomerId: string | undefined,
    analysisDate: string | undefined
  ): Promise<DashboardAiAnalysis> {
    const [segmentMetrics, recommendationRows] = await Promise.all([
      this.segmentMetricsReader.readSegmentMetrics(projectId, analysisDate),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const customerGroups = DashboardViewDomain.toAiCustomerGroups(segmentMetrics);

    return DashboardViewDomain.toAiAnalysis(customerGroups, recommendationRows, selectedCustomerId);
  }

  async aiRecommendation(
    projectId: string,
    selectedCustomerId: string | undefined,
    analysisDate: string | undefined
  ): Promise<DashboardAiRecommendation> {
    const [segmentMetrics, recommendationRows] = await Promise.all([
      this.segmentMetricsReader.readSegmentMetrics(projectId, analysisDate),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const customerGroups = DashboardViewDomain.toAiCustomerGroups(segmentMetrics);

    return DashboardViewDomain.toAiRecommendation(
      customerGroups,
      recommendationRows,
      selectedCustomerId
    );
  }

  async aiGeneration(
    projectId: string,
    selectedCustomerId: string | undefined,
    analysisDate: string | undefined
  ): Promise<DashboardAiGeneration> {
    const [segmentMetrics, recommendationRows] = await Promise.all([
      this.segmentMetricsReader.readSegmentMetrics(projectId, analysisDate),
      this.recommendationReader.readRecommendationContexts(projectId)
    ]);
    const customerGroups = DashboardViewDomain.toAiCustomerGroups(segmentMetrics);

    return DashboardViewDomain.toAiGeneration(
      customerGroups,
      recommendationRows,
      selectedCustomerId
    );
  }

  private async queryEventAnalysis(projectId: string) {
    return DashboardViewDomain.analyzeEventViews(await this.eventQuery.queryEventViews(projectId));
  }
}

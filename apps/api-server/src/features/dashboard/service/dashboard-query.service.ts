import { Injectable, NotFoundException } from "@nestjs/common";
import { Transactional } from "@nestjs-cls/transactional";
import type {
  DashboardEventsSummary,
  DashboardExperiment,
  DashboardExperimentPerformance,
  DashboardExperimentPerformancePage,
  DashboardFunnel,
  DashboardRecommendations
} from "@loopad/shared";
import { EventNameSchema } from "@loopad/shared";
import { type PgTypedTransactionalAdapter } from "../../../infra/database/index.js";
import { DashboardMetricsDomain } from "../domain/index.js";
import {
  DashboardEventQuery,
  DashboardExperimentReader,
  DashboardRecommendationReader
} from "../repository/index.js";

@Injectable()
export class DashboardQueryService {
  constructor(
    private readonly eventQuery: DashboardEventQuery,
    private readonly recommendationReader: DashboardRecommendationReader,
    private readonly experimentReader: DashboardExperimentReader
  ) {}

  async eventsSummary(projectId: string): Promise<DashboardEventsSummary> {
    const [eventCounts, recentEvents] = await Promise.all([
      this.eventQuery.readEventCounts(projectId),
      this.eventQuery.readRecentEvents(projectId)
    ]);

    return {
      recent_event_count: recentEvents.length,
      event_counts: eventCounts.map((row) => ({
        event_name: EventNameSchema.parse(row.event_name),
        count: Number(row.count)
      })),
      recent_events: recentEvents
    };
  }

  async funnel(projectId: string): Promise<DashboardFunnel> {
    const [funnel, segmentFunnels] = await Promise.all([
      this.eventQuery.readFunnel(projectId),
      this.eventQuery.readSegmentFunnels(projectId)
    ]);

    return DashboardMetricsDomain.toFunnel(funnel, segmentFunnels);
  }

  @Transactional<PgTypedTransactionalAdapter>({ readOnly: true })
  async recommendations(
    projectId: string,
    recommendationResultId?: string
  ): Promise<DashboardRecommendations> {
    return {
      recommendations: await this.recommendationReader.readRecommendations(
        projectId,
        recommendationResultId
      )
    };
  }

  @Transactional<PgTypedTransactionalAdapter>({ readOnly: true })
  async experiment(projectId: string, experimentId: string): Promise<DashboardExperiment> {
    return this.readExperimentOrThrow(projectId, experimentId);
  }

  @Transactional<PgTypedTransactionalAdapter>({ readOnly: true })
  async experimentPerformance(
    projectId: string,
    experimentId: string
  ): Promise<DashboardExperimentPerformance> {
    const experiment = await this.readExperimentOrThrow(projectId, experimentId);

    return this.buildExperimentPerformance(projectId, experimentId, experiment);
  }

  @Transactional<PgTypedTransactionalAdapter>({ readOnly: true })
  async experimentPerformancePage(
    projectId: string,
    experimentId: string
  ): Promise<DashboardExperimentPerformancePage> {
    const experiment = await this.readExperimentOrThrow(projectId, experimentId);
    const performance = await this.buildExperimentPerformance(projectId, experimentId, experiment);

    return { experiment, performance };
  }

  private async readExperimentOrThrow(
    projectId: string,
    experimentId: string
  ): Promise<DashboardExperiment> {
    const experiment = await this.experimentReader.readExperiment(projectId, experimentId);
    if (!experiment) {
      throw new NotFoundException("Experiment not found.");
    }
    return experiment;
  }

  private async buildExperimentPerformance(
    projectId: string,
    experimentId: string,
    experiment: DashboardExperiment
  ): Promise<DashboardExperimentPerformance> {
    const actionCounts = await this.eventQuery.readExperimentActionCounts(projectId, experimentId);

    return DashboardMetricsDomain.toExperimentPerformance(experiment, actionCounts);
  }
}

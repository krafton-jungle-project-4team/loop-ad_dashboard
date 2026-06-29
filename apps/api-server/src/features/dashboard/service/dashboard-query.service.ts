import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  DashboardEventsSummary,
  DashboardExperiment,
  DashboardExperimentPerformance,
  DashboardExperimentPerformancePage,
  DashboardFunnel,
  DashboardRecommendations
} from "@loopad/shared";
import { EventNameSchema } from "@loopad/shared";
import {
  DashboardEventQuery,
  DashboardExperimentReader,
  DashboardRecommendationReader
} from "../repository/index.js";
import type { ExperimentActionCounts, FunnelCounts } from "../repository/read-models.js";

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

    return {
      ...withRates(funnel),
      segment_funnels: segmentFunnels.map((segment) => ({
        segment_id: segment.segment_id,
        ...withRates(segment)
      }))
    };
  }

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

  async experiment(projectId: string, experimentId: string): Promise<DashboardExperiment> {
    const experiment = await this.experimentReader.readExperiment(projectId, experimentId);
    if (!experiment) {
      throw new NotFoundException("Experiment not found.");
    }
    return experiment;
  }

  async experimentPerformance(
    projectId: string,
    experimentId: string
  ): Promise<DashboardExperimentPerformance> {
    const [experiment, actionCounts] = await Promise.all([
      this.experiment(projectId, experimentId),
      this.eventQuery.readExperimentActionCounts(projectId, experimentId)
    ]);
    const actionCountsById = new Map(actionCounts.map((counts) => [counts.action_id, counts]));

    return {
      experiment_id: experiment.experiment_id,
      actions: experiment.action_probabilities.map((action) => {
        const counts =
          actionCountsById.get(action.action_id) ?? emptyActionCounts(action.action_id);
        return {
          action_id: action.action_id,
          action_name: action.action_name,
          probability: action.probability,
          impressions: counts.impressions,
          clicks: counts.clicks,
          purchases: counts.purchases,
          ctr: rate(counts.clicks, counts.impressions),
          cvr: rate(counts.purchases, counts.impressions)
        };
      })
    };
  }

  async experimentPerformancePage(
    projectId: string,
    experimentId: string
  ): Promise<DashboardExperimentPerformancePage> {
    const [experiment, performance] = await Promise.all([
      this.experiment(projectId, experimentId),
      this.experimentPerformance(projectId, experimentId)
    ]);

    return { experiment, performance };
  }
}

function withRates(counts: FunnelCounts) {
  return {
    ...counts,
    view_to_cart_rate: rate(counts.add_to_cart_count, counts.product_view_count),
    cart_to_purchase_rate: rate(counts.purchase_count, counts.add_to_cart_count),
    view_to_purchase_rate: rate(counts.purchase_count, counts.product_view_count)
  };
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function emptyActionCounts(actionId: string): ExperimentActionCounts {
  return {
    action_id: actionId,
    impressions: 0,
    clicks: 0,
    purchases: 0
  };
}

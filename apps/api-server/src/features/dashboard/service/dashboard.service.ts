import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  DashboardEventsSummary,
  DashboardExperiment,
  DashboardExperimentPerformance,
  DashboardFunnel,
  DashboardRecommendations
} from "@loopad/shared";
import { EventNameSchema } from "@loopad/shared";
import { ClickHouseDashboardDataSource } from "../data-sources/clickhouse-dashboard.data-source.js";
import { PostgresDashboardDataSource } from "../data-sources/postgres-dashboard.data-source.js";
import type { ExperimentActionCounts, FunnelCounts } from "../model/events.js";

@Injectable()
export class DashboardService {
  constructor(
    @Inject(ClickHouseDashboardDataSource)
    private readonly clickHouseDataSource: ClickHouseDashboardDataSource,
    @Inject(PostgresDashboardDataSource)
    private readonly postgresDataSource: PostgresDashboardDataSource
  ) {}

  async eventsSummary(projectId: string): Promise<DashboardEventsSummary> {
    const [eventCounts, recentEvents] = await Promise.all([
      this.clickHouseDataSource.readEventCounts(projectId),
      this.clickHouseDataSource.readRecentEvents(projectId)
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
      this.clickHouseDataSource.readFunnel(projectId),
      this.clickHouseDataSource.readSegmentFunnels(projectId)
    ]);

    return {
      ...withRates(funnel),
      segment_funnels: segmentFunnels.map((segment) => ({
        segment_id: segment.segment_id,
        ...withRates(segment)
      }))
    };
  }

  async recommendations(projectId: string): Promise<DashboardRecommendations> {
    return {
      recommendations: await this.postgresDataSource.readRecommendations(projectId)
    };
  }

  async experiment(projectId: string, experimentId: string): Promise<DashboardExperiment> {
    const experiment = await this.postgresDataSource.readExperiment(projectId, experimentId);
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
      this.clickHouseDataSource.readExperimentActionCounts(projectId, experimentId)
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

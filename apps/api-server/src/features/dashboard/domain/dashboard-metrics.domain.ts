import type {
  DashboardExperiment,
  DashboardExperimentPerformance,
  DashboardFunnel
} from "@loopad/shared";

export interface FunnelSnapshot {
  product_view_count: number;
  add_to_cart_count: number;
  purchase_count: number;
}

export interface SegmentFunnelSnapshot extends FunnelSnapshot {
  segment_id: string;
}

export interface ExperimentActionCountSnapshot {
  action_id: string;
  impressions: number;
  clicks: number;
  purchases: number;
}

export const DashboardMetricsDomain = {
  toFunnel(funnel: FunnelSnapshot, segmentFunnels: SegmentFunnelSnapshot[]): DashboardFunnel {
    return {
      ...withRates(funnel),
      segment_funnels: segmentFunnels.map((segment) => ({
        segment_id: segment.segment_id,
        ...withRates(segment)
      }))
    };
  },

  toExperimentPerformance(
    experiment: DashboardExperiment,
    actionCounts: ExperimentActionCountSnapshot[]
  ): DashboardExperimentPerformance {
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
};

function withRates(counts: FunnelSnapshot) {
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

function emptyActionCounts(actionId: string): ExperimentActionCountSnapshot {
  return {
    action_id: actionId,
    impressions: 0,
    clicks: 0,
    purchases: 0
  };
}

import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import type {
  DashboardActionResult,
  DashboardEventsSummary,
  DashboardExperiment,
  DashboardExperimentPerformancePage,
  DashboardExperimentPerformance,
  DashboardFunnel,
  DashboardRecommendations
} from "@loopad/shared";
import { EventNameSchema } from "@loopad/shared";
import { env } from "../../../infra/env/env.js";
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

  async recommendations(
    projectId: string,
    recommendationResultId?: string
  ): Promise<DashboardRecommendations> {
    return {
      recommendations: await this.postgresDataSource.readRecommendations(
        projectId,
        recommendationResultId
      )
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

  async generateRecommendations(body: DashboardActionRequest): Promise<DashboardActionResult> {
    return postWorkflowAction(
      requireWorkflowUrl(env.workflow.aiServerUrl, "AI server"),
      "/recommendations/generate",
      withRecommendationDefaults(body)
    );
  }

  async generateContents(body: DashboardActionRequest): Promise<DashboardActionResult> {
    return postWorkflowAction(
      requireWorkflowUrl(env.workflow.contentServerUrl, "content server"),
      "/contents/generate",
      body
    );
  }

  async evaluateExperiment(
    experimentId: string,
    body: DashboardActionRequest
  ): Promise<DashboardActionResult> {
    return postWorkflowAction(
      requireWorkflowUrl(env.workflow.aiServerUrl, "AI server"),
      `/experiments/${experimentId}/evaluate`,
      {
        ...body,
        attribution_window_hours: body.attribution_window_hours ?? 24,
        experiment_id: body.experiment_id ?? experimentId,
        minimum_impressions: body.minimum_impressions ?? 30,
        reward_metric: body.reward_metric ?? "purchase"
      }
    );
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

export type DashboardActionRequest = {
  project_id: string;
  experiment_id?: string;
  recommendation_result_id?: string | number;
  analysis_window?: DashboardAnalysisWindow;
  baseline_window?: DashboardAnalysisWindow;
  candidate_dimensions?: string[];
  filters?: Record<string, string>;
  target_metric?: string;
  top_n?: number;
  [key: string]: unknown;
};

type DashboardAnalysisWindow = {
  start: string;
  end: string;
};

const recommendationDefaults = {
  analysis_window: {
    end: "2021-01-10T23:59:59+09:00",
    start: "2021-01-04T00:00:00+09:00"
  },
  baseline_window: {
    end: "2021-01-04T00:00:00+09:00",
    start: "2021-01-01T00:00:00+09:00"
  },
  candidate_dimensions: ["device", "category", "inventory_status", "channel"],
  filters: {
    device: "mobile"
  },
  target_metric: "view_to_cart_rate",
  top_n: 3
} satisfies Omit<
  DashboardActionRequest,
  "project_id" | "experiment_id" | "recommendation_result_id"
>;

function withRecommendationDefaults(body: DashboardActionRequest): DashboardActionRequest {
  return {
    ...body,
    analysis_window: body.analysis_window ?? recommendationDefaults.analysis_window,
    baseline_window: body.baseline_window ?? recommendationDefaults.baseline_window,
    candidate_dimensions: body.candidate_dimensions ?? recommendationDefaults.candidate_dimensions,
    filters: body.filters ?? recommendationDefaults.filters,
    target_metric: body.target_metric ?? recommendationDefaults.target_metric,
    top_n: body.top_n ?? recommendationDefaults.top_n
  };
}

function requireWorkflowUrl(url: string | undefined, label: string): string {
  if (!url) {
    throw new ServiceUnavailableException(`${label} URL is not configured.`);
  }
  return url;
}

async function postWorkflowAction(
  baseUrl: string,
  path: string,
  body: DashboardActionRequest
): Promise<DashboardActionResult> {
  const url = new URL(path, ensureTrailingSlash(baseUrl));
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    throw new BadGatewayException(`Workflow request failed: ${response.status}`);
  }

  return normalizeActionResult(await response.json(), body);
}

function normalizeActionResult(
  data: unknown,
  fallback: DashboardActionRequest
): DashboardActionResult {
  const payload = isObject(data) && isObject(data.data) ? data.data : data;
  if (!isObject(payload)) {
    return { status: "completed", project_id: fallback.project_id };
  }

  return {
    ...payload,
    project_id: stringValue(payload.project_id) ?? fallback.project_id,
    status: stringValue(payload.status) ?? "completed"
  };
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

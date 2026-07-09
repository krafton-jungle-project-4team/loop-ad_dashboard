import type {
  DashboardAdExperiment,
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardContentCandidate
} from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import type { ComponentProps } from "react";
import { formatInteger, formatPercent } from "../../../../../model/dashboard-format.js";
import { formatMetricLabel } from "../../../../../model/dashboard-labels.js";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];
export const FALLBACK_SEGMENT_ID = "seg_existing_all";
export const experimentPageSizeOptions = [10, 25, 50] as const;

export type ExperimentRow = {
  actualValue: number | null;
  contentId: string | null;
  createdAt: string | null;
  evaluationStatus: string | null;
  experimentId: string;
  feedback: string | null;
  experiment: DashboardAdExperiment | null;
  contentCandidate: DashboardContentCandidate | null;
  experimentStatus: string;
  latestMetric: DashboardCampaignExperimentMetric | null;
  metrics: DashboardCampaignExperimentMetric[];
  nextLoopRequired: boolean;
  promotion: DashboardCampaignPromotion | null;
  sampleSize: number;
  segment: DashboardCampaignSegment | null;
  targetValue: number | null;
};

export function experimentDisplayName(loopCount: number | null | undefined, index = 0) {
  return loopCount ? `루프 ${formatInteger(loopCount)} 실험` : `광고 실험 ${formatInteger(index + 1)}`;
}

export function metricExperimentLabel(
  metric: DashboardCampaignExperimentMetric,
  experiments: DashboardAdExperiment[]
) {
  const experiment = experiments.find(
    (candidate) => candidate.ad_experiment_id === metric.ad_experiment_id
  );
  return experiment
    ? experimentDisplayName(experiment.loop_count)
    : `${formatMetricLabel(metric.metric)} 평가`;
}

export function experimentRowLabel(row: ExperimentRow) {
  if (row.experiment) {
    return experimentDisplayName(row.experiment.loop_count);
  }
  return row.latestMetric ? `${formatMetricLabel(row.latestMetric.metric)} 평가` : "광고 실험";
}

export function experimentRowSubLabel(row: ExperimentRow) {
  const metric = row.latestMetric?.metric ?? row.experiment?.goal_metric;
  return metric ? formatMetricLabel(metric) : "평가 대기";
}

export function selectExperimentSegment(
  detail: DashboardCampaignDetail | undefined,
  query: DashboardQuery
) {
  if (!detail) {
    return null;
  }

  const selectedSegment = detail.segments.find(
    (segment) =>
      segment.segment_id === query.selectedSegmentId &&
      (!query.selectedPromotionId || segment.promotion_id === query.selectedPromotionId)
  );
  if (selectedSegment) {
    return selectedSegment;
  }

  const segmentsWithExperimentData = detail.segments.filter((segment) =>
    hasSegmentExperimentData(segment, detail)
  );
  return segmentsWithExperimentData[0] ?? detail.segments[0] ?? null;
}

export function hasSegmentExperimentData(
  segment: DashboardCampaignSegment,
  detail: DashboardCampaignDetail
) {
  return (
    detail.ad_experiments.some(
      (experiment) =>
        experiment.promotion_id === segment.promotion_id &&
        experiment.segment_id === segment.segment_id
    ) ||
    detail.experiment_metrics.some(
      (metric) =>
        metric.promotion_id === segment.promotion_id && metric.segment_id === segment.segment_id
    ) ||
    detail.content_candidates.some(
      (candidate) =>
        candidate.promotion_id === segment.promotion_id &&
        candidate.segment_id === segment.segment_id
    )
  );
}

export function segmentSelectValue(segment: DashboardCampaignSegment) {
  return `${segment.promotion_id}:${segment.segment_id}`;
}

export function buildExperimentRows(detail: DashboardCampaignDetail): ExperimentRow[] {
  const promotionsById = new Map(
    detail.promotions.map((promotion) => [promotion.promotion_id, promotion])
  );
  const segmentsByKey = new Map(
    detail.segments.map((segment) => [
      segmentKey(segment.promotion_id, segment.segment_id),
      segment
    ])
  );
  const visibleExperiments = detail.ad_experiments.filter(shouldDisplayExperiment);
  const experimentsById = new Map(
    visibleExperiments.map((experiment) => [experiment.ad_experiment_id, experiment])
  );
  const contentCandidatesById = new Map(
    detail.content_candidates.map((candidate) => [candidate.content_id, candidate])
  );
  const groups = new Map<string, DashboardCampaignExperimentMetric[]>();

  for (const metric of detail.experiment_metrics) {
    if (!metric.ad_experiment_id) {
      continue;
    }

    if (metric.segment_id === FALLBACK_SEGMENT_ID) {
      continue;
    }

    if (!experimentsById.has(metric.ad_experiment_id)) {
      if (
        detail.ad_experiments.some(
          (experiment) => experiment.ad_experiment_id === metric.ad_experiment_id
        )
      ) {
        continue;
      }
    }

    groups.set(metric.ad_experiment_id, [...(groups.get(metric.ad_experiment_id) ?? []), metric]);
  }

  for (const experiment of visibleExperiments) {
    if (!groups.has(experiment.ad_experiment_id)) {
      groups.set(experiment.ad_experiment_id, []);
    }
  }

  return [...groups.entries()]
    .map(([experimentId, metrics]) => {
      const sortedMetrics = sortMetricsByNewest(metrics);
      const latestMetric = sortedMetrics[0] ?? null;
      const experiment = experimentsById.get(experimentId) ?? null;
      const contentCandidate = experiment
        ? (contentCandidatesById.get(experiment.content_id) ?? null)
        : latestMetric?.content_id
          ? (contentCandidatesById.get(latestMetric.content_id) ?? null)
          : null;
      const experimentSegment = experiment
        ? (segmentsByKey.get(segmentKey(experiment.promotion_id, experiment.segment_id)) ?? null)
        : null;
      const metricSegment = latestMetric?.segment_id
        ? (segmentsByKey.get(segmentKey(latestMetric.promotion_id, latestMetric.segment_id)) ??
          null)
        : null;
      const segment =
        findSegmentForExperiment(detail.segments, experimentId, latestMetric) ??
        experimentSegment ??
        metricSegment;
      const promotionId =
        latestMetric?.promotion_id ?? experiment?.promotion_id ?? segment?.promotion_id ?? "";
      const promotion = promotionsById.get(promotionId) ?? null;
      const sampleSize =
        sortedMetrics.length > 0
          ? sortedMetrics.reduce((sum, metric) => sum + metric.sample_size, 0)
          : 0;

      return {
        actualValue: latestMetric?.actual_value ?? null,
        contentId:
          latestMetric?.content_option_id ??
          latestMetric?.content_id ??
          experiment?.content_option_id ??
          experiment?.content_id ??
          null,
        contentCandidate,
        createdAt: latestMetric?.created_at ?? null,
        evaluationStatus: latestMetric?.status ?? null,
        experimentId,
        experiment,
        experimentStatus: experiment?.status ?? "missing_experiment",
        feedback: latestMetric?.feedback ?? segment?.natural_language_query ?? null,
        latestMetric,
        metrics: sortedMetrics,
        nextLoopRequired: sortedMetrics.some((metric) => metric.next_loop_required),
        promotion,
        sampleSize,
        segment,
        targetValue: latestMetric?.target_value ?? experiment?.goal_target_value ?? null
      };
    })
    .sort(compareExperimentRows);
}

export function compareExperimentRows(left: ExperimentRow, right: ExperimentRow) {
  const timestampDelta = metricTimestamp(right.latestMetric) - metricTimestamp(left.latestMetric);
  if (timestampDelta !== 0) {
    return timestampDelta;
  }

  const loopDelta = (right.experiment?.loop_count ?? 0) - (left.experiment?.loop_count ?? 0);
  if (loopDelta !== 0) {
    return loopDelta;
  }

  return left.experimentId.localeCompare(right.experimentId);
}

export function findSegmentForExperiment(
  segments: DashboardCampaignSegment[],
  experimentId: string,
  metric: DashboardCampaignExperimentMetric | null
) {
  if (metric?.segment_id) {
    return (
      segments.find(
        (segment) =>
          segment.promotion_id === metric.promotion_id && segment.segment_id === metric.segment_id
      ) ?? null
    );
  }

  return segments.find((segment) => segment.ad_experiment_id === experimentId) ?? null;
}

export function shouldDisplayExperiment(experiment: DashboardAdExperiment) {
  return experiment.segment_id !== FALLBACK_SEGMENT_ID;
}

export function fallbackSegmentName(row: ExperimentRow) {
  const segmentId = row.experiment?.segment_id ?? row.latestMetric?.segment_id;
  return segmentId === FALLBACK_SEGMENT_ID ? "기본 광고 비교군" : "-";
}

export function segmentKey(promotionId: string, segmentId: string) {
  return `${promotionId}:${segmentId}`;
}

export function sortMetricsByNewest(metrics: DashboardCampaignExperimentMetric[]) {
  return [...metrics].sort((a, b) => metricTimestamp(b) - metricTimestamp(a));
}

export function metricTimestamp(metric: DashboardCampaignExperimentMetric | null) {
  if (!metric) {
    return 0;
  }
  const timestamp = new Date(metric.created_at).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function contentCandidateTitle(candidate: DashboardContentCandidate | null) {
  return (
    candidate?.title ??
    candidate?.subject ??
    candidate?.message ??
    candidate?.content_option_id ??
    "-"
  );
}

export function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function isPresentString(value: string | null | undefined): value is string {
  return Boolean(value);
}

export function statusBadgeVariant(status: string): BadgeVariant {
  if (
    status === "goal_met" ||
    status === "approved" ||
    status === "running" ||
    status === "active"
  ) {
    return "secondary";
  }

  if (
    status === "goal_not_met" ||
    status === "insufficient_data" ||
    status === "failed" ||
    status === "rejected"
  ) {
    return "destructive";
  }

  return "outline";
}

export function insufficientReason(metric: DashboardCampaignExperimentMetric) {
  const reason =
    pickJsonString(metric.result_json, ["insufficient_reason", "reason", "message", "note"]) ??
    metric.feedback;
  const minimumRequiredSampleSize = pickJsonNumber(metric.result_json, [
    "minimum_required_sample_size",
    "min_sample_size"
  ]);
  const assignedUserCount = pickJsonNumber(metric.result_json, [
    "assigned_user_count",
    "final_assigned_user_count"
  ]);
  const sampleReason =
    minimumRequiredSampleSize === null
      ? null
      : `최소 필요 ${formatInteger(minimumRequiredSampleSize)}명`;
  const assignedReason =
    assignedUserCount === null ? null : `최종 배정 ${formatInteger(assignedUserCount)}명`;

  return [reason, assignedReason, sampleReason].filter(Boolean).join(" · ") || "-";
}

export function pickJsonString(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "string" && item.trim()) {
      return item;
    }
  }
  return null;
}

export function pickJsonNumber(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const item = value[key];
    if (typeof item === "number" && Number.isFinite(item)) {
      return item;
    }
    if (typeof item === "string") {
      const numberValue = Number(item);
      if (Number.isFinite(numberValue)) {
        return numberValue;
      }
    }
  }
  return null;
}

export function canStartAdExperiment(status: string) {
  return status === "planned" || status === "approved";
}

export function formatGoalValue(value: number | null) {
  if (value === null) {
    return "-";
  }
  return value <= 1 ? formatPercent(value) : formatInteger(Math.round(value));
}

export function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}

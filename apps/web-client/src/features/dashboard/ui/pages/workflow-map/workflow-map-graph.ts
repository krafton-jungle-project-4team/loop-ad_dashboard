import type {
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary
} from "@loopad/shared";
import { DASHBOARD_FALLBACK_SEGMENT_ID } from "@loopad/shared";
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import { formatChannelLabel, formatMetricLabel } from "../../../model/dashboard-labels.js";
import { formatInteger, formatPercent } from "../../../model/dashboard-format.js";

export type FlowNodeKind = "campaign" | "promotion" | "evaluation" | "retryQueue";
export type FlowPathTone = "normal" | "warning" | "insufficient";
export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

export type DetailTabPath = "campaign-metrics" | "campaign-promotions";

export type DetailAction = {
  projectId: string;
  selectedCampaignId: string;
  selectedPromotionId: string;
  selectedSegmentId: string;
  tabPath: DetailTabPath;
};

export type FlowSummaryItem = {
  label: string;
  tone?: FlowPathTone;
  value: string;
};

export type SegmentSummary = {
  action: DetailAction;
  contentTitle: string | null;
  estimatedSize: number;
  goalAchievementRate: number | null;
  goalMetric: string;
  id: string;
  latestActualValue: number | null;
  metricsCount: number;
  name: string;
  nextLoopRequired: boolean;
  priority: string | null;
  promotionId: string;
  sampleRatio: number;
  sampleSize: number;
  status: string;
  targetValue: number | null;
};

export type PromotionEvaluationSummary = {
  goalMetCount: number;
  goalNotMetCount: number;
  insufficientDataCount: number;
  latestMetric: DashboardCampaignExperimentMetric | null;
  lowestGoalAchievementRate: number | null;
  metrics: DashboardCampaignExperimentMetric[];
  nextLoopCount: number;
  retrySegmentIds: string[];
  status: string;
  totalSampleSize: number;
};

export type PromotionFlowSummary = {
  action: DetailAction;
  collectionStatus: string;
  collectionTone: FlowPathTone;
  evaluation: PromotionEvaluationSummary;
  goalAchievementRate: number | null;
  id: string;
  nextLoopSegments: SegmentSummary[];
  promotion: DashboardCampaignPromotion;
  segments: SegmentSummary[];
  tone: FlowPathTone;
};

export type FlowEvaluationTotals = {
  goalMetCount: number;
  goalNotMetCount: number;
  insufficientDataCount: number;
  metricsCount: number;
  nextLoopCount: number;
  retryPromotionCount: number;
  retrySegmentCount: number;
  totalSampleSize: number;
  weakestGoalAchievementRate: number | null;
};

export type FlowNodeData = {
  [key: string]: unknown;
  action: DetailAction;
  campaign?: DashboardCampaignSummary;
  kind: FlowNodeKind;
  metrics?: DashboardCampaignExperimentMetric[];
  promotionFlow?: PromotionFlowSummary;
  promotionFlows?: PromotionFlowSummary[];
  retryPromotionFlows?: PromotionFlowSummary[];
  segments?: SegmentSummary[];
  status?: string;
  subtitle?: string;
  summary: FlowSummaryItem[];
  title: string;
  tone: FlowPathTone;
  totals?: FlowEvaluationTotals;
};

export type CampaignFlowNode = Node<FlowNodeData, FlowNodeKind>;
export type CampaignFlowGraph = {
  edges: Edge[];
  nextLoopCandidateCount: number;
  nodes: CampaignFlowNode[];
};

const CAMPAIGN_X = 0;
const CAMPAIGN_Y = 262;
const PROMOTION_X = 328;
const EVALUATION_X = 724;
const EVALUATION_Y = 176;
const RETRY_QUEUE_X = 1088;
const RETRY_QUEUE_Y = 176;
const PIPELINE_Y = 0;
const PROMOTION_ROW_GAP = 176;

export function buildCampaignFlowGraph(
  detail: DashboardCampaignDetail,
  projectId: string
): CampaignFlowGraph {
  const nodes: CampaignFlowNode[] = [];
  const edges: Edge[] = [];
  const campaignId = detail.campaign.campaign_id;
  const campaignNodeId = `campaign:${campaignId}`;
  const evaluationNodeId = `evaluation:${campaignId}`;
  const retryQueueNodeId = `retry-queue:${campaignId}`;
  const workflowMetrics = detail.experiment_metrics.filter(isUserFacingWorkflowMetric);
  const promotionFlows = sortPromotionsByGoalAchievement(detail.promotions, workflowMetrics).map(
    (promotion) =>
      createPromotionFlowSummary(detail, projectId, campaignId, promotion, workflowMetrics)
  );
  const retryPromotionFlows = promotionFlows.filter(isPromotionFlowRetryCandidate);
  const allSegments = promotionFlows.flatMap((flow) => flow.segments);
  const retrySegments = retryPromotionFlows.flatMap((flow) => flow.nextLoopSegments);
  const totals = summarizeCampaignEvaluation(promotionFlows);
  const overallTone = overallToneForPromotionFlows(promotionFlows);
  const evaluationStatus = campaignEvaluationStatus(totals);
  const retryStatus = retryPromotionFlows.length > 0 ? "queued" : "empty";
  const nextLoopCandidateCount = retryPromotionFlows.length;

  nodes.push({
    data: {
      action: createAction(projectId, campaignId, "", "", "campaign-metrics"),
      campaign: detail.campaign,
      kind: "campaign",
      status: detail.campaign.status,
      subtitle: detail.campaign.objective ?? formatMetricLabel(detail.campaign.primary_metric),
      summary: [
        {
          label: "반복 횟수",
          value: `${formatInteger(detail.campaign.current_loop_count)} / ${formatInteger(detail.campaign.max_loop_count)}`
        },
        { label: "프로모션", value: formatInteger(detail.promotions.length) },
        { label: "세그먼트", value: formatInteger(detail.segments.length) },
        {
          label: "최근 목표",
          value: formatOptionalRate(detail.campaign.latest_goal_achievement_rate)
        }
      ],
      title: detail.campaign.campaign_name,
      tone: "normal"
    },
    id: campaignNodeId,
    position: { x: CAMPAIGN_X, y: CAMPAIGN_Y },
    type: "campaign"
  });

  if (promotionFlows.length > 0) {
    promotionFlows.forEach((flow, index) => {
      const promotionNodeId = `promotion:${flow.id}`;

      nodes.push({
        data: {
          action: flow.action,
          kind: "promotion",
          promotionFlow: flow,
          promotionFlows: [flow],
          segments: flow.segments,
          status: flow.promotion.status,
          subtitle: `${formatChannelLabel(flow.promotion.channel)} · ${formatMetricLabel(flow.promotion.goal_metric)}`,
          summary: [
            {
              label: "목표",
              value: formatOptionalGoalAchievement(flow.goalAchievementRate),
              tone: flow.tone
            },
            {
              label: "수집률",
              value: formatCollectionCoverage(flow.evaluation.totalSampleSize, flow.promotion),
              tone: flow.collectionTone
            },
            {
              label: "반복 횟수",
              value: `L${formatInteger(flow.promotion.current_loop_count)} / ${formatInteger(flow.promotion.max_loop_count)}`
            },
            {
              label: "세그먼트",
              value: formatInteger(flow.segments.length)
            }
          ],
          title: flow.promotion.marketing_theme,
          tone: flow.tone
        },
        id: promotionNodeId,
        position: { x: PROMOTION_X, y: PIPELINE_Y + index * PROMOTION_ROW_GAP },
        type: "promotion"
      });

      edges.push(
        createFlowEdge(
          `${campaignNodeId}->${promotionNodeId}`,
          campaignNodeId,
          promotionNodeId,
          "normal"
        )
      );
      edges.push(
        createFlowEdge(
          `${promotionNodeId}->${evaluationNodeId}`,
          promotionNodeId,
          evaluationNodeId,
          flow.tone
        )
      );
    });

    nodes.push({
      data: {
        action: createAction(projectId, campaignId, "", "", "campaign-metrics"),
        kind: "evaluation",
        metrics: sortMetricsByGoalAchievement(workflowMetrics),
        promotionFlows,
        segments: allSegments,
        status: evaluationStatus,
        subtitle: "목표 달성률이 낮은 지표부터 보여 줘요",
        summary: [
          { label: "지표", value: formatInteger(totals.metricsCount) },
          { label: "목표 달성", value: formatInteger(totals.goalMetCount) },
          {
            label: "목표 미달",
            value: formatInteger(totals.goalNotMetCount),
            tone: totals.goalNotMetCount > 0 ? "warning" : "normal"
          },
          {
            label: "대상 부족",
            value: formatInteger(totals.insufficientDataCount),
            tone: totals.insufficientDataCount > 0 ? "insufficient" : "normal"
          }
        ],
        title: "수집 및 목표 검증",
        tone: overallTone,
        totals
      },
      id: evaluationNodeId,
      position: { x: EVALUATION_X, y: EVALUATION_Y },
      type: "evaluation"
    });

    nodes.push({
      data: {
        action: createAction(projectId, campaignId, "", "", "campaign-metrics"),
        kind: "retryQueue",
        metrics: workflowMetrics,
        retryPromotionFlows,
        segments: retrySegments,
        status: retryStatus,
        subtitle: "실패했거나 대상이 부족한 실험만 다시 진행해요",
        summary: [
          {
            label: "후보",
            value: formatInteger(retryPromotionFlows.length),
            tone: retryPromotionFlows.length > 0 ? "warning" : "normal"
          },
          {
            label: "세그먼트",
            value: formatInteger(totals.retrySegmentCount),
            tone: totals.retrySegmentCount > 0 ? "warning" : "normal"
          },
          {
            label: "필요 지표",
            value: formatInteger(totals.nextLoopCount),
            tone: totals.nextLoopCount > 0 ? "warning" : "normal"
          },
          {
            label: "반복 실험",
            value: formatNextLoopLabel(retryPromotionFlows),
            tone: retryPromotionFlows.length > 0 ? "warning" : "normal"
          }
        ],
        title: "재시도 대기열",
        tone: retryPromotionFlows.length > 0 ? "warning" : "normal",
        totals
      },
      id: retryQueueNodeId,
      position: { x: RETRY_QUEUE_X, y: RETRY_QUEUE_Y },
      type: "retryQueue"
    });
    edges.push(
      createFlowEdge(
        `${evaluationNodeId}->${retryQueueNodeId}`,
        evaluationNodeId,
        retryQueueNodeId,
        retryPromotionFlows.length > 0 ? "warning" : "normal",
        { sourceHandle: "retry-source", targetHandle: "retry-target" }
      )
    );
    if (retryPromotionFlows.length > 0) {
      const loopTargetFlow = retryPromotionFlows[0];

      if (loopTargetFlow) {
        const loopTargetPromotionId = `promotion:${loopTargetFlow.id}`;

        edges.push(
          createLoopBackEdge(
            `${retryQueueNodeId}->${loopTargetPromotionId}:loop`,
            retryQueueNodeId,
            loopTargetPromotionId,
            `반복 실험 ${formatInteger(retryPromotionFlows.length)}`
          )
        );
      }
    }
  }

  return {
    edges,
    nextLoopCandidateCount,
    nodes
  };
}

function createFlowEdge(
  id: string,
  source: string,
  target: string,
  tone: FlowPathTone,
  handles: { sourceHandle?: string; targetHandle?: string } = {}
): Edge {
  const stroke = tone === "normal" ? "#94a3b8" : "#d97706";

  return {
    animated: tone === "warning",
    id,
    interactionWidth: 18,
    markerEnd: {
      color: stroke,
      type: MarkerType.ArrowClosed
    },
    source,
    sourceHandle: handles.sourceHandle,
    style: {
      stroke,
      strokeDasharray: tone === "insufficient" ? "7 5" : undefined,
      strokeWidth: tone === "normal" ? 1.6 : 2.1
    },
    target,
    targetHandle: handles.targetHandle,
    type: "straight"
  };
}

function createLoopBackEdge(id: string, source: string, target: string, label: string): Edge {
  return {
    animated: true,
    data: { label },
    id,
    markerEnd: {
      color: "#d97706",
      type: MarkerType.ArrowClosed
    },
    interactionWidth: 18,
    source,
    sourceHandle: "loop-source",
    style: {
      stroke: "#d97706",
      strokeDasharray: "8 5",
      strokeWidth: 2.4
    },
    target,
    targetHandle: "loop-target",
    type: "loopBack"
  };
}

function createPromotionFlowSummary(
  detail: DashboardCampaignDetail,
  projectId: string,
  campaignId: string,
  promotion: DashboardCampaignPromotion,
  workflowMetrics: DashboardCampaignExperimentMetric[]
): PromotionFlowSummary {
  const promotionSegments = detail.segments.filter(
    (segment) => segment.promotion_id === promotion.promotion_id
  );
  const promotionMetrics = workflowMetrics.filter(
    (metric) => metric.promotion_id === promotion.promotion_id
  );
  const evaluation = summarizeEvaluation(promotion, promotionSegments, promotionMetrics);
  const tone = pathToneForPromotion(promotion, promotionSegments, promotionMetrics);
  const segmentSummaries = promotionSegments.map((segment) =>
    createSegmentSummary(segment, promotionMetrics, projectId, campaignId, promotion)
  );
  const collectionStatus = collectionStatusForPromotion(promotion, evaluation);

  return {
    action: createAction(projectId, campaignId, promotion.promotion_id, "", "campaign-promotions"),
    collectionStatus,
    collectionTone: collectionStatus === "insufficient_data" ? "insufficient" : "normal",
    evaluation,
    goalAchievementRate: evaluation.lowestGoalAchievementRate,
    id: promotion.promotion_id,
    nextLoopSegments: segmentSummaries.filter((segment) => segment.nextLoopRequired),
    promotion,
    segments: segmentSummaries,
    tone
  };
}

function isUserFacingWorkflowMetric(metric: DashboardCampaignExperimentMetric) {
  return Boolean(metric.ad_experiment_id && metric.segment_id !== DASHBOARD_FALLBACK_SEGMENT_ID);
}

function summarizeCampaignEvaluation(flows: PromotionFlowSummary[]): FlowEvaluationTotals {
  const retrySegmentIds = new Set(
    flows.flatMap((flow) => flow.nextLoopSegments.map((segment) => segment.id))
  );

  return {
    goalMetCount: flows.reduce((total, flow) => total + flow.evaluation.goalMetCount, 0),
    goalNotMetCount: flows.reduce((total, flow) => total + flow.evaluation.goalNotMetCount, 0),
    insufficientDataCount: flows.reduce(
      (total, flow) => total + flow.evaluation.insufficientDataCount,
      0
    ),
    metricsCount: flows.reduce((total, flow) => total + flow.evaluation.metrics.length, 0),
    nextLoopCount: flows.reduce((total, flow) => total + flow.evaluation.nextLoopCount, 0),
    retryPromotionCount: flows.filter(isPromotionFlowRetryCandidate).length,
    retrySegmentCount: retrySegmentIds.size,
    totalSampleSize: flows.reduce((total, flow) => total + flow.evaluation.totalSampleSize, 0),
    weakestGoalAchievementRate: lowestFlowGoalAchievementRate(flows)
  };
}

function lowestFlowGoalAchievementRate(flows: PromotionFlowSummary[]) {
  const rates = flows.map((flow) => flow.goalAchievementRate).filter(isPresentNumber);
  return rates.length > 0 ? Math.min(...rates) : null;
}

function overallToneForPromotionFlows(flows: PromotionFlowSummary[]): FlowPathTone {
  if (flows.some((flow) => flow.tone === "insufficient")) {
    return "insufficient";
  }
  if (flows.some((flow) => flow.tone === "warning")) {
    return "warning";
  }
  return "normal";
}

function campaignEvaluationStatus(totals: FlowEvaluationTotals) {
  if (totals.insufficientDataCount > 0) {
    return "insufficient_data";
  }
  if (totals.goalNotMetCount > 0 || totals.nextLoopCount > 0) {
    return "goal_not_met";
  }
  if (totals.metricsCount > 0 && totals.goalMetCount === totals.metricsCount) {
    return "goal_met";
  }
  return "collecting";
}

function isPromotionFlowRetryCandidate(flow: PromotionFlowSummary) {
  return (
    isRetryStatus(flow.promotion.status) ||
    flow.nextLoopSegments.length > 0 ||
    flow.evaluation.nextLoopCount > 0 ||
    flow.evaluation.goalNotMetCount > 0 ||
    flow.evaluation.insufficientDataCount > 0
  );
}

export function sortPromotionFlowsByGoalAchievement(flows: PromotionFlowSummary[]) {
  return [...flows].sort((a, b) => {
    const rateDiff = compareNullableNumber(a.goalAchievementRate, b.goalAchievementRate);
    if (rateDiff !== 0) {
      return rateDiff;
    }
    return a.promotion.marketing_theme.localeCompare(b.promotion.marketing_theme);
  });
}

function formatNextLoopLabel(flows: PromotionFlowSummary[]) {
  if (flows.length === 0) {
    return "-";
  }
  const nextLoops = flows.map((flow) =>
    Math.min(flow.promotion.current_loop_count + 1, flow.promotion.max_loop_count)
  );
  return `L${formatInteger(Math.max(...nextLoops))}`;
}

function createSegmentSummary(
  segment: DashboardCampaignSegment,
  metrics: DashboardCampaignExperimentMetric[],
  projectId: string,
  campaignId: string,
  promotion: DashboardCampaignPromotion
): SegmentSummary {
  const segmentMetrics = metrics.filter((metric) => metric.segment_id === segment.segment_id);
  const latestMetric = latestMetricFrom(segmentMetrics);
  const nextLoopRequired =
    isRetryStatus(segment.status) || segmentMetrics.some((metric) => isRetryMetric(metric));
  const targetValue = latestMetric?.target_value ?? promotion.goal_target_value;
  const latestActualValue = latestMetric?.actual_value ?? segment.latest_actual_value;

  return {
    action: createAction(
      projectId,
      campaignId,
      segment.promotion_id,
      segment.segment_id,
      "campaign-promotions"
    ),
    contentTitle: segmentContentTitle(segment),
    estimatedSize: segment.estimated_size,
    goalAchievementRate: goalAchievementRate(latestActualValue, targetValue),
    goalMetric: segment.goal_metric,
    id: segment.segment_id,
    latestActualValue,
    metricsCount: segmentMetrics.length,
    name: segment.segment_name,
    nextLoopRequired,
    priority: segment.priority,
    promotionId: segment.promotion_id,
    sampleRatio: segment.sample_ratio,
    sampleSize: segment.sample_size,
    status: segment.status,
    targetValue
  };
}

function summarizeEvaluation(
  promotion: DashboardCampaignPromotion,
  segments: DashboardCampaignSegment[],
  metrics: DashboardCampaignExperimentMetric[]
): PromotionEvaluationSummary {
  const goalMetCount = metrics.filter((metric) => metric.status === "goal_met").length;
  const goalNotMetCount = metrics.filter((metric) => metric.status === "goal_not_met").length;
  const insufficientDataCount = metrics.filter(
    (metric) => metric.status === "insufficient_data"
  ).length;
  const nextLoopCount = metrics.filter((metric) => metric.next_loop_required).length;
  const latestMetric = latestMetricFrom(metrics);
  const lowestGoalAchievementRate = lowestPromotionGoalAchievementRate(promotion, metrics);
  const retrySegmentIds = [
    ...new Set(
      [
        ...metrics
          .filter(isRetryMetric)
          .map((metric) => metric.segment_id)
          .filter(isPresentString),
        ...segments
          .filter((segment) => isRetryStatus(segment.status))
          .map((segment) => segment.segment_id)
      ].sort()
    )
  ];
  const status =
    insufficientDataCount > 0
      ? "insufficient_data"
      : nextLoopCount > 0 || goalNotMetCount > 0 || isRetryStatus(promotion.status)
        ? "goal_not_met"
        : goalMetCount > 0 && goalMetCount === metrics.length
          ? "goal_met"
          : (latestMetric?.status ?? promotion.status);
  const totalSampleSize = metrics.reduce((total, metric) => total + metric.sample_size, 0);

  return {
    goalMetCount,
    goalNotMetCount,
    insufficientDataCount,
    latestMetric,
    lowestGoalAchievementRate,
    metrics,
    nextLoopCount,
    retrySegmentIds,
    status,
    totalSampleSize
  };
}

function sortPromotionsByGoalAchievement(
  promotions: DashboardCampaignPromotion[],
  metrics: DashboardCampaignExperimentMetric[]
) {
  return [...promotions].sort((a, b) => {
    const aRate = lowestPromotionGoalAchievementRate(
      a,
      metrics.filter((metric) => metric.promotion_id === a.promotion_id)
    );
    const bRate = lowestPromotionGoalAchievementRate(
      b,
      metrics.filter((metric) => metric.promotion_id === b.promotion_id)
    );
    const rateDiff = compareNullableNumber(aRate, bRate);
    if (rateDiff !== 0) {
      return rateDiff;
    }
    return a.marketing_theme.localeCompare(b.marketing_theme);
  });
}

export function sortSegmentsByGoalAchievement(segments: SegmentSummary[]) {
  return [...segments].sort((a, b) => {
    const rateDiff = compareNullableNumber(a.goalAchievementRate, b.goalAchievementRate);
    if (rateDiff !== 0) {
      return rateDiff;
    }
    return a.name.localeCompare(b.name);
  });
}

export function sortMetricsByGoalAchievement(metrics: DashboardCampaignExperimentMetric[]) {
  return [...metrics].sort((a, b) => {
    const rateDiff = compareNullableNumber(
      goalAchievementRate(a.actual_value, a.target_value),
      goalAchievementRate(b.actual_value, b.target_value)
    );
    if (rateDiff !== 0) {
      return rateDiff;
    }
    const timeDiff = metricTimestamp(b) - metricTimestamp(a);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return `${a.segment_id ?? ""}:${a.metric}`.localeCompare(`${b.segment_id ?? ""}:${b.metric}`);
  });
}

function lowestPromotionGoalAchievementRate(
  promotion: DashboardCampaignPromotion,
  metrics: DashboardCampaignExperimentMetric[]
) {
  const metricRates = metrics
    .map((metric) => goalAchievementRate(metric.actual_value, metric.target_value))
    .filter(isPresentNumber);
  if (metricRates.length > 0) {
    return Math.min(...metricRates);
  }
  return goalAchievementRate(promotion.latest_actual_value, promotion.goal_target_value);
}

export function goalAchievementRate(
  actualValue: number | null | undefined,
  targetValue: number | null | undefined
) {
  if (actualValue === null || actualValue === undefined || !targetValue || targetValue <= 0) {
    return null;
  }
  return actualValue / targetValue;
}

function compareNullableNumber(a: number | null, b: number | null) {
  if (a === null && b === null) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return a - b;
}

function collectionStatusForPromotion(
  promotion: DashboardCampaignPromotion,
  evaluation: PromotionEvaluationSummary
) {
  if (evaluation.insufficientDataCount > 0) {
    return "insufficient_data";
  }
  if (evaluation.metrics.length === 0 || evaluation.totalSampleSize < promotion.min_sample_size) {
    return "collecting";
  }
  return "collected";
}

function pathToneForPromotion(
  promotion: DashboardCampaignPromotion,
  segments: DashboardCampaignSegment[],
  metrics: DashboardCampaignExperimentMetric[]
): FlowPathTone {
  if (
    promotion.status === "insufficient_data" ||
    segments.some((segment) => segment.status === "insufficient_data") ||
    metrics.some((metric) => metric.status === "insufficient_data")
  ) {
    return "insufficient";
  }
  if (
    promotion.status === "goal_not_met" ||
    segments.some((segment) => segment.status === "goal_not_met") ||
    metrics.some((metric) => metric.status === "goal_not_met" || metric.next_loop_required)
  ) {
    return "warning";
  }
  return "normal";
}

export function isRetryMetric(metric: DashboardCampaignExperimentMetric) {
  return metric.next_loop_required || isRetryStatus(metric.status);
}

function isRetryStatus(status: string) {
  return status === "goal_not_met" || status === "insufficient_data";
}

function latestMetricFrom(metrics: DashboardCampaignExperimentMetric[]) {
  return sortMetricsByNewest(metrics)[0] ?? null;
}

function sortMetricsByNewest(metrics: DashboardCampaignExperimentMetric[]) {
  return [...metrics].sort((a, b) => {
    const timeDiff = metricTimestamp(b) - metricTimestamp(a);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return `${a.segment_id ?? ""}:${a.metric}`.localeCompare(`${b.segment_id ?? ""}:${b.metric}`);
  });
}

function metricTimestamp(metric: DashboardCampaignExperimentMetric) {
  const timestamp = Date.parse(metric.created_at);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function createAction(
  projectId: string,
  selectedCampaignId: string,
  selectedPromotionId: string,
  selectedSegmentId: string,
  tabPath: DetailTabPath
): DetailAction {
  return {
    projectId,
    selectedCampaignId,
    selectedPromotionId,
    selectedSegmentId,
    tabPath
  };
}

export function formatOptionalRate(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatPercent(value);
}

export function formatOptionalMetricValue(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatMetricValue(value);
}

export function formatOptionalGoalAchievement(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatPercent(value);
}

export function formatCollectionCoverage(
  totalSampleSize: number | null | undefined,
  promotion: DashboardCampaignPromotion | undefined
) {
  if (!promotion || !promotion.min_sample_size) {
    return "-";
  }
  return formatPercent(Math.min((totalSampleSize ?? 0) / promotion.min_sample_size, 1));
}

export function formatMetricValue(value: number) {
  return value <= 1 ? formatPercent(value) : formatInteger(value);
}

function segmentContentTitle(segment: DashboardCampaignSegment) {
  const value = segment.content_brief_json.content_title;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function isPresentString(value: string | null): value is string {
  return Boolean(value);
}

function isPresentNumber(value: number | null): value is number {
  return value !== null;
}

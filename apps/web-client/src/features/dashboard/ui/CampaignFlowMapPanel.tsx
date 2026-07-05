import type {
  DashboardCampaignDetail,
  DashboardCampaignExperimentMetric,
  DashboardCampaignPromotion,
  DashboardCampaignSegment,
  DashboardCampaignSummary,
  DashboardMain
} from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from "@loopad/ui/shadcn/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { cn } from "@loopad/ui/shadcn/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
  type NodeTypes
} from "@xyflow/react";
import {
  ArrowRight,
  BarChart3,
  CircleAlert,
  CircleCheck,
  Map,
  Megaphone,
  Repeat2,
  RefreshCw,
  Target,
  Workflow,
  X
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode
} from "react";
import { fetchDashboardCampaignDetail } from "../api/dashboard-api.js";
import { formatDateTime, formatInteger, formatPercent } from "../model/dashboard-format.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import { dashboardCampaignDetailQueryKey } from "../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../model/dashboard-types.js";

type FlowNodeKind = "campaign" | "promotion" | "evaluation" | "retryQueue";
type FlowPathTone = "normal" | "warning" | "insufficient";
type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";

type DetailTabPath =
  | "campaign-metrics"
  | "campaign-promotions"
  | "campaign-segments"
  | "campaign-experiment-metrics";

type DetailAction = {
  projectId: string;
  selectedCampaignId: string;
  selectedPromotionId: string;
  selectedSegmentId: string;
  tabPath: DetailTabPath;
};

type FlowSummaryItem = {
  label: string;
  tone?: FlowPathTone;
  value: string;
};

type SegmentSummary = {
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

type PromotionEvaluationSummary = {
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

type PromotionFlowSummary = {
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

type FlowEvaluationTotals = {
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

type FlowNodeData = {
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

type CampaignFlowNode = Node<FlowNodeData, FlowNodeKind>;
type CampaignFlowGraph = {
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

const nodeTypes = {
  campaign: CampaignNode,
  evaluation: EvaluationNode,
  promotion: PromotionNode,
  retryQueue: RetryQueueNode
} satisfies NodeTypes;

const edgeTypes = {
  loopBack: LoopBackEdge
};

const emptyGraph: CampaignFlowGraph = {
  edges: [],
  nextLoopCandidateCount: 0,
  nodes: []
};

export function CampaignFlowMapPanel({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  const [, setDashboardQueryState] = useDashboardQueryState();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedCampaign =
    data.campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ??
    data.campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const campaignDetail = useQuery({
    enabled: Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });

  useEffect(() => {
    if (selectedCampaign && query.selectedCampaignId !== selectedCampaign.campaign_id) {
      void setDashboardQueryState({
        selectedCampaignId: selectedCampaign.campaign_id,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
    }
  }, [query.selectedCampaignId, selectedCampaign, setDashboardQueryState]);

  useEffect(() => {
    setSelectedNodeId(null);
  }, [selectedCampaignId]);

  const graph = useMemo(
    () =>
      campaignDetail.data
        ? buildCampaignFlowGraph(campaignDetail.data, query.projectId)
        : emptyGraph,
    [campaignDetail.data, query.projectId]
  );
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const handleNodeClick = useCallback<NodeMouseHandler<CampaignFlowNode>>((_, node) => {
    setSelectedNodeId(node.id);
  }, []);
  const handleCampaignChange = useCallback(
    (campaignId: string) => {
      void setDashboardQueryState({
        selectedCampaignId: campaignId,
        selectedPromotionId: "",
        selectedSegmentId: ""
      });
    },
    [setDashboardQueryState]
  );
  const promotionCount =
    campaignDetail.data?.promotions.length ?? selectedCampaign?.promotion_count ?? 0;
  const nextLoopCandidateCount = campaignDetail.data ? graph.nextLoopCandidateCount : 0;

  return (
    <div className="flex h-full min-h-[calc(100svh-3.5rem)] min-w-0 flex-col bg-[#f5f5f7]">
      <CampaignFlowToolbar
        campaigns={data.campaigns}
        nextLoopCandidateCount={nextLoopCandidateCount}
        onCampaignChange={handleCampaignChange}
        promotionCount={promotionCount}
        selectedCampaign={selectedCampaign}
        selectedCampaignId={selectedCampaignId}
      />
      <div className="relative min-h-[520px] min-w-0 flex-1 overflow-hidden">
        {data.campaigns.length === 0 ? (
          <CanvasNotice message="등록된 캠페인이 없습니다." title="표시할 워크플로우가 없습니다" />
        ) : null}
        {data.campaigns.length > 0 && campaignDetail.isLoading ? (
          <CanvasNotice message="캠페인 상세 데이터를 불러오는 중입니다." title="로딩 중" />
        ) : null}
        {campaignDetail.isError ? (
          <div className="absolute inset-0 grid place-items-center p-4">
            <Alert className="max-w-xl bg-white">
              <AlertTitle>워크플로우 맵을 불러오지 못했습니다</AlertTitle>
              <AlertDescription>
                {campaignDetail.error?.message ?? "API 요청에 실패했습니다."}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}
        {campaignDetail.data ? (
          <>
            <ReactFlow
              className="bg-[#f7f8fa]"
              defaultViewport={{ x: 18, y: 42, zoom: 0.52 }}
              edges={graph.edges}
              edgeTypes={edgeTypes}
              maxZoom={1.25}
              minZoom={0.45}
              nodes={graph.nodes}
              nodesConnectable={false}
              nodesDraggable={false}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              onPaneClick={() => setSelectedNodeId(null)}
              panOnScroll
              proOptions={{ hideAttribution: true }}
              selectNodesOnDrag={false}
            >
              <Background color="#d8dde6" gap={22} size={1} variant={BackgroundVariant.Dots} />
              <Panel
                className="pointer-events-none rounded-md border border-black/10 bg-white/90 px-3 py-2 shadow-sm backdrop-blur"
                position="top-left"
              >
                <PipelineStageStrip />
              </Panel>
              <Controls position="bottom-left" />
              <MiniMap
                className="hidden rounded-md border border-black/10 bg-white/95 shadow-sm md:block"
                maskColor="rgba(247, 248, 250, 0.66)"
                nodeColor={(node) => miniMapNodeColor(node as CampaignFlowNode)}
                nodeStrokeWidth={2}
                pannable
                position="bottom-right"
                zoomable
              />
            </ReactFlow>
            {campaignDetail.data.promotions.length === 0 ? (
              <div className="pointer-events-none absolute left-1/2 top-6 w-[min(360px,calc(100%-2rem))] -translate-x-1/2 rounded-md border border-dashed border-black/15 bg-white/90 px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
                연결된 프로모션이 없습니다.
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <NodeMetricsDrawer
        node={selectedNode}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNodeId(null);
          }
        }}
      />
    </div>
  );
}

function CampaignFlowToolbar({
  campaigns,
  nextLoopCandidateCount,
  onCampaignChange,
  promotionCount,
  selectedCampaign,
  selectedCampaignId
}: {
  campaigns: DashboardCampaignSummary[];
  nextLoopCandidateCount: number;
  onCampaignChange: (campaignId: string) => void;
  promotionCount: number;
  selectedCampaign: DashboardCampaignSummary | undefined;
  selectedCampaignId: string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-black/10 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#1f6feb]/20 bg-[#f0f6ff] text-[#0969da]">
          <Workflow size={17} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
            워크플로우 맵
          </h1>
          <p className="truncate text-xs text-muted-foreground">Campaign pipeline</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Select
          disabled={campaigns.length === 0}
          onValueChange={onCampaignChange}
          value={selectedCampaignId || undefined}
        >
          <SelectTrigger className="h-8 w-full min-w-0 text-xs sm:w-[280px]">
            <SelectValue placeholder="캠페인 선택" />
          </SelectTrigger>
          <SelectContent>
            {campaigns.map((campaign) => (
              <SelectItem key={campaign.campaign_id} value={campaign.campaign_id}>
                {campaign.campaign_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToolbarChip icon={Megaphone} label="프로모션" value={formatInteger(promotionCount)} />
        <ToolbarChip
          icon={RefreshCw}
          label="next-loop 후보"
          tone={nextLoopCandidateCount > 0 ? "warning" : "normal"}
          value={formatInteger(nextLoopCandidateCount)}
        />
        <ToolbarChip
          icon={Target}
          label="최근 목표 달성률"
          value={formatOptionalRate(selectedCampaign?.latest_goal_achievement_rate)}
        />
        <div className="flex h-8 items-center gap-2 rounded-md border border-black/10 bg-zinc-50 px-2 text-xs text-muted-foreground">
          <LegendItem label="normal" tone="normal" />
          <LegendItem label="warning" tone="warning" />
          <LegendItem label="insufficient_data" tone="insufficient" />
        </div>
      </div>
    </div>
  );
}

function ToolbarChip({
  icon: Icon,
  label,
  tone = "normal",
  value
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  tone?: FlowPathTone;
  value: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-900",
        tone !== "warning" && "border-black/10 bg-zinc-50 text-[#1d1d1f]"
      )}
    >
      <Icon size={13} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function LegendItem({ label, tone }: { label: string; tone: FlowPathTone }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className={cn(
          "block h-0 w-6 border-t-2",
          tone === "normal" && "border-zinc-300",
          tone === "warning" && "border-amber-500",
          tone === "insufficient" && "border-amber-500 border-dashed"
        )}
      />
      <span>{label}</span>
    </span>
  );
}

function PipelineStageStrip() {
  const stages = [
    "Campaign",
    "Promotion runs",
    "Collection + evaluation",
    "Retry queue"
  ];

  return (
    <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
      {stages.map((stage, index) => (
        <div className="flex items-center gap-2" key={stage}>
          <span className="whitespace-nowrap">{stage}</span>
          {index < stages.length - 1 ? <ArrowRight className="text-zinc-400" size={12} /> : null}
        </div>
      ))}
    </div>
  );
}

function CanvasNotice({ message, title }: { message: string; title: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <div className="w-[min(420px,100%)] rounded-md border border-dashed border-black/15 bg-white px-5 py-6 text-center shadow-sm">
        <div className="text-sm font-semibold text-[#1d1d1f]">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{message}</div>
      </div>
    </div>
  );
}

function PipelineStatusPill({ status }: { status: string }) {
  const tone = statusTone(status);

  return (
    <span
      className={cn(
        "inline-flex max-w-[104px] shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "neutral" && "border-zinc-200 bg-zinc-50 text-zinc-600"
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "success" && "bg-emerald-500",
          tone === "warning" && "bg-amber-500",
          tone === "neutral" && "bg-zinc-400"
        )}
      />
      <span className="truncate">{status}</span>
    </span>
  );
}

function CampaignNode(props: NodeProps) {
  const data = props.data as FlowNodeData;

  return (
    <FlowNodeShell
      icon={Map}
      kind="campaign"
      status={data.status}
      subtitle={data.subtitle}
      title={data.title}
      tone={data.tone}
      widthClassName="w-[282px]"
    >
      <NodeSummaryGrid items={data.summary} />
      <Handle
        className="!size-2 !border-white !bg-[#64748b]"
        position={Position.Right}
        type="source"
      />
    </FlowNodeShell>
  );
}

function PromotionNode(props: NodeProps) {
  const data = props.data as FlowNodeData;
  const flow = data.promotionFlow;

  return (
    <FlowNodeShell
      icon={Megaphone}
      kind="promotion"
      status={data.status}
      subtitle={data.subtitle}
      title={data.title}
      tone={data.tone}
      widthClassName="w-[286px] min-h-[142px]"
    >
      <NodeSummaryGrid items={data.summary} />
      {flow ? (
        <div className="grid gap-1 border-t border-black/10 pt-2 text-xs text-muted-foreground">
          <MetricLine label="next" value={flow.promotion.next_action} />
        </div>
      ) : null}
      <Handle
        className="!size-2 !border-white !bg-[#64748b]"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="!size-2 !border-white !bg-[#64748b]"
        position={Position.Right}
        type="source"
      />
      <Handle
        className="!size-2 !border-white !bg-amber-500"
        id="loop-target"
        position={Position.Bottom}
        type="target"
      />
    </FlowNodeShell>
  );
}

function EvaluationNode(props: NodeProps) {
  const data = props.data as FlowNodeData;
  const promotionFlows = data.promotionFlows ?? [];

  return (
    <FlowNodeShell
      icon={BarChart3}
      kind="evaluation"
      status={data.status}
      subtitle={data.subtitle}
      title={data.title}
      tone={data.tone}
      widthClassName="w-[300px] min-h-[338px]"
    >
      <NodeSummaryGrid items={data.summary} />
      <WeakestPromotionList flows={promotionFlows} />
      <Handle
        className="!size-2 !border-white !bg-zinc-400"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="!size-2 !border-white !bg-zinc-400"
        id="retry-source"
        position={Position.Right}
        type="source"
      />
    </FlowNodeShell>
  );
}

function RetryQueueNode(props: NodeProps) {
  const data = props.data as FlowNodeData;
  const retryPromotionFlows = data.retryPromotionFlows ?? [];

  return (
    <FlowNodeShell
      icon={Repeat2}
      kind="retryQueue"
      status={data.status}
      subtitle={data.subtitle}
      title={data.title}
      tone={data.tone}
      widthClassName="w-[292px] min-h-[338px]"
    >
      <NodeSummaryGrid items={data.summary} />
      <RetryQueueList flows={retryPromotionFlows} />
      <Handle
        className="!size-2 !border-white !bg-amber-500"
        id="retry-target"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="!size-2 !border-white !bg-amber-500"
        id="loop-source"
        position={Position.Bottom}
        type="source"
      />
    </FlowNodeShell>
  );
}

function WeakestPromotionList({ flows }: { flows: PromotionFlowSummary[] }) {
  const visibleFlows = flows.slice(0, 4);

  if (visibleFlows.length === 0) {
    return <NodeEmptyState message="평가할 프로모션이 없습니다." />;
  }

  return (
    <div className="grid gap-1.5 border-t border-black/10 pt-2">
      <div className="text-[11px] font-semibold text-muted-foreground">낮은 달성률 순</div>
      {visibleFlows.map((flow) => (
        <div
          className="grid gap-1 rounded-md border border-black/10 bg-zinc-50/70 px-2 py-1.5 text-xs"
          key={flow.id}
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate font-medium text-[#1d1d1f]">
              {flow.promotion.marketing_theme}
            </span>
            <span className="font-semibold tabular-nums text-[#1d1d1f]">
              {formatOptionalGoalAchievement(flow.goalAchievementRate)}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2 text-muted-foreground">
            <span className="truncate">{flow.promotion.goal_metric}</span>
            <StatusBadge status={flow.evaluation.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RetryQueueList({ flows }: { flows: PromotionFlowSummary[] }) {
  if (flows.length === 0) {
    return <NodeEmptyState message="재시도 대기열이 비어 있습니다." />;
  }

  return (
    <div className="nodrag nopan nowheel grid max-h-[190px] gap-1.5 overflow-y-auto border-t border-amber-200 pt-2">
      {flows.map((flow) => (
        <div
          className="grid gap-1 rounded-md border border-amber-200 bg-amber-50/70 px-2 py-1.5 text-xs"
          key={flow.id}
        >
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="truncate font-semibold text-amber-950">
              {flow.promotion.marketing_theme}
            </span>
            <span className="font-semibold tabular-nums text-amber-900">
              L{formatInteger(Math.min(flow.promotion.current_loop_count + 1, flow.promotion.max_loop_count))}
            </span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            <CompactFact
              label="segments"
              tone="warning"
              value={formatInteger(flow.nextLoopSegments.length)}
            />
            <CompactFact
              label="required"
              tone="warning"
              value={formatInteger(flow.evaluation.nextLoopCount)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CompactFact({
  label,
  tone = "normal",
  value
}: {
  label: string;
  tone?: FlowPathTone;
  value: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-1 text-[11px]",
        tone === "warning" && "text-amber-900",
        tone === "insufficient" && "text-amber-900",
        tone === "normal" && "text-muted-foreground"
      )}
    >
      <span className="truncate">{label}</span>
      <span className="truncate text-right font-semibold tabular-nums text-[#1d1d1f]">
        {value}
      </span>
    </div>
  );
}

function NodeEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-black/10 bg-zinc-50 px-3 py-3 text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function FlowNodeShell({
  children,
  icon: Icon,
  kind,
  status,
  subtitle,
  title,
  tone,
  widthClassName
}: {
  children: ReactNode;
  icon: ComponentType<{ size?: number }>;
  kind: FlowNodeKind;
  status: string | undefined;
  subtitle: string | undefined;
  title: string;
  tone: FlowPathTone;
  widthClassName: string;
}) {
  const toneClassName = nodeToneClassName(tone);

  return (
    <div
      className={cn(
        "relative grid min-h-[126px] gap-2 rounded-md border bg-white px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.08)]",
        widthClassName,
        toneClassName.border,
        tone === "insufficient" && "border-dashed"
      )}
    >
      <div className={cn("absolute inset-y-2 left-0 w-1 rounded-r-full", toneClassName.rail)} />
      <div className="flex min-w-0 items-start justify-between gap-3 pl-1">
        <div className="flex min-w-0 items-start gap-2.5">
          <div
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border",
              nodeKindIconClassName(kind)
            )}
          >
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[10px] font-semibold uppercase text-muted-foreground">
                {nodeKindLabel(kind)}
              </span>
              <span className={cn("size-1.5 shrink-0 rounded-full", toneClassName.dot)} />
            </div>
            <div className="mt-0.5 truncate text-sm font-semibold leading-5 text-[#1d1d1f]">
              {title}
            </div>
            {subtitle ? (
              <div className="mt-0.5 line-clamp-1 break-words text-xs text-muted-foreground">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {status ? <PipelineStatusPill status={status} /> : null}
      </div>
      {children}
    </div>
  );
}

function NodeSummaryGrid({ items }: { items: FlowSummaryItem[] }) {
  return (
    <div className="grid gap-1.5 border-t border-black/10 pt-2">
      {items.map((item) => (
        <div
          className={cn(
            "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs",
            item.tone === "warning" && "text-amber-900",
            item.tone === "insufficient" &&
              "text-amber-900"
          )}
          key={item.label}
        >
          <div className="truncate text-muted-foreground">{item.label}</div>
          <div className="truncate text-right font-semibold tabular-nums text-[#1d1d1f]">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function NodeMetricsDrawer({
  node,
  onOpenChange
}: {
  node: CampaignFlowNode | null;
  onOpenChange: (open: boolean) => void;
}) {
  const data = node?.data;
  const HeaderIcon = data ? nodeKindIcon(data.kind) : Workflow;

  return (
    <Drawer open={Boolean(data)} onOpenChange={onOpenChange}>
      {data ? (
        <DrawerContent className="max-h-[82vh] rounded-t-md bg-white">
          <DrawerHeader className="relative border-b border-black/10 px-5 py-4 text-left">
            <div className="flex min-w-0 items-start gap-3 pr-8">
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
                  nodeKindIconClassName(data.kind)
                )}
              >
                <HeaderIcon size={16} />
              </div>
              <div className="min-w-0">
                <DrawerTitle className="truncate text-base font-semibold">{data.title}</DrawerTitle>
                {data.subtitle ? (
                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {data.subtitle}
                  </div>
                ) : null}
              </div>
            </div>
            <DrawerClose asChild>
              <Button
                aria-label="닫기"
                className="absolute right-3 top-3"
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X size={15} />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="grid min-h-0 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
            <section className="grid content-start gap-3">
              <NodeSummaryGrid items={data.summary} />
              {data.status ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">status</span>
                  <StatusBadge status={data.status} />
                </div>
              ) : null}
              {data.campaign?.objective ? (
                <div className="rounded-md border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-muted-foreground">
                  {data.campaign.objective}
                </div>
              ) : null}
            </section>
            <section className="grid min-w-0 content-start gap-4">
              {data.kind === "promotion" ? (
                <>
                  <PromotionFlowDetailList
                    emptyMessage="표시할 프로모션 실행이 없습니다."
                    flows={data.promotionFlow ? [data.promotionFlow] : []}
                    title="프로모션 실행"
                  />
                  <SegmentSummaryList segments={data.segments ?? []} />
                </>
              ) : null}
              {data.kind === "evaluation" ? (
                <>
                  <PromotionFlowDetailList
                    emptyMessage="평가할 프로모션이 없습니다."
                    flows={data.promotionFlows ?? []}
                    title="평가 요약 · 목표 달성률 낮은 순"
                  />
                  <ExperimentMetricList metrics={data.metrics ?? []} />
                  <SegmentSummaryList segments={data.segments ?? []} />
                </>
              ) : null}
              {data.kind === "retryQueue" ? (
                <>
                  <PromotionFlowDetailList
                    emptyMessage="재시도 대기열이 비어 있습니다."
                    flows={data.retryPromotionFlows ?? []}
                    title="재시도 후보 · 목표 달성률 낮은 순"
                  />
                  <SegmentSummaryList segments={data.segments ?? []} />
                  <ExperimentMetricList
                    metrics={(data.metrics ?? []).filter(isRetryMetric)}
                  />
                </>
              ) : null}
              {data.kind === "campaign" ? <CampaignNodeDetail campaign={data.campaign} /> : null}
            </section>
          </div>
          <DrawerFooter className="border-t border-black/10 px-5 py-4">
            <div className="flex justify-end">
              <DetailButton action={data.action}>자세히 보기</DetailButton>
            </div>
          </DrawerFooter>
        </DrawerContent>
      ) : null}
    </Drawer>
  );
}

function CampaignNodeDetail({ campaign }: { campaign: DashboardCampaignSummary | undefined }) {
  if (!campaign) {
    return null;
  }

  return (
    <div className="grid gap-2 rounded-md border border-black/10 bg-white px-3 py-3 text-sm">
      <MetricLine label="대상" value={campaign.target_audience} />
      <MetricLine label="주요 지표" value={campaign.primary_metric ?? "-"} />
      <MetricLine label="다음 액션" value={campaign.next_action} />
      <MetricLine label="업데이트" value={formatDateTime(campaign.updated_at)} />
    </div>
  );
}

function PromotionFlowDetailList({
  emptyMessage,
  flows,
  title
}: {
  emptyMessage: string;
  flows: PromotionFlowSummary[];
  title: string;
}) {
  const sortedFlows = sortPromotionFlowsByGoalAchievement(flows);

  if (sortedFlows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-black/10 bg-zinc-50 px-3 py-3 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold text-[#1d1d1f]">{title}</div>
      {sortedFlows.map((flow) => {
        const latestMetric = flow.evaluation.latestMetric;

        return (
          <DetailAnchor
            action={flow.action}
            className="grid gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50"
            key={flow.id}
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate font-medium text-[#1d1d1f]">
                {flow.promotion.marketing_theme}
              </span>
              <StatusBadge status={flow.evaluation.status} />
              {flow.nextLoopSegments.length > 0 ? (
                <Badge variant="destructive">next loop</Badge>
              ) : null}
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-5">
              <MetricLine
                label="achievement"
                value={formatOptionalGoalAchievement(flow.goalAchievementRate)}
              />
              <MetricLine
                label="collection"
                value={formatCollectionCoverage(flow.evaluation.totalSampleSize, flow.promotion)}
              />
              <MetricLine
                label="actual"
                value={latestMetric ? formatMetricValue(latestMetric.actual_value) : "-"}
              />
              <MetricLine
                label="target"
                value={latestMetric ? formatMetricValue(latestMetric.target_value) : "-"}
              />
              <MetricLine
                label="loop"
                value={`${formatInteger(flow.promotion.current_loop_count)} / ${formatInteger(flow.promotion.max_loop_count)}`}
              />
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
              <MetricLine label="message" value={flow.promotion.message_brief ?? "-"} />
              <MetricLine label="offer" value={flow.promotion.offer_type ?? "-"} />
              <MetricLine label="next" value={flow.promotion.next_action} />
            </div>
          </DetailAnchor>
        );
      })}
    </div>
  );
}

function SegmentSummaryList({ segments }: { segments: SegmentSummary[] }) {
  const sortedSegments = sortSegmentsByGoalAchievement(segments);

  if (segments.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-black/10 bg-zinc-50 px-3 py-3 text-sm text-muted-foreground">
        표시할 세그먼트가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold text-[#1d1d1f]">
        세그먼트 · 목표 달성률 낮은 순
      </div>
      {sortedSegments.map((segment) => (
        <DetailAnchor
          action={segment.action}
          className="grid gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50"
          key={segment.id}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium text-[#1d1d1f]">{segment.name}</span>
            <StatusBadge status={segment.status} />
            {segment.nextLoopRequired ? <Badge variant="destructive">next loop</Badge> : null}
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-4">
            <MetricLine
              label="achievement"
              value={formatOptionalGoalAchievement(segment.goalAchievementRate)}
            />
            <MetricLine
              label="actual"
              value={formatOptionalMetricValue(segment.latestActualValue)}
            />
            <MetricLine label="target" value={formatOptionalMetricValue(segment.targetValue)} />
            <MetricLine label="sample" value={formatInteger(segment.sampleSize)} />
          </div>
          {segment.contentTitle ? (
            <div className="text-xs text-muted-foreground">{segment.contentTitle}</div>
          ) : null}
        </DetailAnchor>
      ))}
    </div>
  );
}

function ExperimentMetricList({ metrics }: { metrics: DashboardCampaignExperimentMetric[] }) {
  const sortedMetrics = sortMetricsByGoalAchievement(metrics).slice(0, 8);

  if (sortedMetrics.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-black/10 bg-zinc-50 px-3 py-3 text-sm text-muted-foreground">
        표시할 실험 지표가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold text-[#1d1d1f]">
        실험 지표 · 목표 달성률 낮은 순
      </div>
      {sortedMetrics.map((metric) => (
        <div
          className="grid gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
          key={`${metric.promotion_id}:${metric.promotion_run_id}:${metric.segment_id ?? "all"}:${metric.metric}:${metric.created_at}`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium text-[#1d1d1f]">{metric.metric}</span>
            <StatusBadge status={metric.status} />
            {metric.next_loop_required ? <Badge variant="destructive">next loop</Badge> : null}
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-5">
            <MetricLine
              label="achievement"
              value={formatOptionalGoalAchievement(goalAchievementRate(metric.actual_value, metric.target_value))}
            />
            <MetricLine label="actual" value={formatMetricValue(metric.actual_value)} />
            <MetricLine label="target" value={formatMetricValue(metric.target_value)} />
            <MetricLine label="sample" value={formatInteger(metric.sample_size)} />
            <MetricLine label="created" value={formatDateTime(metric.created_at)} />
          </div>
          {metric.feedback ? (
            <div className="text-xs text-muted-foreground">{metric.feedback}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-[#1d1d1f]">{value}</span>
    </div>
  );
}

function DetailButton({ action, children }: { action: DetailAction; children: ReactNode }) {
  return (
    <Button asChild size="sm">
      <DetailAnchor action={action} className="gap-1">
        {children}
        <ArrowRight size={14} />
      </DetailAnchor>
    </Button>
  );
}

function DetailAnchor({
  action,
  children,
  className
}: {
  action: DetailAction;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      className={cn("nodrag nopan", className)}
      onClick={(event) => event.stopPropagation()}
      params={{ projectId: action.projectId, tabPath: action.tabPath }}
      search={(current) => ({
        ...current,
        selectedCampaignId: action.selectedCampaignId,
        selectedPromotionId: action.selectedPromotionId,
        selectedSegmentId: action.selectedSegmentId
      })}
      to="/dashboard/$projectId/$tabPath"
    >
      {children}
    </Link>
  );
}

function buildCampaignFlowGraph(
  detail: DashboardCampaignDetail,
  projectId: string
): CampaignFlowGraph {
  const nodes: CampaignFlowNode[] = [];
  const edges: Edge[] = [];
  const campaignId = detail.campaign.campaign_id;
  const campaignNodeId = `campaign:${campaignId}`;
  const evaluationNodeId = `evaluation:${campaignId}`;
  const retryQueueNodeId = `retry-queue:${campaignId}`;
  const promotionFlows = sortPromotionsByGoalAchievement(
    detail.promotions,
    detail.experiment_metrics
  ).map((promotion) => createPromotionFlowSummary(detail, projectId, campaignId, promotion));
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
      subtitle: detail.campaign.objective ?? detail.campaign.target_audience,
      summary: [
        {
          label: "loop",
          value: `${formatInteger(detail.campaign.current_loop_count)} / ${formatInteger(detail.campaign.max_loop_count)}`
        },
        { label: "promotions", value: formatInteger(detail.promotions.length) },
        { label: "segments", value: formatInteger(detail.segments.length) },
        {
          label: "latest goal",
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
          subtitle: `${flow.promotion.channel} · ${flow.promotion.goal_metric}`,
          summary: [
            {
              label: "goal",
              value: formatOptionalGoalAchievement(flow.goalAchievementRate),
              tone: flow.tone
            },
            {
              label: "collection",
              value: formatCollectionCoverage(flow.evaluation.totalSampleSize, flow.promotion),
              tone: flow.collectionTone
            },
            {
              label: "loop",
              value: `L${formatInteger(flow.promotion.current_loop_count)} / ${formatInteger(flow.promotion.max_loop_count)}`
            },
            {
              label: "segments",
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
        action: createAction(projectId, campaignId, "", "", "campaign-experiment-metrics"),
        kind: "evaluation",
        metrics: sortMetricsByGoalAchievement(detail.experiment_metrics),
        promotionFlows,
        segments: allSegments,
        status: evaluationStatus,
        subtitle: "Metrics are ranked by weakest goal achievement",
        summary: [
          { label: "metrics", value: formatInteger(totals.metricsCount) },
          { label: "goal met", value: formatInteger(totals.goalMetCount) },
          {
            label: "goal_not_met",
            value: formatInteger(totals.goalNotMetCount),
            tone: totals.goalNotMetCount > 0 ? "warning" : "normal"
          },
          {
            label: "insufficient",
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
        action: createAction(projectId, campaignId, "", "", "campaign-experiment-metrics"),
        kind: "retryQueue",
        metrics: detail.experiment_metrics,
        retryPromotionFlows,
        segments: retrySegments,
        status: retryStatus,
        subtitle: "Only failed or insufficient runs return to the next loop",
        summary: [
          {
            label: "candidates",
            value: formatInteger(retryPromotionFlows.length),
            tone: retryPromotionFlows.length > 0 ? "warning" : "normal"
          },
          {
            label: "segments",
            value: formatInteger(totals.retrySegmentCount),
            tone: totals.retrySegmentCount > 0 ? "warning" : "normal"
          },
          {
            label: "required metrics",
            value: formatInteger(totals.nextLoopCount),
            tone: totals.nextLoopCount > 0 ? "warning" : "normal"
          },
          {
            label: "next loop",
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
            `next loop ${formatInteger(retryPromotionFlows.length)}`
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

function LoopBackEdge({
  data,
  id,
  markerEnd,
  sourceX,
  sourceY,
  style,
  targetX,
  targetY
}: EdgeProps) {
  const bottomY = Math.max(sourceY, targetY) + 76;
  const label = typeof data?.label === "string" ? data.label : "next loop";
  const laneX = Math.min(sourceX, targetX) - 160;
  const labelX = (sourceX + laneX) / 2;
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${bottomY} L ${laneX} ${bottomY} L ${laneX} ${targetY} L ${targetX} ${targetY}`;

  return (
    <>
      <BaseEdge id={id} markerEnd={markerEnd} path={path} style={style} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900 shadow-sm"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${bottomY}px)`
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

function createPromotionFlowSummary(
  detail: DashboardCampaignDetail,
  projectId: string,
  campaignId: string,
  promotion: DashboardCampaignPromotion
): PromotionFlowSummary {
  const promotionSegments = detail.segments.filter(
    (segment) => segment.promotion_id === promotion.promotion_id
  );
  const promotionMetrics = detail.experiment_metrics.filter(
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

function sortPromotionFlowsByGoalAchievement(flows: PromotionFlowSummary[]) {
  return [...flows].sort((a, b) => {
    const rateDiff = compareNullableNumber(a.goalAchievementRate, b.goalAchievementRate);
    if (rateDiff !== 0) {
      return rateDiff;
    }
    return a.promotion.marketing_theme.localeCompare(b.promotion.marketing_theme);
  });
}

function formatAggregateCollectionCoverage(flows: PromotionFlowSummary[]) {
  const minimumSampleSize = flows.reduce(
    (total, flow) => total + flow.promotion.min_sample_size,
    0
  );
  if (minimumSampleSize <= 0) {
    return "-";
  }
  const totalSampleSize = flows.reduce((total, flow) => total + flow.evaluation.totalSampleSize, 0);
  return formatPercent(Math.min(totalSampleSize / minimumSampleSize, 1));
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
      "campaign-segments"
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

function sortSegmentsByGoalAchievement(segments: SegmentSummary[]) {
  return [...segments].sort((a, b) => {
    const rateDiff = compareNullableNumber(a.goalAchievementRate, b.goalAchievementRate);
    if (rateDiff !== 0) {
      return rateDiff;
    }
    return a.name.localeCompare(b.name);
  });
}

function sortMetricsByGoalAchievement(metrics: DashboardCampaignExperimentMetric[]) {
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

function goalAchievementRate(
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

function isRetryMetric(metric: DashboardCampaignExperimentMetric) {
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

function StatusBadge({ status }: { status: string }) {
  const Icon =
    status === "goal_met" ? CircleCheck : status === "insufficient_data" ? CircleAlert : null;

  return (
    <Badge className="max-w-[130px] truncate" variant={statusBadgeVariant(status)}>
      {Icon ? <Icon size={11} /> : null}
      <span className="truncate">{status}</span>
    </Badge>
  );
}

function statusBadgeVariant(status: string): BadgeVariant {
  if (status === "insufficient_data" || status === "goal_not_met" || status === "stopped") {
    return "destructive";
  }
  if (
    status === "goal_met" ||
    status === "completed" ||
    status === "approved" ||
    status === "running" ||
    status === "active"
  ) {
    return "secondary";
  }
  return "outline";
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (
    status === "goal_not_met" ||
    status === "insufficient_data" ||
    status === "stopped" ||
    status === "failed"
  ) {
    return "warning";
  }
  if (
    status === "goal_met" ||
    status === "completed" ||
    status === "approved" ||
    status === "collected"
  ) {
    return "success";
  }
  return "neutral";
}

function nodeKindLabel(kind: FlowNodeKind) {
  switch (kind) {
    case "campaign":
      return "Pipeline";
    case "promotion":
      return "Promotion";
    case "evaluation":
      return "Quality";
    case "retryQueue":
      return "Retry";
  }
}

function nodeKindIcon(kind: FlowNodeKind) {
  switch (kind) {
    case "campaign":
      return Map;
    case "promotion":
      return Megaphone;
    case "evaluation":
      return BarChart3;
    case "retryQueue":
      return Repeat2;
  }
}

function nodeKindIconClassName(kind: FlowNodeKind) {
  switch (kind) {
    case "campaign":
      return "border-[#0969da]/20 bg-[#f0f6ff] text-[#0969da]";
    case "promotion":
      return "border-zinc-300 bg-white text-zinc-700";
    case "evaluation":
      return "border-teal-200 bg-teal-50 text-teal-700";
    case "retryQueue":
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

function nodeToneClassName(tone: FlowPathTone) {
  if (tone === "warning") {
    return {
      border: "border-amber-300",
      dot: "bg-amber-500",
      rail: "bg-amber-500"
    };
  }
  if (tone === "insufficient") {
    return {
      border: "border-amber-300",
      dot: "bg-amber-500",
      rail: "bg-amber-500"
    };
  }
  return {
    border: "border-black/10",
    dot: "bg-emerald-500",
    rail: "bg-emerald-500"
  };
}

function miniMapNodeColor(node: CampaignFlowNode) {
  if (node.data.kind === "campaign") {
    return "#0969da";
  }
  if (node.data.kind === "evaluation") {
    return "#0f766e";
  }
  if (node.data.tone === "warning" || node.data.tone === "insufficient") {
    return "#f59e0b";
  }
  return "#18181b";
}

function formatOptionalRate(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatPercent(value);
}

function formatOptionalMetricValue(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatMetricValue(value);
}

function formatOptionalGoalAchievement(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatPercent(value);
}

function formatCollectionCoverage(
  totalSampleSize: number | null | undefined,
  promotion: DashboardCampaignPromotion | undefined
) {
  if (!promotion || !promotion.min_sample_size) {
    return "-";
  }
  return formatPercent(Math.min((totalSampleSize ?? 0) / promotion.min_sample_size, 1));
}

function formatMetricValue(value: number) {
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

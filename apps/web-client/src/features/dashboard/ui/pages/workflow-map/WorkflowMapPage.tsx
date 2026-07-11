import type {
  DashboardCampaignExperimentMetric,
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
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  type EdgeProps,
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
import { useCallback, useEffect, useMemo, type ComponentType, type ReactNode } from "react";
import { fetchDashboardCampaignDetail } from "../../../api/dashboard-api.js";
import {
  formatActionLabel,
  formatMetricLabel,
  formatStatusLabel
} from "../../../model/dashboard-labels.js";
import { formatDateTime, formatInteger } from "../../../model/dashboard-format.js";
import { useDashboardQueryState } from "../../../model/dashboard-query.js";
import { dashboardCampaignDetailQueryKey } from "../../../model/dashboard-query-keys.js";
import type { DashboardQuery } from "../../../model/dashboard-types.js";
import {
  buildCampaignFlowGraph,
  formatCollectionCoverage,
  formatMetricValue,
  formatOptionalGoalAchievement,
  formatOptionalMetricValue,
  formatOptionalRate,
  goalAchievementRate,
  isRetryMetric,
  sortMetricsByGoalAchievement,
  sortPromotionFlowsByGoalAchievement,
  sortSegmentsByGoalAchievement,
  type BadgeVariant,
  type CampaignFlowGraph,
  type CampaignFlowNode,
  type DetailAction,
  type FlowNodeData,
  type FlowNodeKind,
  type FlowPathTone,
  type FlowSummaryItem,
  type PromotionFlowSummary,
  type SegmentSummary
} from "./workflow-map-graph.js";

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

export function WorkflowMapPage({ data, query }: { data: DashboardMain; query: DashboardQuery }) {
  const [, setDashboardQueryState] = useDashboardQueryState();
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
        selectedSegmentId: "",
        selectedWorkflowNodeId: ""
      });
    }
  }, [query.selectedCampaignId, selectedCampaign, setDashboardQueryState]);

  const graph = useMemo(
    () =>
      campaignDetail.data
        ? buildCampaignFlowGraph(campaignDetail.data, query.projectId)
        : emptyGraph,
    [campaignDetail.data, query.projectId]
  );
  const selectedNode = graph.nodes.find((node) => node.id === query.selectedWorkflowNodeId) ?? null;
  const handleNodeClick = useCallback<NodeMouseHandler<CampaignFlowNode>>(
    (_, node) => {
      void setDashboardQueryState({ selectedWorkflowNodeId: node.id });
    },
    [setDashboardQueryState]
  );
  const handleCampaignChange = useCallback(
    (campaignId: string) => {
      void setDashboardQueryState({
        selectedCampaignId: campaignId,
        selectedPromotionId: "",
        selectedSegmentId: "",
        selectedWorkflowNodeId: ""
      });
    },
    [setDashboardQueryState]
  );
  const promotionCount =
    campaignDetail.data?.promotions.length ?? selectedCampaign?.promotion_count ?? 0;
  const nextLoopCandidateCount = campaignDetail.data ? graph.nextLoopCandidateCount : 0;

  return (
    <div className="flex h-full min-h-[calc(100svh-3.5rem)] min-w-0 flex-col bg-background">
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
              className="bg-[#f5f5f7]"
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
              onPaneClick={() => {
                void setDashboardQueryState({ selectedWorkflowNodeId: "" });
              }}
              panOnScroll
              proOptions={{ hideAttribution: true }}
              selectNodesOnDrag={false}
            >
              <Background color="#d2d2d7" gap={22} size={1} variant={BackgroundVariant.Dots} />
              <Panel
                className="pointer-events-none rounded-lg border border-black/10 bg-white/90 px-3 py-2 backdrop-blur"
                position="top-left"
              >
                <PipelineStageStrip />
              </Panel>
              <Controls position="bottom-left" />
              <MiniMap
                className="hidden rounded-lg border border-black/10 bg-white/95 md:block"
                maskColor="rgba(247, 248, 250, 0.66)"
                nodeColor={(node) => miniMapNodeColor(node as CampaignFlowNode)}
                nodeStrokeWidth={2}
                pannable
                position="bottom-right"
                zoomable
              />
            </ReactFlow>
            {campaignDetail.data.promotions.length === 0 ? (
              <div className="pointer-events-none absolute left-1/2 top-6 w-[min(360px,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-dashed border-black/15 bg-white/90 px-4 py-3 text-center text-sm text-muted-foreground">
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
            void setDashboardQueryState({ selectedWorkflowNodeId: "" });
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
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-accent text-primary">
          <Workflow size={17} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
            워크플로우 맵
          </h1>
          <p className="truncate text-xs text-muted-foreground">캠페인 파이프라인</p>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Select
          disabled={campaigns.length === 0}
          onValueChange={onCampaignChange}
          value={selectedCampaignId || undefined}
        >
          <SelectTrigger
            aria-label="워크플로우 맵 캠페인"
            className="h-8 w-full min-w-0 text-xs sm:w-[280px]"
          >
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
          label="다음 루프 후보"
          tone={nextLoopCandidateCount > 0 ? "warning" : "normal"}
          value={formatInteger(nextLoopCandidateCount)}
        />
        <ToolbarChip
          icon={Target}
          label="최근 목표 달성률"
          value={formatOptionalRate(selectedCampaign?.latest_goal_achievement_rate)}
        />
        <div className="flex h-8 items-center gap-2 rounded-md border border-black/10 bg-zinc-50 px-2 text-xs text-muted-foreground">
          <LegendItem label="정상" tone="normal" />
          <LegendItem label="주의" tone="warning" />
          <LegendItem label="표본 부족" tone="insufficient" />
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
  const stages = ["캠페인", "프로모션 실행", "수집 및 평가", "재시도 대기열"];

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
      <div className="w-[min(420px,100%)] rounded-lg border border-dashed border-black/15 bg-white px-5 py-6 text-center">
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
      <span className="truncate">{formatStatusLabel(status)}</span>
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
        className="!size-2 !border-white !bg-muted-foreground"
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
          <MetricLine label="다음 액션" value={formatActionLabel(flow.promotion.next_action)} />
        </div>
      ) : null}
      <Handle
        className="!size-2 !border-white !bg-muted-foreground"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="!size-2 !border-white !bg-muted-foreground"
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
            <span className="truncate">{formatMetricLabel(flow.promotion.goal_metric)}</span>
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
              L
              {formatInteger(
                Math.min(flow.promotion.current_loop_count + 1, flow.promotion.max_loop_count)
              )}
            </span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            <CompactFact
              label="세그먼트"
              tone="warning"
              value={formatInteger(flow.nextLoopSegments.length)}
            />
            <CompactFact
              label="필요 지표"
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
      <span className="truncate text-right font-semibold tabular-nums text-[#1d1d1f]">{value}</span>
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
            item.tone === "insufficient" && "text-amber-900"
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
                  <ExperimentMetricList metrics={(data.metrics ?? []).filter(isRetryMetric)} />
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
      <MetricLine label="주요 지표" value={formatMetricLabel(campaign.primary_metric)} />
      <MetricLine label="다음 액션" value={formatActionLabel(campaign.next_action)} />
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
                <Badge variant="destructive">다음 루프</Badge>
              ) : null}
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-5">
              <MetricLine
                label="달성률"
                value={formatOptionalGoalAchievement(flow.goalAchievementRate)}
              />
              <MetricLine
                label="수집률"
                value={formatCollectionCoverage(flow.evaluation.totalSampleSize, flow.promotion)}
              />
              <MetricLine
                label="실제값"
                value={latestMetric ? formatMetricValue(latestMetric.actual_value) : "-"}
              />
              <MetricLine
                label="목표값"
                value={latestMetric ? formatMetricValue(latestMetric.target_value) : "-"}
              />
              <MetricLine
                label="loop"
                value={`${formatInteger(flow.promotion.current_loop_count)} / ${formatInteger(flow.promotion.max_loop_count)}`}
              />
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
              <MetricLine label="메시지" value={flow.promotion.message_brief ?? "-"} />
              <MetricLine label="오퍼" value={flow.promotion.offer_type ?? "-"} />
              <MetricLine label="다음 액션" value={formatActionLabel(flow.promotion.next_action)} />
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
      <div className="text-sm font-semibold text-[#1d1d1f]">세그먼트 · 목표 달성률 낮은 순</div>
      {sortedSegments.map((segment) => (
        <DetailAnchor
          action={segment.action}
          className="grid gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm transition-colors hover:bg-zinc-50"
          key={segment.id}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium text-[#1d1d1f]">{segment.name}</span>
            <StatusBadge status={segment.status} />
            {segment.nextLoopRequired ? <Badge variant="destructive">다음 루프</Badge> : null}
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-4">
            <MetricLine
              label="달성률"
              value={formatOptionalGoalAchievement(segment.goalAchievementRate)}
            />
            <MetricLine
              label="실제값"
              value={formatOptionalMetricValue(segment.latestActualValue)}
            />
            <MetricLine label="목표값" value={formatOptionalMetricValue(segment.targetValue)} />
            <MetricLine label="표본" value={formatInteger(segment.sampleSize)} />
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
      <div className="text-sm font-semibold text-[#1d1d1f]">실험 지표 · 목표 달성률 낮은 순</div>
      {sortedMetrics.map((metric) => (
        <div
          className="grid gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm"
          key={`${metric.promotion_id}:${metric.promotion_run_id}:${metric.segment_id ?? "all"}:${metric.metric}:${metric.created_at}`}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate font-medium text-[#1d1d1f]">
              {formatMetricLabel(metric.metric)}
            </span>
            <StatusBadge status={metric.status} />
            {metric.next_loop_required ? <Badge variant="destructive">다음 루프</Badge> : null}
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-5">
            <MetricLine
              label="달성률"
              value={formatOptionalGoalAchievement(
                goalAchievementRate(metric.actual_value, metric.target_value)
              )}
            />
            <MetricLine label="실제값" value={formatMetricValue(metric.actual_value)} />
            <MetricLine label="목표값" value={formatMetricValue(metric.target_value)} />
            <MetricLine label="표본" value={formatInteger(metric.sample_size)} />
            <MetricLine label="생성일" value={formatDateTime(metric.created_at)} />
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
  const label = typeof data?.label === "string" ? data.label : "다음 루프";
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

function StatusBadge({ status }: { status: string }) {
  const Icon =
    status === "goal_met" ? CircleCheck : status === "insufficient_data" ? CircleAlert : null;

  return (
    <Badge className="max-w-[130px] truncate" variant={statusBadgeVariant(status)}>
      {Icon ? <Icon size={11} /> : null}
      <span className="truncate">{formatStatusLabel(status)}</span>
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
      return "파이프라인";
    case "promotion":
      return "프로모션";
    case "evaluation":
      return "품질";
    case "retryQueue":
      return "재시도";
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
      return "border-primary/20 bg-accent text-primary";
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
    return "var(--chart-1)";
  }
  if (node.data.kind === "evaluation") {
    return "#0f766e";
  }
  if (node.data.tone === "warning" || node.data.tone === "insufficient") {
    return "#f59e0b";
  }
  return "#18181b";
}

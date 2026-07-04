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
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
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
  GitBranch,
  Map,
  Megaphone,
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

type FlowNodeKind = "campaign" | "promotion" | "result" | "nextLoop";
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
  estimatedSize: number;
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
};

type PromotionEvaluationSummary = {
  goalMetCount: number;
  goalNotMetCount: number;
  insufficientDataCount: number;
  latestMetric: DashboardCampaignExperimentMetric | null;
  metrics: DashboardCampaignExperimentMetric[];
  nextLoopCount: number;
  retrySegmentIds: string[];
  status: string;
  totalSampleSize: number;
};

type FlowNodeData = {
  [key: string]: unknown;
  action: DetailAction;
  campaign?: DashboardCampaignSummary;
  evaluation?: PromotionEvaluationSummary;
  kind: FlowNodeKind;
  nextLoopSegments?: SegmentSummary[];
  promotion?: DashboardCampaignPromotion;
  segments?: SegmentSummary[];
  status?: string;
  subtitle?: string;
  summary: FlowSummaryItem[];
  title: string;
  tone: FlowPathTone;
};

type CampaignFlowNode = Node<FlowNodeData, FlowNodeKind>;
type CampaignFlowGraph = {
  edges: Edge[];
  nextLoopCandidateCount: number;
  nodes: CampaignFlowNode[];
};

const CAMPAIGN_X = 0;
const PROMOTION_X = 360;
const RESULT_X = 760;
const NEXT_LOOP_X = 1110;
const ROW_GAP = 238;

const nodeTypes = {
  campaign: CampaignNode,
  nextLoop: NextLoopNode,
  promotion: PromotionNode,
  result: ResultNode
} satisfies NodeTypes;

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
              className="bg-[#f5f5f7]"
              edges={graph.edges}
              fitView
              fitViewOptions={{ maxZoom: 1, minZoom: 0.4, padding: 0.18 }}
              maxZoom={1.25}
              minZoom={0.35}
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
              <Background color="#d4d4d8" gap={24} size={1} variant={BackgroundVariant.Dots} />
              <Controls position="bottom-left" />
              <MiniMap
                className="hidden rounded-md border border-black/10 bg-white/95 shadow-sm md:block"
                maskColor="rgba(245, 245, 247, 0.62)"
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
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#0066cc] text-white">
          <Workflow size={17} />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
            워크플로우 맵
          </h1>
          <p className="truncate text-xs text-muted-foreground">Campaign Flow Map</p>
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
        <div className="flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-2 text-xs text-muted-foreground">
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
        "flex h-8 items-center gap-1.5 rounded-md border bg-white px-2 text-xs",
        tone === "warning" && "border-amber-300 bg-amber-50 text-amber-900",
        tone !== "warning" && "border-black/10 text-[#1d1d1f]"
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
      widthClassName="w-[300px]"
    >
      <NodeSummaryGrid items={data.summary} />
      <Handle
        className="!size-2 !border-white !bg-zinc-400"
        position={Position.Right}
        type="source"
      />
    </FlowNodeShell>
  );
}

function PromotionNode(props: NodeProps) {
  const data = props.data as FlowNodeData;
  const segments = data.segments ?? [];

  return (
    <FlowNodeShell
      icon={Megaphone}
      kind="promotion"
      status={data.status}
      subtitle={data.subtitle}
      title={data.title}
      tone={data.tone}
      widthClassName="w-[340px]"
    >
      <NodeSummaryGrid items={data.summary} />
      <div className="grid gap-1.5">
        {segments.length > 0 ? (
          segments
            .slice(0, 10)
            .map((segment) => <SegmentSummaryLink key={segment.id} segment={segment} />)
        ) : (
          <div className="rounded-md border border-dashed border-black/10 bg-zinc-50 px-2 py-2 text-xs text-muted-foreground">
            연결 세그먼트 없음
          </div>
        )}
        {segments.length > 10 ? (
          <div className="text-xs text-muted-foreground">
            +{formatInteger(segments.length - 10)} segments
          </div>
        ) : null}
      </div>
      <Handle
        className="!size-2 !border-white !bg-zinc-400"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="!size-2 !border-white !bg-zinc-400"
        position={Position.Right}
        type="source"
      />
    </FlowNodeShell>
  );
}

function ResultNode(props: NodeProps) {
  const data = props.data as FlowNodeData;
  const latestMetric = data.evaluation?.latestMetric;

  return (
    <FlowNodeShell
      icon={BarChart3}
      kind="result"
      status={data.status}
      subtitle={data.subtitle}
      title={data.title}
      tone={data.tone}
      widthClassName="w-[286px]"
    >
      <NodeSummaryGrid items={data.summary} />
      <div className="rounded-md bg-zinc-50 px-2 py-2 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>latest actual</span>
          <span className="font-medium text-[#1d1d1f]">
            {latestMetric ? formatMetricValue(latestMetric.actual_value) : "-"}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span>target</span>
          <span className="font-medium text-[#1d1d1f]">
            {latestMetric ? formatMetricValue(latestMetric.target_value) : "-"}
          </span>
        </div>
      </div>
      <Handle
        className="!size-2 !border-white !bg-zinc-400"
        position={Position.Left}
        type="target"
      />
      <Handle
        className="!size-2 !border-white !bg-zinc-400"
        position={Position.Right}
        type="source"
      />
    </FlowNodeShell>
  );
}

function NextLoopNode(props: NodeProps) {
  const data = props.data as FlowNodeData;
  const candidateCount = data.nextLoopSegments?.length ?? 0;

  return (
    <FlowNodeShell
      icon={GitBranch}
      kind="nextLoop"
      status={data.status}
      subtitle={data.subtitle}
      title={data.title}
      tone={data.tone}
      widthClassName="w-[270px]"
    >
      <NodeSummaryGrid items={data.summary} />
      <div className="flex items-center justify-between rounded-md bg-amber-50 px-2 py-2 text-xs text-amber-900">
        <span>candidate segments</span>
        <span className="font-semibold tabular-nums">{formatInteger(candidateCount)}</span>
      </div>
      <Handle
        className="!size-2 !border-white !bg-amber-500"
        position={Position.Left}
        type="target"
      />
    </FlowNodeShell>
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
  return (
    <div
      className={cn(
        "relative grid gap-3 rounded-md border bg-white p-3 text-left shadow-sm",
        widthClassName,
        tone === "normal" && "border-black/10",
        tone === "warning" && "border-amber-300 shadow-amber-100",
        tone === "insufficient" && "border-amber-300 border-dashed shadow-amber-100"
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
              kind === "campaign" && "bg-[#0066cc] text-white",
              kind === "promotion" && "bg-zinc-900 text-white",
              kind === "result" && "bg-zinc-100 text-zinc-700",
              kind === "nextLoop" && "bg-amber-100 text-amber-800"
            )}
          >
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-5 text-[#1d1d1f]">{title}</div>
            {subtitle ? (
              <div className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      {children}
    </div>
  );
}

function NodeSummaryGrid({ items }: { items: FlowSummaryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((item) => (
        <div
          className={cn(
            "min-w-0 rounded-md bg-zinc-50 px-2 py-1.5",
            item.tone === "warning" && "bg-amber-50 text-amber-900",
            item.tone === "insufficient" &&
              "border border-dashed border-amber-300 bg-amber-50 text-amber-900"
          )}
          key={item.label}
        >
          <div className="truncate text-[10px] text-muted-foreground">{item.label}</div>
          <div className="truncate text-xs font-semibold tabular-nums text-[#1d1d1f]">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function SegmentSummaryLink({ segment }: { segment: SegmentSummary }) {
  return (
    <DetailAnchor
      action={segment.action}
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-black/10 bg-white px-2 py-1.5 text-xs transition-colors hover:bg-zinc-50",
        segment.nextLoopRequired && "border-amber-300 bg-amber-50"
      )}
    >
      <span className="min-w-0">
        <span className="block truncate font-medium text-[#1d1d1f]">{segment.name}</span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {segment.goalMetric} · {formatInteger(segment.sampleSize)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <StatusBadge status={segment.status} />
        <ArrowRight size={12} />
      </span>
    </DetailAnchor>
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

  return (
    <Drawer open={Boolean(data)} onOpenChange={onOpenChange}>
      {data ? (
        <DrawerContent className="max-h-[82vh] rounded-t-md bg-white">
          <DrawerHeader className="relative border-b border-black/10 px-5 py-4 text-left">
            <div className="flex min-w-0 items-start gap-3 pr-8">
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                  data.kind === "campaign" && "bg-[#0066cc] text-white",
                  data.kind === "promotion" && "bg-zinc-900 text-white",
                  data.kind === "result" && "bg-zinc-100 text-zinc-700",
                  data.kind === "nextLoop" && "bg-amber-100 text-amber-800"
                )}
              >
                {data.kind === "campaign" ? <Map size={16} /> : null}
                {data.kind === "promotion" ? <Megaphone size={16} /> : null}
                {data.kind === "result" ? <BarChart3 size={16} /> : null}
                {data.kind === "nextLoop" ? <GitBranch size={16} /> : null}
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
                <SegmentSummaryList segments={data.segments ?? []} />
              ) : null}
              {data.kind === "result" ? (
                <ExperimentMetricList metrics={data.evaluation?.metrics ?? []} />
              ) : null}
              {data.kind === "nextLoop" ? (
                <>
                  <SegmentSummaryList segments={data.nextLoopSegments ?? []} />
                  <ExperimentMetricList
                    metrics={(data.evaluation?.metrics ?? []).filter(isRetryMetric)}
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

function SegmentSummaryList({ segments }: { segments: SegmentSummary[] }) {
  if (segments.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-black/10 bg-zinc-50 px-3 py-3 text-sm text-muted-foreground">
        표시할 세그먼트가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold text-[#1d1d1f]">세그먼트</div>
      {segments.map((segment) => (
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
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
            <MetricLine label="sample" value={formatInteger(segment.sampleSize)} />
            <MetricLine label="ratio" value={formatRateValue(segment.sampleRatio)} />
            <MetricLine
              label="latest"
              value={formatOptionalMetricValue(segment.latestActualValue)}
            />
          </div>
        </DetailAnchor>
      ))}
    </div>
  );
}

function ExperimentMetricList({ metrics }: { metrics: DashboardCampaignExperimentMetric[] }) {
  const sortedMetrics = sortMetricsByNewest(metrics).slice(0, 8);

  if (sortedMetrics.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-black/10 bg-zinc-50 px-3 py-3 text-sm text-muted-foreground">
        표시할 실험 지표가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="text-sm font-semibold text-[#1d1d1f]">실험 지표</div>
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
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-4">
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
  const campaignY =
    detail.promotions.length > 1 ? ((detail.promotions.length - 1) * ROW_GAP) / 2 : 0;

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
    position: { x: CAMPAIGN_X, y: campaignY },
    type: "campaign"
  });

  let nextLoopCandidateCount = 0;

  detail.promotions.forEach((promotion, index) => {
    const y = index * ROW_GAP;
    const promotionSegments = detail.segments.filter(
      (segment) => segment.promotion_id === promotion.promotion_id
    );
    const promotionMetrics = detail.experiment_metrics.filter(
      (metric) => metric.promotion_id === promotion.promotion_id
    );
    const evaluation = summarizeEvaluation(promotion, promotionSegments, promotionMetrics);
    const tone = pathToneForPromotion(promotion, promotionSegments, promotionMetrics);
    const segmentSummaries = promotionSegments.map((segment) =>
      createSegmentSummary(segment, promotionMetrics, projectId, campaignId)
    );
    const nextLoopSegments = segmentSummaries.filter((segment) => segment.nextLoopRequired);
    const hasNextLoopNode = isNextLoopCandidate(promotion, promotionSegments, promotionMetrics);
    const promotionNodeId = `promotion:${promotion.promotion_id}`;
    const resultNodeId = `result:${promotion.promotion_id}`;
    const nextLoopNodeId = `next-loop:${promotion.promotion_id}`;

    if (hasNextLoopNode) {
      nextLoopCandidateCount += 1;
    }

    nodes.push({
      data: {
        action: createAction(
          projectId,
          campaignId,
          promotion.promotion_id,
          "",
          "campaign-promotions"
        ),
        evaluation,
        kind: "promotion",
        promotion,
        segments: segmentSummaries,
        status: promotion.status,
        subtitle: promotion.channel,
        summary: [
          { label: "segments", value: formatInteger(promotionSegments.length) },
          {
            label: "loop",
            value: `${formatInteger(promotion.current_loop_count)} / ${formatInteger(promotion.max_loop_count)}`
          },
          { label: "goal", value: formatMetricValue(promotion.goal_target_value) },
          { label: "latest", value: formatOptionalMetricValue(promotion.latest_actual_value), tone }
        ],
        title: promotion.marketing_theme,
        tone
      },
      id: promotionNodeId,
      position: { x: PROMOTION_X, y },
      type: "promotion"
    });

    nodes.push({
      data: {
        action: createAction(
          projectId,
          campaignId,
          promotion.promotion_id,
          "",
          "campaign-experiment-metrics"
        ),
        evaluation,
        kind: "result",
        promotion,
        status: evaluation.status,
        subtitle: promotion.goal_metric,
        summary: [
          { label: "evaluations", value: formatInteger(evaluation.metrics.length) },
          { label: "goal met", value: formatInteger(evaluation.goalMetCount) },
          {
            label: "goal_not_met",
            value: formatInteger(evaluation.goalNotMetCount),
            tone: evaluation.goalNotMetCount > 0 ? "warning" : "normal"
          },
          {
            label: "insufficient",
            value: formatInteger(evaluation.insufficientDataCount),
            tone: evaluation.insufficientDataCount > 0 ? "insufficient" : "normal"
          }
        ],
        title: "Result Summary",
        tone
      },
      id: resultNodeId,
      position: { x: RESULT_X, y },
      type: "result"
    });

    if (hasNextLoopNode) {
      nodes.push({
        data: {
          action: createAction(
            projectId,
            campaignId,
            promotion.promotion_id,
            "",
            "campaign-experiment-metrics"
          ),
          evaluation,
          kind: "nextLoop",
          nextLoopSegments,
          promotion,
          status: evaluation.status,
          subtitle: promotion.marketing_theme,
          summary: [
            {
              label: "required metrics",
              value: formatInteger(evaluation.nextLoopCount),
              tone: evaluation.nextLoopCount > 0 ? "warning" : "normal"
            },
            { label: "retry segments", value: formatInteger(nextLoopSegments.length), tone },
            {
              label: "goal_not_met",
              value: formatInteger(evaluation.goalNotMetCount),
              tone: evaluation.goalNotMetCount > 0 ? "warning" : "normal"
            },
            {
              label: "insufficient",
              value: formatInteger(evaluation.insufficientDataCount),
              tone: evaluation.insufficientDataCount > 0 ? "insufficient" : "normal"
            }
          ],
          title: "Next Loop",
          tone
        },
        id: nextLoopNodeId,
        position: { x: NEXT_LOOP_X, y },
        type: "nextLoop"
      });
    }

    edges.push(
      createFlowEdge(
        `${campaignNodeId}->${promotionNodeId}`,
        campaignNodeId,
        promotionNodeId,
        "normal"
      )
    );
    edges.push(
      createFlowEdge(`${promotionNodeId}->${resultNodeId}`, promotionNodeId, resultNodeId, tone)
    );
    if (hasNextLoopNode) {
      edges.push(
        createFlowEdge(`${resultNodeId}->${nextLoopNodeId}`, resultNodeId, nextLoopNodeId, tone)
      );
    }
  });

  return {
    edges,
    nextLoopCandidateCount,
    nodes
  };
}

function createFlowEdge(id: string, source: string, target: string, tone: FlowPathTone): Edge {
  const stroke = tone === "normal" ? "#d4d4d8" : "#d97706";

  return {
    animated: tone === "warning",
    id,
    markerEnd: {
      color: stroke,
      type: MarkerType.ArrowClosed
    },
    source,
    style: {
      stroke,
      strokeDasharray: tone === "insufficient" ? "7 5" : undefined,
      strokeWidth: tone === "normal" ? 1.7 : 2.4
    },
    target,
    type: "smoothstep"
  };
}

function createSegmentSummary(
  segment: DashboardCampaignSegment,
  metrics: DashboardCampaignExperimentMetric[],
  projectId: string,
  campaignId: string
): SegmentSummary {
  const segmentMetrics = metrics.filter((metric) => metric.segment_id === segment.segment_id);
  const latestMetric = latestMetricFrom(segmentMetrics);
  const nextLoopRequired =
    isRetryStatus(segment.status) || segmentMetrics.some((metric) => isRetryMetric(metric));

  return {
    action: createAction(
      projectId,
      campaignId,
      segment.promotion_id,
      segment.segment_id,
      "campaign-segments"
    ),
    estimatedSize: segment.estimated_size,
    goalMetric: segment.goal_metric,
    id: segment.segment_id,
    latestActualValue: latestMetric?.actual_value ?? segment.latest_actual_value,
    metricsCount: segmentMetrics.length,
    name: segment.segment_name,
    nextLoopRequired,
    priority: segment.priority,
    promotionId: segment.promotion_id,
    sampleRatio: segment.sample_ratio,
    sampleSize: segment.sample_size,
    status: segment.status
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
    metrics,
    nextLoopCount,
    retrySegmentIds,
    status,
    totalSampleSize
  };
}

function isNextLoopCandidate(
  promotion: DashboardCampaignPromotion,
  segments: DashboardCampaignSegment[],
  metrics: DashboardCampaignExperimentMetric[]
) {
  return (
    isRetryStatus(promotion.status) ||
    segments.some((segment) => isRetryStatus(segment.status)) ||
    metrics.some(isRetryMetric)
  );
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

function miniMapNodeColor(node: CampaignFlowNode) {
  if (node.data.kind === "campaign") {
    return "#0066cc";
  }
  if (node.data.tone === "warning" || node.data.tone === "insufficient") {
    return "#f59e0b";
  }
  if (node.data.kind === "result") {
    return "#71717a";
  }
  return "#18181b";
}

function formatOptionalRate(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatPercent(value);
}

function formatOptionalMetricValue(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatMetricValue(value);
}

function formatMetricValue(value: number) {
  return value <= 1 ? formatPercent(value) : formatInteger(value);
}

function formatRateValue(value: number) {
  return value <= 1 ? formatPercent(value) : formatInteger(value);
}

function isPresentString(value: string | null): value is string {
  return Boolean(value);
}

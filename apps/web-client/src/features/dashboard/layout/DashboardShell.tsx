import type { DashboardCampaignDetail, DashboardMain } from "@loopad/shared";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@loopad/ui/shadcn/collapsible";
import { Separator } from "@loopad/ui/shadcn/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from "@loopad/ui/shadcn/sidebar";
import { cn } from "@loopad/ui/shadcn/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode
} from "react";
import { fetchDashboardCampaignDetail, fetchDashboardPageResource } from "../api/dashboard-api.js";
import {
  dashboardNavigationTree,
  getDashboardTabLabel,
  type DashboardNavTreeFolderItem,
  type DashboardNavTreeItem,
  type DashboardNavTreeLinkItem
} from "../model/dashboard-navigation.js";
import { normalizeDashboardQuery, useDashboardQueryState } from "../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPageQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardQuery, DashboardTab } from "../model/dashboard-types.js";
import { ProjectSidebarBrand } from "../ui/project/ProjectSidebarBrand.js";

const DEFAULT_SIDEBAR_WIDTH = 256;
const MAX_SIDEBAR_WIDTH = 360;
const MIN_SIDEBAR_WIDTH = 224;
const SIDEBAR_WIDTH_STORAGE_KEY = "loopad.dashboard.sidebarWidth";

export function DashboardShell({
  activeTab,
  children,
  projectId
}: {
  activeTab: DashboardTab;
  children: ReactNode;
  projectId: string;
}) {
  const { handleResizeStart, resetWidth, sidebarWidth } = useResizableSidebarWidth();
  const isCanvasTab = activeTab === "dataExplorer" || activeTab === "campaign-flow-map";
  const isFunnelTab = activeTab === "funnels";
  const isFullHeightTab = isCanvasTab || isFunnelTab;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`
        } as CSSProperties
      }
    >
      <Sidebar className="border-r border-black/10" collapsible="icon">
        <SidebarHeader className="p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <ProjectSidebarBrand projectId={projectId} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>분석 화면</SidebarGroupLabel>
            <SidebarGroupContent>
              <DashboardNavigation activeTab={activeTab} projectId={projectId} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarResizeHandle onDoubleClick={resetWidth} onPointerDown={handleResizeStart} />
        <SidebarRail />
      </Sidebar>

      <SidebarInset className={isFullHeightTab ? "h-svh min-w-0 overflow-hidden" : "min-w-0"}>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-black/10 bg-white/85 px-4 backdrop-blur md:px-6">
          <div className="flex h-full min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <div className="flex h-6 items-center">
              <Separator className="h-full" orientation="vertical" />
            </div>
            <DashboardHeaderContext activeTab={activeTab} projectId={projectId} />
          </div>
        </header>

        <main
          className={
            isCanvasTab
              ? "min-h-0 min-w-0 flex-1 overflow-hidden bg-[#f5f5f7]"
              : "min-h-0 min-w-0 flex-1 overflow-auto bg-[#f5f5f7]"
          }
        >
          <div
            className={
              isCanvasTab
                ? "h-full min-h-0 w-full"
                : isFunnelTab
                  ? "grid h-full min-h-0 w-full px-4 pt-6 md:px-8 lg:pt-8"
                  : "mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-6 md:px-8 lg:py-8"
            }
          >
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DashboardNavigation({
  activeTab,
  projectId
}: {
  activeTab: DashboardTab;
  projectId: string;
}) {
  return (
    <SidebarMenu>
      {dashboardNavigationTree.map((item) =>
        item.type === "folder" ? (
          <DashboardNavigationFolderItem
            activeTab={activeTab}
            item={item}
            key={getNavigationItemKey(item)}
            projectId={projectId}
          />
        ) : (
          <DashboardNavigationLinkItem
            activeTab={activeTab}
            item={item}
            key={getNavigationItemKey(item)}
            projectId={projectId}
          />
        )
      )}
    </SidebarMenu>
  );
}

function DashboardNavigationLinkItem({
  activeTab,
  item,
  projectId
}: {
  activeTab: DashboardTab;
  item: DashboardNavTreeLinkItem;
  projectId: string;
}) {
  const Icon = item.icon;
  const isActive = activeTab === item.value;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={cn(
          "rounded-full text-sidebar-foreground/80",
          isActive && "font-bold text-[#111111] [&>svg]:stroke-[2.5] [&>svg]:text-[#111111]"
        )}
        isActive={isActive}
        tooltip={item.label}
      >
        <Link
          params={{ projectId, tabPath: item.pathSegment }}
          search={(current) => current}
          to="/dashboard/$projectId/$tabPath"
        >
          <Icon />
          <span className={cn(isActive && "font-bold text-[#111111]")}>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function DashboardNavigationFolderItem({
  activeTab,
  item,
  projectId
}: {
  activeTab: DashboardTab;
  item: DashboardNavTreeFolderItem;
  projectId: string;
}) {
  const Icon = item.icon;
  const isBranchActive = isNavigationItemActive(item, activeTab);

  return (
    <Collapsible asChild className="group/collapsible" defaultOpen={isBranchActive}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className={cn(
              "rounded-full text-sidebar-foreground/80",
              isBranchActive &&
                "font-bold text-[#111111] [&>svg]:stroke-[2.5] [&>svg]:text-[#111111]"
            )}
            isActive={isBranchActive}
            tooltip={item.label}
          >
            {Icon ? <Icon /> : null}
            <span className={cn(isBranchActive && "font-bold text-[#111111]")}>{item.label}</span>
            <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <DashboardNavigationSubItems
            activeTab={activeTab}
            depth={0}
            items={item.children}
            projectId={projectId}
          />
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function DashboardNavigationSubItems({
  activeTab,
  depth,
  items,
  projectId
}: {
  activeTab: DashboardTab;
  depth: number;
  items: DashboardNavTreeItem[];
  projectId: string;
}) {
  return (
    <SidebarMenuSub className={cn("mr-0 pr-0", depth > 0 && "ml-3 pl-3")}>
      {items.map((item) =>
        item.type === "folder" ? (
          <DashboardNavigationSubFolderItem
            activeTab={activeTab}
            depth={depth}
            item={item}
            key={getNavigationItemKey(item)}
            projectId={projectId}
          />
        ) : (
          <DashboardNavigationSubLinkItem
            activeTab={activeTab}
            item={item}
            key={getNavigationItemKey(item)}
            projectId={projectId}
          />
        )
      )}
    </SidebarMenuSub>
  );
}

function DashboardNavigationSubLinkItem({
  activeTab,
  item,
  projectId
}: {
  activeTab: DashboardTab;
  item: DashboardNavTreeLinkItem;
  projectId: string;
}) {
  const Icon = item.icon;
  const isExactActive = activeTab === item.value;

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        asChild
        className={cn(
          "relative w-full transition-colors [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1 [&>span:last-child]:whitespace-nowrap",
          isExactActive && "font-bold text-[#111111] [&>svg]:stroke-[2.5] [&>svg]:text-[#111111]"
        )}
        isActive={isExactActive}
      >
        <Link
          params={{ projectId, tabPath: item.pathSegment }}
          search={(current) => current}
          to="/dashboard/$projectId/$tabPath"
        >
          <Icon />
          <span className={cn(isExactActive && "font-bold text-[#111111]")}>{item.label}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function DashboardNavigationSubFolderItem({
  activeTab,
  depth,
  item,
  projectId
}: {
  activeTab: DashboardTab;
  depth: number;
  item: DashboardNavTreeFolderItem;
  projectId: string;
}) {
  const Icon = item.icon;
  const isBranchActive = isNavigationItemActive(item, activeTab);

  return (
    <Collapsible asChild className="group/collapsible" defaultOpen={isBranchActive}>
      <SidebarMenuSubItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuSubButton
            asChild
            className={cn(
              "transition-colors",
              isBranchActive &&
                "font-bold text-[#111111] [&>svg]:stroke-[2.5] [&>svg]:text-[#111111]"
            )}
            isActive={isBranchActive}
          >
            <button type="button">
              {Icon ? <Icon /> : null}
              <span
                className={cn("whitespace-nowrap", isBranchActive && "font-bold text-[#111111]")}
              >
                {item.label}
              </span>
              <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </button>
          </SidebarMenuSubButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <DashboardNavigationSubItems
            activeTab={activeTab}
            depth={depth + 1}
            items={item.children}
            projectId={projectId}
          />
        </CollapsibleContent>
      </SidebarMenuSubItem>
    </Collapsible>
  );
}

function isNavigationItemActive(item: DashboardNavTreeItem, activeTab: DashboardTab): boolean {
  if (item.type === "link") {
    return item.value === activeTab;
  }

  return item.children.some((child) => isNavigationItemActive(child, activeTab));
}

function getNavigationItemKey(item: DashboardNavTreeItem): string {
  return item.type === "link" ? item.pathSegment : item.label;
}

type DashboardContextDepth = "campaign" | "promotion" | "segment";

function DashboardHeaderContext({
  activeTab,
  projectId
}: {
  activeTab: DashboardTab;
  projectId: string;
}) {
  const contextDepth = getDashboardContextDepth(activeTab);

  if (!contextDepth) {
    return (
      <div className="min-w-0 truncate text-sm font-semibold leading-none tracking-tight text-[#1d1d1f]">
        {getDashboardTabLabel(activeTab)}
      </div>
    );
  }

  return <DashboardSelectionContext depth={contextDepth} projectId={projectId} />;
}

function DashboardSelectionContext({
  depth,
  projectId
}: {
  depth: DashboardContextDepth;
  projectId: string;
}) {
  const [queryState, setDashboardQueryState] = useDashboardQueryState();
  const query = useMemo(
    () => normalizeDashboardQuery(queryState, projectId),
    [projectId, queryState]
  );
  const mainQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardPageResource("main", query, signal),
    queryKey: dashboardPageQueryKey("main", query),
    select: (resource): DashboardMain => resource.data as DashboardMain
  });
  const campaigns = mainQuery.data?.campaigns ?? [];
  const selectedCampaign =
    campaigns.find((campaign) => campaign.campaign_id === query.selectedCampaignId) ?? campaigns[0];
  const selectedCampaignId = selectedCampaign?.campaign_id ?? "";
  const needsPromotionContext = depth === "promotion" || depth === "segment";
  const campaignDetailQuery = useQuery({
    enabled: needsPromotionContext && Boolean(selectedCampaignId),
    queryFn: ({ signal }) => fetchDashboardCampaignDetail(query, selectedCampaignId, signal),
    queryKey: dashboardCampaignDetailQueryKey(query.projectId, selectedCampaignId)
  });
  const campaignDetail = campaignDetailQuery.data;
  const promotions = campaignDetail?.promotions ?? [];
  const selectedPromotion = promotions.find(
    (promotion) => promotion.promotion_id === query.selectedPromotionId
  );
  const selectedPromotionId = selectedPromotion?.promotion_id ?? "";
  const segments = getPromotionSegments(campaignDetail, selectedPromotionId);
  const selectedSegment = segments.find(
    (segment) => segment.segment_id === query.selectedSegmentId
  );

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <DashboardContextSelect
        disabled={campaigns.length === 0}
        label="캠페인"
        onValueChange={(campaignId) => {
          void setDashboardQueryState({
            selectedCampaignId: campaignId,
            selectedPromotionId: "",
            selectedSegmentId: ""
          });
        }}
        placeholder={mainQuery.isLoading ? "캠페인 로딩" : "캠페인 선택"}
        value={selectedCampaign?.campaign_id}
        widthClassName="w-[min(35vw,268px)]"
      >
        {campaigns.map((campaign) => (
          <SelectItem key={campaign.campaign_id} value={campaign.campaign_id}>
            {campaign.campaign_name}
          </SelectItem>
        ))}
      </DashboardContextSelect>

      {needsPromotionContext ? (
        <>
          <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />

          <DashboardContextSelect
            disabled={!campaignDetail || promotions.length === 0}
            label="프로모션"
            onValueChange={(promotionId) => {
              void setDashboardQueryState({
                selectedCampaignId,
                selectedPromotionId: promotionId,
                selectedSegmentId: ""
              });
            }}
            placeholder={campaignDetailQuery.isLoading ? "프로모션 로딩" : "프로모션 선택"}
            value={selectedPromotion?.promotion_id}
            widthClassName="w-[min(28vw,234px)]"
          >
            {promotions.map((promotion) => (
              <SelectItem key={promotion.promotion_id} value={promotion.promotion_id}>
                {promotion.marketing_theme}
              </SelectItem>
            ))}
          </DashboardContextSelect>
        </>
      ) : null}

      {depth === "segment" ? (
        <>
          <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />

          <DashboardContextSelect
            disabled={!selectedPromotion || segments.length === 0}
            label="세그먼트"
            onValueChange={(segmentId) => {
              void setDashboardQueryState({
                selectedCampaignId,
                selectedPromotionId,
                selectedSegmentId: segmentId
              });
            }}
            placeholder="세그먼트 선택"
            value={selectedSegment?.segment_id}
            widthClassName="w-[min(28vw,234px)]"
          >
            {segments.map((segment) => (
              <SelectItem key={segment.segment_id} value={segment.segment_id}>
                {segment.segment_name}
              </SelectItem>
            ))}
          </DashboardContextSelect>
        </>
      ) : null}
    </div>
  );
}

function DashboardContextSelect({
  children,
  disabled,
  label,
  onValueChange,
  placeholder,
  value,
  widthClassName
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string | undefined;
  widthClassName: string;
}) {
  return (
    <Select disabled={disabled} onValueChange={onValueChange} value={value}>
      <SelectTrigger
        className={cn(
          "h-9 min-w-0 rounded-full border-black/10 bg-white px-3 text-sm font-medium text-[#1d1d1f] shadow-none",
          widthClassName
        )}
      >
        <span className="mr-2 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function getDashboardContextDepth(tab: DashboardTab): DashboardContextDepth | null {
  switch (tab) {
    case "campaigns":
    case "campaign-detail":
    case "campaign-metrics":
    case "campaign-flow-map":
      return "campaign";
    case "campaign-promotions":
    case "promotion-metrics":
      return "promotion";
    case "segments":
    case "experiments":
      return "segment";
    default:
      return null;
  }
}

function getPromotionSegments(
  campaignDetail: DashboardCampaignDetail | undefined,
  promotionId: string
) {
  if (!campaignDetail || !promotionId) {
    return [];
  }

  return campaignDetail.segments.filter((segment) => segment.promotion_id === promotionId);
}

function SidebarResizeHandle({
  onDoubleClick,
  onPointerDown
}: {
  onDoubleClick: () => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      aria-label="사이드바 너비 조절"
      className="absolute inset-y-2 right-0 hidden w-3 cursor-col-resize items-center justify-center rounded-sm transition-colors hover:bg-sidebar-accent md:flex group-data-[collapsible=icon]:hidden"
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      type="button"
    >
      <span className="h-8 w-1 rounded-full bg-border" />
    </button>
  );
}

function useResizableSidebarWidth() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_SIDEBAR_WIDTH;
    }

    const storedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return clampSidebarWidth(Number.isFinite(storedWidth) ? storedWidth : DEFAULT_SIDEBAR_WIDTH);
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const resetWidth = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  }, []);

  const handleResizeStart = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      const initialClientX = event.clientX;
      const initialWidth = sidebarWidth;
      const originalCursor = document.body.style.cursor;
      const originalUserSelect = document.body.style.userSelect;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      function handlePointerMove(moveEvent: globalThis.PointerEvent) {
        setSidebarWidth(clampSidebarWidth(initialWidth + moveEvent.clientX - initialClientX));
      }

      function stopResize() {
        document.body.style.cursor = originalCursor;
        document.body.style.userSelect = originalUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopResize);
      }

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", stopResize);
    },
    [sidebarWidth]
  );

  return { handleResizeStart, resetWidth, sidebarWidth };
}

function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

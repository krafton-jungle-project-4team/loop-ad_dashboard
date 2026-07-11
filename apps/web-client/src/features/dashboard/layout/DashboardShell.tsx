import type { DashboardCampaignDetail, DashboardMain } from "@loopad/shared";
import { Button } from "@loopad/ui/shadcn/button";
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
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar
} from "@loopad/ui/shadcn/sidebar";
import { cn } from "@loopad/ui/shadcn/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Home, Megaphone, MoreHorizontal, Route } from "lucide-react";
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
  dashboardNavigationGroups,
  getDashboardTabLabel,
  type DashboardNavTreeLinkItem
} from "../model/dashboard-navigation.js";
import { normalizeDashboardQuery, useDashboardQueryState } from "../model/dashboard-query.js";
import {
  dashboardCampaignDetailQueryKey,
  dashboardPageQueryKey
} from "../model/dashboard-query-keys.js";
import type { DashboardTab } from "../model/dashboard-types.js";
import { ProjectReturnIconLink, ProjectSidebarBrand } from "../ui/project/ProjectSidebarBrand.js";

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
      <Sidebar className="border-r border-black/10" collapsible="offcanvas">
        <SidebarHeader className="p-4">
          <ProjectSidebarBrand projectId={projectId} />
        </SidebarHeader>
        <SidebarContent>
          {dashboardNavigationGroups.map((group) => (
            <SidebarGroup key={group.label}>
              {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
              <SidebarGroupContent>
                <DashboardNavigation
                  activeTab={activeTab}
                  items={group.items}
                  projectId={projectId}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarResizeHandle onDoubleClick={resetWidth} onPointerDown={handleResizeStart} />
        <SidebarRail />
      </Sidebar>

      <SidebarInset className={isFullHeightTab ? "h-svh min-w-0 overflow-hidden" : "min-w-0"}>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-black/10 bg-white/85 px-4 backdrop-blur md:px-6">
          <div className="flex h-full min-w-0 items-center gap-3">
            <ProjectReturnIconLink />
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
              ? "min-h-0 min-w-0 flex-1 overflow-hidden bg-background pb-20 md:pb-0"
              : "min-h-0 min-w-0 flex-1 overflow-auto bg-background pb-20 md:pb-0"
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
        <MobileBottomNavigation activeTab={activeTab} projectId={projectId} />
      </SidebarInset>
    </SidebarProvider>
  );
}

function MobileBottomNavigation({
  activeTab,
  projectId
}: {
  activeTab: DashboardTab;
  projectId: string;
}) {
  const { toggleSidebar } = useSidebar();
  const campaignIsActive = [
    "campaigns",
    "campaign-detail",
    "campaign-metrics",
    "promotions",
    "campaign-promotions",
    "promotion-metrics",
    "segments",
    "experiments"
  ].includes(activeTab);

  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
    >
      <MobileNavigationLink
        active={campaignIsActive}
        icon={<Megaphone aria-hidden="true" />}
        label="캠페인"
        pathSegment="campaigns"
        projectId={projectId}
      />
      <MobileNavigationLink
        active={activeTab === "experiments"}
        icon={<Route aria-hidden="true" />}
        label="실험"
        pathSegment="experiments"
        projectId={projectId}
      />
      <MobileNavigationLink
        active={activeTab === "main"}
        icon={<Home aria-hidden="true" />}
        label="통계"
        pathSegment="statistics"
        projectId={projectId}
      />
      <Button
        aria-label="전체 메뉴 열기"
        className="h-16 rounded-none text-xs text-muted-foreground"
        onClick={toggleSidebar}
        type="button"
        variant="ghost"
      >
        <span className="grid place-items-center gap-1">
          <MoreHorizontal aria-hidden="true" className="size-5" />
          더보기
        </span>
      </Button>
    </nav>
  );
}

function MobileNavigationLink({
  active,
  icon,
  label,
  pathSegment,
  projectId
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  pathSegment: string;
  projectId: string;
}) {
  return (
    <Button
      asChild
      className={cn(
        "h-16 rounded-none text-xs text-muted-foreground",
        active && "bg-primary/[0.06] text-primary"
      )}
      variant="ghost"
    >
      <Link
        aria-current={active ? "page" : undefined}
        params={{ projectId, tabPath: pathSegment }}
        search={(current) => current}
        to="/dashboard/$projectId/$tabPath"
      >
        <span className="grid place-items-center gap-1 [&_svg]:size-5">{icon}</span>
        <span>{label}</span>
      </Link>
    </Button>
  );
}

function DashboardNavigation({
  activeTab,
  items,
  projectId
}: {
  activeTab: DashboardTab;
  items: DashboardNavTreeLinkItem[];
  projectId: string;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <DashboardNavigationLinkItem
          activeTab={activeTab}
          item={item}
          key={item.pathSegment}
          projectId={projectId}
        />
      ))}
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
  const isActive = isSidebarNavigationItemActive(item.value, activeTab);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={cn(
          "rounded-full text-sidebar-foreground/80",
          isActive && "font-semibold text-primary"
        )}
        isActive={isActive}
        tooltip={item.label}
      >
        <Link
          params={{ projectId, tabPath: item.pathSegment }}
          search={(current) => current}
          to="/dashboard/$projectId/$tabPath"
        >
          <span className={cn(isActive && "font-semibold text-primary")}>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function isSidebarNavigationItemActive(itemTab: DashboardTab, activeTab: DashboardTab) {
  switch (itemTab) {
    case "campaigns":
      return ["campaigns", "campaign-detail", "campaign-metrics"].includes(activeTab);
    case "promotions":
      return ["promotions", "campaign-promotions", "promotion-metrics"].includes(activeTab);
    default:
      return itemTab === activeTab;
  }
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
      <div className="min-w-0 truncate text-sm font-semibold leading-none tracking-tight text-foreground">
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
  const selectedCampaign = campaigns.find(
    (campaign) => campaign.campaign_id === query.selectedCampaignId
  );
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
    <Select disabled={disabled} onValueChange={onValueChange} value={value ?? ""}>
      <SelectTrigger
        className={cn(
          "h-9 min-w-0 rounded-full border-black/10 bg-white px-3 text-sm font-medium text-foreground shadow-none",
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
    case "promotions":
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

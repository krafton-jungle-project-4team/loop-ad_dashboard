import type { DashboardEntitySearchResult, DataExplorerAiChatCurrentResult } from "@loopad/shared";
import { Alert, AlertDescription } from "@loopad/ui/shadcn/alert";
import { Button } from "@loopad/ui/shadcn/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@loopad/ui/shadcn/resizable";
import { Separator } from "@loopad/ui/shadcn/separator";
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
  SidebarSeparator,
  SidebarTrigger,
  useSidebar
} from "@loopad/ui/shadcn/sidebar";
import { cn } from "@loopad/ui/shadcn/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bot, Home, ListChecks, Megaphone, MoreHorizontal, Route, X } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode
} from "react";
import {
  ChatKitQueryPanel,
  type DataExplorerChatKitQueryEffect
} from "../../data-explorer/components/ChatKitQueryPanel.js";
import {
  dashboardNavigationGroups,
  getDashboardNavigationSearch,
  getDashboardTabLabel,
  type DashboardNavTreeLinkItem
} from "../model/dashboard-navigation.js";
import { useDashboardQueryState } from "../model/dashboard-query.js";
import { entitySearchResultToDashboardPatch } from "../model/entity-search-navigation.js";
import type { DashboardTab } from "../model/dashboard-types.js";
import { OnboardingWorkspaceLayout } from "../ui/onboarding/OnboardingWorkspaceLayout.js";
import { useProjectOnboarding } from "../ui/onboarding/ProjectOnboardingProvider.js";
import { ProjectReturnIconLink, ProjectSidebarBrand } from "../ui/project/ProjectSidebarBrand.js";
import { GlobalEntitySearch } from "../ui/search/GlobalEntitySearch.js";
import {
  DashboardAssistantProvider,
  type DashboardAssistantContextValue
} from "./DashboardAssistantContext.js";
import { DashboardHeaderSlotProvider } from "./DashboardHeaderSlot.js";

const DEFAULT_SIDEBAR_WIDTH = 256;
const MAX_SIDEBAR_WIDTH = 360;
const MIN_SIDEBAR_WIDTH = 224;
const SIDEBAR_WIDTH_STORAGE_KEY = "loopad.dashboard.sidebarWidth";
const COMPACT_VIEWPORT_MEDIA_QUERY = "(max-width: 1023px)";

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
  const { isDashboardUnlocked, isLoading, isTabAllowed, stage } = useProjectOnboarding();
  const [assistantCurrentResult, setAssistantCurrentResult] =
    useState<DataExplorerAiChatCurrentResult | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [isAssistantPanelOpen, setIsAssistantPanelOpen] = useState(false);
  const [headerSlotElement, setHeaderSlotElement] = useState<HTMLDivElement | null>(null);
  const [dashboardQuery] = useDashboardQueryState();
  const isCompactViewport = useCompactViewport();
  const queryEffectListeners = useRef(new Set<(effect: DataExplorerChatKitQueryEffect) => void>());
  const isCanvasTab = activeTab === "dataExplorer" || activeTab === "campaign-flow-map";
  // Temporary rollout: expose the assistant only while choosing segment candidates.
  const isAssistantAvailable =
    activeTab === "campaigns" &&
    dashboardQuery.promotionView === "manage" &&
    (dashboardQuery.segmentView === "manage" || dashboardQuery.segmentView === "recommendations") &&
    Boolean(dashboardQuery.selectedCampaignId) &&
    Boolean(dashboardQuery.selectedPromotionId) &&
    !dashboardQuery.selectedSegmentId;
  const isAssistantVisible = isAssistantAvailable && isAssistantPanelOpen;

  useEffect(() => {
    if (!isAssistantAvailable) {
      setIsAssistantPanelOpen(false);
    }
  }, [isAssistantAvailable]);

  const subscribeToQueryEffects = useCallback(
    (listener: (effect: DataExplorerChatKitQueryEffect) => void) => {
      queryEffectListeners.current.add(listener);

      return () => {
        queryEffectListeners.current.delete(listener);
      };
    },
    []
  );

  const assistantContextValue = useMemo<DashboardAssistantContextValue>(
    () => ({
      publishCurrentResult: setAssistantCurrentResult,
      subscribeToQueryEffects
    }),
    [subscribeToQueryEffects]
  );

  const handleAssistantQueryRun = useCallback((effect: DataExplorerChatKitQueryEffect) => {
    setAssistantError(null);
    queryEffectListeners.current.forEach((listener) => listener(effect));
  }, []);

  const dashboardContent = (
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
            : "mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-6 md:px-8 lg:py-8"
        }
      >
        <OnboardingWorkspaceLayout activeTab={activeTab}>{children}</OnboardingWorkspaceLayout>
      </div>
    </main>
  );

  const assistantPanel = (
    <DashboardAssistantPanel
      currentResult={assistantCurrentResult}
      error={assistantError}
      onClose={() => setIsAssistantPanelOpen(false)}
      onError={setAssistantError}
      onQueryRun={handleAssistantQueryRun}
      projectId={projectId}
    />
  );

  return (
    <DashboardHeaderSlotProvider value={headerSlotElement}>
      <DashboardAssistantProvider value={assistantContextValue}>
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
              {dashboardNavigationGroups.map((group, index) => (
                <Fragment key={group.items[0]?.pathSegment ?? group.label}>
                  {index > 0 ? <SidebarSeparator /> : null}
                  <SidebarGroup>
                    {group.label ? <SidebarGroupLabel>{group.label}</SidebarGroupLabel> : null}
                    <SidebarGroupContent>
                      <DashboardNavigation
                        activeTab={activeTab}
                        isTabAllowed={isTabAllowed}
                        items={group.items}
                        projectId={projectId}
                      />
                    </SidebarGroupContent>
                  </SidebarGroup>
                </Fragment>
              ))}
            </SidebarContent>
            <SidebarResizeHandle onDoubleClick={resetWidth} onPointerDown={handleResizeStart} />
            <SidebarRail />
          </Sidebar>

          <SidebarInset className="h-svh min-w-0 overflow-hidden">
            <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-black/10 bg-white/85 px-4 backdrop-blur md:px-6">
              <div className="flex h-full min-w-0 flex-1 items-center gap-3">
                <ProjectReturnIconLink />
                <SidebarTrigger className="-ml-1" />
                <div className="flex h-6 items-center">
                  <Separator className="h-full" orientation="vertical" />
                </div>
                <div className="min-w-0 flex-1 empty:hidden" ref={setHeaderSlotElement} />
                {isDashboardUnlocked ? (
                  <DashboardGlobalSearch projectId={projectId} />
                ) : isLoading ? (
                  <div className="min-w-0 truncate text-sm font-semibold leading-none tracking-tight text-foreground">
                    {getDashboardTabLabel(activeTab)}
                  </div>
                ) : stage === "welcome" ? (
                  <div className="min-w-0 truncate text-sm font-semibold leading-none tracking-tight text-foreground">
                    프로젝트 시작
                  </div>
                ) : (
                  <div className="min-w-0 truncate text-sm font-semibold leading-none tracking-tight text-foreground">
                    {getDashboardTabLabel(activeTab)}
                  </div>
                )}
              </div>
            </header>

            <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
              {isCompactViewport ? (
                <>
                  {dashboardContent}
                  {isAssistantVisible ? (
                    <div className="absolute inset-0 z-40 min-h-0 min-w-0">{assistantPanel}</div>
                  ) : null}
                </>
              ) : (
                <ResizablePanelGroup
                  className="h-full min-h-0 min-w-0 overflow-hidden"
                  id="loopad-dashboard-assistant-shell"
                  orientation="horizontal"
                >
                  <ResizablePanel
                    className="flex min-w-0 overflow-hidden"
                    defaultSize={isAssistantVisible ? "68%" : "100%"}
                    minSize="360px"
                  >
                    {dashboardContent}
                  </ResizablePanel>
                  {isAssistantVisible ? (
                    <>
                      <ResizableHandle
                        className="bg-black/10 transition-colors hover:bg-primary/30"
                        withHandle
                      />
                      <ResizablePanel
                        className="min-w-0 overflow-hidden"
                        defaultSize="32%"
                        maxSize="520px"
                        minSize="300px"
                      >
                        {assistantPanel}
                      </ResizablePanel>
                    </>
                  ) : null}
                </ResizablePanelGroup>
              )}

              {isAssistantAvailable && !isAssistantVisible ? (
                <Button
                  aria-controls="loopad-dashboard-assistant-panel"
                  aria-expanded="false"
                  aria-label="AI 도우미 열기"
                  className="absolute bottom-20 right-4 z-30 size-12 rounded-full shadow-lg md:bottom-6 md:right-6"
                  onClick={() => setIsAssistantPanelOpen(true)}
                  size="icon"
                  title="AI 도우미 열기"
                  type="button"
                >
                  <Bot aria-hidden="true" className="size-5" />
                </Button>
              ) : null}
            </div>
            {stage === "welcome" || isAssistantVisible ? null : (
              <MobileBottomNavigation
                activeTab={activeTab}
                isDashboardUnlocked={isDashboardUnlocked}
                isTabAllowed={isTabAllowed}
                projectId={projectId}
              />
            )}
          </SidebarInset>
        </SidebarProvider>
      </DashboardAssistantProvider>
    </DashboardHeaderSlotProvider>
  );
}

function DashboardAssistantPanel({
  currentResult,
  error,
  onClose,
  onError,
  onQueryRun,
  projectId
}: {
  currentResult: DataExplorerAiChatCurrentResult | null;
  error: string | null;
  onClose: () => void;
  onError: (message: string) => void;
  onQueryRun: (effect: DataExplorerChatKitQueryEffect) => void;
  projectId: string;
}) {
  return (
    <aside
      aria-labelledby="loopad-dashboard-assistant-title"
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white shadow-[-8px_0_24px_rgba(15,23,42,0.06)]"
      id="loopad-dashboard-assistant-panel"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-black/10 px-4">
        <Bot aria-hidden="true" className="size-4 text-primary" />
        <h2
          className="text-xs font-semibold uppercase tracking-wide text-slate-600"
          id="loopad-dashboard-assistant-title"
        >
          AI 도우미
        </h2>
        <Button
          aria-label="AI 도우미 닫기"
          className="ml-auto"
          onClick={onClose}
          size="icon-sm"
          title="AI 도우미 닫기"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" />
        </Button>
      </div>
      {error ? (
        <Alert className="m-3 w-auto shrink-0" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="min-h-0 flex-1">
        <ChatKitQueryPanel
          currentResult={currentResult}
          key={projectId}
          onError={onError}
          onQueryRun={onQueryRun}
          projectId={projectId}
          showTitle={false}
        />
      </div>
    </aside>
  );
}

function DashboardGlobalSearch({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const [, setDashboardQueryState] = useDashboardQueryState();

  const handleResultSelect = async (result: DashboardEntitySearchResult) => {
    await setDashboardQueryState(entitySearchResultToDashboardPatch(result));
    await navigate({
      params: { projectId, tabPath: "campaigns" },
      search: (current) => current,
      to: "/dashboard/$projectId/$tabPath"
    });
  };

  return (
    <GlobalEntitySearch
      className="ml-auto w-full max-w-2xl"
      onResultSelect={(result) => void handleResultSelect(result)}
      projectId={projectId}
    />
  );
}

function MobileBottomNavigation({
  activeTab,
  isDashboardUnlocked,
  isTabAllowed,
  projectId
}: {
  activeTab: DashboardTab;
  isDashboardUnlocked: boolean;
  isTabAllowed: (tab: DashboardTab) => boolean;
  projectId: string;
}) {
  const { toggleSidebar } = useSidebar();
  const campaignIsActive = [
    "campaigns",
    "campaign-metrics",
    "promotions",
    "campaign-promotions",
    "promotion-metrics",
    "segments"
  ].includes(activeTab);

  const primaryItems = isDashboardUnlocked
    ? [
        {
          active: campaignIsActive,
          allowed: true,
          icon: <Megaphone aria-hidden="true" />,
          label: "캠페인",
          pathSegment: "campaigns"
        },
        {
          active: activeTab === "experiments",
          allowed: true,
          icon: <Route aria-hidden="true" />,
          label: "실험",
          pathSegment: "experiments"
        },
        {
          active: activeTab === "main",
          allowed: true,
          icon: <Home aria-hidden="true" />,
          label: "통계",
          pathSegment: "statistics"
        }
      ]
    : [
        {
          active: activeTab === "sdk",
          allowed: isTabAllowed("sdk"),
          icon: <ListChecks aria-hidden="true" />,
          label: "이벤트 설정",
          pathSegment: "sdk"
        },
        {
          active: activeTab === "campaigns",
          allowed: isTabAllowed("campaigns"),
          icon: <Megaphone aria-hidden="true" />,
          label: "캠페인",
          pathSegment: "campaigns"
        }
      ];

  return (
    <nav
      aria-label="모바일 주요 메뉴"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 grid border-t bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden",
        isDashboardUnlocked ? "grid-cols-4" : "grid-cols-3"
      )}
    >
      {primaryItems.map((item) => (
        <MobileNavigationLink
          active={item.active}
          allowed={item.allowed}
          icon={item.icon}
          key={item.pathSegment}
          label={item.label}
          pathSegment={item.pathSegment}
          projectId={projectId}
        />
      ))}
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
  allowed,
  icon,
  label,
  pathSegment,
  projectId
}: {
  active: boolean;
  allowed: boolean;
  icon: ReactNode;
  label: string;
  pathSegment: string;
  projectId: string;
}) {
  const content = (
    <>
      <span className="grid place-items-center gap-1 [&_svg]:size-5">{icon}</span>
      <span>{label}</span>
    </>
  );

  if (!allowed) {
    return (
      <Button
        aria-label={`${label} (아직 사용할 수 없음)`}
        className="h-16 rounded-none text-xs text-muted-foreground"
        disabled
        type="button"
        variant="ghost"
      >
        {content}
      </Button>
    );
  }

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
        {content}
      </Link>
    </Button>
  );
}

function DashboardNavigation({
  activeTab,
  isTabAllowed,
  items,
  projectId
}: {
  activeTab: DashboardTab;
  isTabAllowed: (tab: DashboardTab) => boolean;
  items: DashboardNavTreeLinkItem[];
  projectId: string;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <DashboardNavigationLinkItem
          activeTab={activeTab}
          isAllowed={isTabAllowed(item.value)}
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
  isAllowed,
  item,
  projectId
}: {
  activeTab: DashboardTab;
  isAllowed: boolean;
  item: DashboardNavTreeLinkItem;
  projectId: string;
}) {
  const isActive = isSidebarNavigationItemActive(item.value, activeTab);

  if (!isAllowed) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          aria-label={`${item.label} (아직 사용할 수 없음)`}
          className="rounded-full text-sidebar-foreground/45"
          disabled
          tooltip={item.label}
        >
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

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
          search={(current) => getDashboardNavigationSearch(item.value, current)}
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
      return ["campaigns", "campaign-metrics"].includes(activeTab);
    case "promotions":
      return ["promotions", "campaign-promotions", "promotion-metrics"].includes(activeTab);
    default:
      return itemTab === activeTab;
  }
}

function SidebarResizeHandle({
  onDoubleClick,
  onPointerDown
}: {
  onDoubleClick: () => void;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <Button
      aria-label="사이드바 너비 조절"
      className="absolute inset-y-2 right-0 hidden h-auto w-3 cursor-col-resize rounded-sm px-0 hover:bg-sidebar-accent md:flex group-data-[collapsible=icon]:hidden"
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      size="icon-xs"
      type="button"
      variant="ghost"
    >
      <span className="h-8 w-1 rounded-full bg-border" />
    </Button>
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

function useCompactViewport() {
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? false
      : window.matchMedia(COMPACT_VIEWPORT_MEDIA_QUERY).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_VIEWPORT_MEDIA_QUERY);
    const handleChange = () => setIsCompactViewport(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isCompactViewport;
}

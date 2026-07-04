import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@loopad/ui/shadcn/breadcrumb";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from "@loopad/ui/shadcn/sidebar";
import { cn } from "@loopad/ui/shadcn/utils";
import { Link } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode
} from "react";
import {
  dashboardNavigationTree,
  getDashboardTabLabel,
  type DashboardNavTreeItem
} from "../model/dashboard-navigation.js";
import type { DashboardTab } from "../model/dashboard-types.js";

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
  const isDataExplorer = activeTab === "dataExplorer";

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
          <BrandBlock />
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

      <SidebarInset className={isDataExplorer ? "h-svh min-w-0 overflow-hidden" : "min-w-0"}>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-black/10 bg-white/85 px-4 backdrop-blur md:px-6">
          <div className="flex h-full min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <div className="flex h-6 items-center">
              <Separator className="h-full" orientation="vertical" />
            </div>
            <DashboardBreadcrumbs projectId={projectId} tab={activeTab} />
          </div>
        </header>

        <main
          className={
            isDataExplorer
              ? "min-h-0 min-w-0 flex-1 overflow-hidden bg-[#f5f5f7]"
              : "min-w-0 flex-1 overflow-auto bg-[#f5f5f7]"
          }
        >
          <div
            className={
              isDataExplorer
                ? "h-full min-h-0 w-full"
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

function BrandBlock() {
  return (
    <div className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-white">
        <Gauge size={18} />
      </div>
      <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
          loop-ad
        </span>
        <span className="truncate text-xs text-muted-foreground">Dashboard</span>
      </div>
    </div>
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
      {dashboardNavigationTree.map((item) => {
        const Icon = item.icon;
        const isActive = isNavigationItemActive(item, activeTab);

        return (
          <SidebarMenuItem key={item.label}>
            <SidebarMenuButton
              asChild
              className={
                isActive
                  ? "rounded-full bg-[#0066cc] text-white hover:bg-[#0066cc] hover:text-white data-[active=true]:bg-[#0066cc] data-[active=true]:text-white"
                  : "rounded-full text-sidebar-foreground/80"
              }
              isActive={isActive}
              tooltip={item.label}
            >
              <Link
                params={{ projectId, tabPath: item.pathSegment ?? "main" }}
                to="/dashboard/$projectId/$tabPath"
              >
                {Icon ? <Icon /> : null}
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
            {item.children ? (
              <DashboardNavigationSubItems
                activeTab={activeTab}
                items={item.children}
                projectId={projectId}
              />
            ) : null}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function DashboardNavigationSubItems({
  activeTab,
  items,
  projectId
}: {
  activeTab: DashboardTab;
  items: DashboardNavTreeItem[];
  projectId: string;
}) {
  return (
    <SidebarMenuSub>
      {items.map((item) => {
        const isExactActive = activeTab === item.value;
        const isBranchActive = isNavigationItemActive(item, activeTab);

        return (
          <SidebarMenuSubItem key={item.label}>
            <SidebarMenuSubButton
              asChild
              className={cn(
                "relative transition-colors",
                isExactActive &&
                  "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                !isExactActive && isBranchActive && "bg-sidebar-accent/60 text-sidebar-foreground"
              )}
              isActive={isExactActive}
            >
              <Link
                params={{ projectId, tabPath: item.pathSegment ?? "main" }}
                to="/dashboard/$projectId/$tabPath"
              >
                {isExactActive ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-sidebar-primary"
                  />
                ) : null}
                <span>{item.label}</span>
              </Link>
            </SidebarMenuSubButton>
            {item.children ? (
              <DashboardNavigationSubItems
                activeTab={activeTab}
                items={item.children}
                projectId={projectId}
              />
            ) : null}
          </SidebarMenuSubItem>
        );
      })}
    </SidebarMenuSub>
  );
}

function isNavigationItemActive(item: DashboardNavTreeItem, activeTab: DashboardTab): boolean {
  return item.value === activeTab || Boolean(item.children?.some((child) => isNavigationItemActive(child, activeTab)));
}

function DashboardBreadcrumbs({ projectId, tab }: { projectId: string; tab: DashboardTab }) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="min-w-0 flex-nowrap text-xs">
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink asChild className="text-xs text-muted-foreground hover:text-[#0066cc]">
            <Link params={{ projectId, tabPath: "main" }} to="/dashboard/$projectId/$tabPath">
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden sm:inline-flex" />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate text-sm font-semibold leading-none tracking-tight text-[#1d1d1f]">
            {projectId} · {getDashboardTabLabel(tab)}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
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

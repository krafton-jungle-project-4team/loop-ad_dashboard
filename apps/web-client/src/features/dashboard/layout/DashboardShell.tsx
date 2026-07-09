import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@loopad/ui/shadcn/breadcrumb";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@loopad/ui/shadcn/collapsible";
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
import { ChevronRight } from "lucide-react";
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
  type DashboardNavTreeFolderItem,
  type DashboardNavTreeItem,
  type DashboardNavTreeLinkItem
} from "../model/dashboard-navigation.js";
import type { DashboardTab } from "../model/dashboard-types.js";
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
            <DashboardBreadcrumbs projectId={projectId} tab={activeTab} />
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
          isActive &&
            "bg-[#0066cc] text-white hover:bg-[#0066cc] hover:text-white data-[active=true]:bg-[#0066cc] data-[active=true]:text-white"
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
          <span>{item.label}</span>
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
              isBranchActive && "bg-sidebar-accent/70 font-medium text-sidebar-accent-foreground"
            )}
            isActive={isBranchActive}
            tooltip={item.label}
          >
            {Icon ? <Icon /> : null}
            <span>{item.label}</span>
            <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
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
    <SidebarMenuSub className={cn(depth > 0 && "mx-2 px-1.5")}>
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
          "relative transition-colors",
          isExactActive && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
        )}
        isActive={isExactActive}
      >
        <Link
          params={{ projectId, tabPath: item.pathSegment }}
          search={(current) => current}
          to="/dashboard/$projectId/$tabPath"
        >
          {isExactActive ? (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-sidebar-primary"
            />
          ) : null}
          <Icon />
          <span>{item.label}</span>
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
              isBranchActive && "bg-sidebar-accent/60 font-medium text-sidebar-foreground"
            )}
            isActive={isBranchActive}
          >
            <button type="button">
              {Icon ? <Icon /> : null}
              <span>{item.label}</span>
              <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
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

function DashboardBreadcrumbs({ projectId, tab }: { projectId: string; tab: DashboardTab }) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="min-w-0 flex-nowrap text-xs">
        <BreadcrumbItem className="hidden sm:inline-flex">
          <BreadcrumbLink asChild className="text-xs text-muted-foreground hover:text-[#0066cc]">
            <Link
              params={{ projectId, tabPath: "main" }}
              search={(current) => current}
              to="/dashboard/$projectId/$tabPath"
            >
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden sm:inline-flex" />
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate text-sm font-semibold leading-none tracking-tight text-[#1d1d1f]">
            {getDashboardTabLabel(tab)}
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

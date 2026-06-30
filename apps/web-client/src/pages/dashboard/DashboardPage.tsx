import { Badge } from "@loopad/ui/shadcn/badge";
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
  SidebarTrigger
} from "@loopad/ui/shadcn/sidebar";
import { Link, Navigate, Outlet, useParams } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { useMemo } from "react";
import {
  dashboardTabs,
  dashboardTitles,
  getDashboardTabByPath
} from "../../features/dashboard/model/dashboard-navigation.js";
import { normalizeDashboardQuery, useDashboardQueryState } from "../../features/dashboard/model/dashboard-query.js";
import type { DashboardTab } from "../../features/dashboard/model/dashboard-types.js";
import { useSuspenseDashboardResources } from "../../features/dashboard/model/use-dashboard-resources.js";
import { renderDashboardPanel } from "../../features/dashboard/ui/render-dashboard-panel.js";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";

export function DashboardLayout() {
  const params = useParams({ strict: false }) as { tabPath?: string };
  const tab = getDashboardTabByPath(params.tabPath ?? "") ?? "main";
  const [queryState] = useDashboardQueryState();
  const query = useMemo(() => normalizeDashboardQuery(queryState), [queryState]);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="p-3">
          <BrandBlock />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>분석 화면</SidebarGroupLabel>
            <SidebarGroupContent>
              <DashboardNavigation activeTab={tab} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{dashboardTitles[tab]}</h1>
          </div>
          <Badge variant={query.projectId ? "secondary" : "destructive"}>
            {query.projectId || "projectId 필요"}
          </Badge>
        </header>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto grid w-full max-w-[1360px] gap-6 px-4 py-6 md:px-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function DashboardPage() {
  const params = useParams({ strict: false }) as { tabPath?: string };
  const tab = getDashboardTabByPath(params.tabPath ?? "");
  const [queryState] = useDashboardQueryState();
  const query = useMemo(() => normalizeDashboardQuery(queryState), [queryState]);

  if (!tab) {
    return <Navigate params={{ tabPath: "main" }} replace to="/dashboard/$tabPath" />;
  }

  if (!query.projectId) {
    return (
      <Alert>
        <AlertTitle>조회 컨텍스트가 필요합니다</AlertTitle>
        <AlertDescription>URL에 projectId를 명시해주세요.</AlertDescription>
      </Alert>
    );
  }

  return <DashboardResourcePanel query={query} tab={tab} />;
}

function DashboardResourcePanel({
  query,
  tab
}: {
  query: ReturnType<typeof normalizeDashboardQuery>;
  tab: DashboardTab;
}) {
  const { data } = useSuspenseDashboardResources(tab, query);

  return renderDashboardPanel(data);
}

function BrandBlock() {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <Gauge size={18} />
      </div>
      <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-medium">loop-ad</span>
        <span className="truncate text-xs text-muted-foreground">Dashboard</span>
      </div>
    </div>
  );
}

function DashboardNavigation({ activeTab }: { activeTab: DashboardTab }) {
  return (
    <SidebarMenu>
      {dashboardTabs.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.value;

        return (
          <SidebarMenuItem key={item.value}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
              <Link to="/dashboard/$tabPath" params={{ tabPath: item.pathSegment }}>
                <Icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

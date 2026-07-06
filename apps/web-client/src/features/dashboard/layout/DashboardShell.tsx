import type { DashboardCreateProjectRequest, DashboardProject } from "@loopad/shared";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@loopad/ui/shadcn/breadcrumb";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@loopad/ui/shadcn/dialog";
import { Field, FieldLabel } from "@loopad/ui/shadcn/field";
import { Input } from "@loopad/ui/shadcn/input";
import { Separator } from "@loopad/ui/shadcn/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Gauge, Plus, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  forwardRef,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type PointerEvent,
  type ReactNode
} from "react";
import {
  createDashboardProject,
  deleteDashboardProject,
  fetchDashboardProjects
} from "../api/dashboard-api.js";
import {
  dashboardNavigationTree,
  getDashboardTabLabel,
  type DashboardNavTreeItem
} from "../model/dashboard-navigation.js";
import { dashboardProjectsQueryKey } from "../model/dashboard-query-keys.js";
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
  const isCanvasTab = activeTab === "dataExplorer" || activeTab === "campaign-flow-map";

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
          <ProjectManagementDialog projectId={projectId} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>분석 화면</SidebarGroupLabel>
            <SidebarGroupContent>
              <DashboardNavigation activeTab={activeTab} projectId={projectId} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <CampaignShortcut activeTab={activeTab} projectId={projectId} />
        </SidebarFooter>
        <SidebarResizeHandle onDoubleClick={resetWidth} onPointerDown={handleResizeStart} />
        <SidebarRail />
      </Sidebar>

      <SidebarInset className={isCanvasTab ? "h-svh min-w-0 overflow-hidden" : "min-w-0"}>
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
              : "min-w-0 flex-1 overflow-auto bg-[#f5f5f7]"
          }
        >
          <div
            className={
              isCanvasTab
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

type ProjectFormState = {
  domain: string;
  industry: string;
  project_id: string;
  project_name: string;
  write_key: string;
};

const emptyProjectForm: ProjectFormState = {
  domain: "hotel-booking.local",
  industry: "hotel_booking",
  project_id: "",
  project_name: "",
  write_key: ""
};

function ProjectManagementDialog({ projectId }: { projectId: string }) {
  const [form, setForm] = useState<ProjectFormState>(emptyProjectForm);
  const [open, setOpen] = useState(false);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({
    enabled: open,
    queryFn: ({ signal }) => fetchDashboardProjects(signal),
    queryKey: dashboardProjectsQueryKey()
  });
  const projects = projectsQuery.data?.projects ?? [];
  const createProjectMutation = useMutation({
    mutationFn: createDashboardProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setForm(emptyProjectForm);
      setPendingDeleteProjectId(null);
      void navigate({
        params: { projectId: project.project_id, tabPath: "main" },
        to: "/dashboard/$projectId/$tabPath"
      });
    }
  });
  const deleteProjectMutation = useMutation({
    mutationFn: deleteDashboardProject,
    onSuccess: async (_result, deletedProjectId) => {
      const projectList = await fetchDashboardProjects();
      queryClient.setQueryData(dashboardProjectsQueryKey(), projectList);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setPendingDeleteProjectId(null);

      if (deletedProjectId === projectId) {
        const nextProject = projectList.projects[0];
        if (nextProject) {
          void navigate({
            params: { projectId: nextProject.project_id, tabPath: "main" },
            replace: true,
            to: "/dashboard/$projectId/$tabPath"
          });
        }
      }
    }
  });

  function handleProjectInputChange(field: keyof ProjectFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const writeKey = form.write_key.trim();
    const requestBody: DashboardCreateProjectRequest = {
      domain: form.domain.trim(),
      industry: form.industry.trim(),
      project_id: form.project_id.trim(),
      project_name: form.project_name.trim(),
      status: "active"
    };
    if (writeKey) {
      requestBody.write_key = writeKey;
    }

    createProjectMutation.mutate(requestBody);
  }

  function handleDeleteProject(project: DashboardProject) {
    if (projects.length <= 1) {
      return;
    }

    if (pendingDeleteProjectId === project.project_id) {
      deleteProjectMutation.mutate(project.project_id);
      return;
    }

    setPendingDeleteProjectId(project.project_id);
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setPendingDeleteProjectId(null);
        }
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <BrandBlock />
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>프로젝트 관리</DialogTitle>
          <DialogDescription>대시보드에서 사용할 프로젝트를 생성하거나 삭제합니다.</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3 rounded-lg border border-black/10 p-3"
          onSubmit={handleCreateProject}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="project-id">프로젝트 ID</FieldLabel>
              <Input
                autoComplete="off"
                id="project-id"
                onChange={(event) => handleProjectInputChange("project_id", event.target.value)}
                placeholder="project_demo_hotel"
                required
                value={form.project_id}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-name">프로젝트 이름</FieldLabel>
              <Input
                autoComplete="off"
                id="project-name"
                onChange={(event) =>
                  handleProjectInputChange("project_name", event.target.value)
                }
                placeholder="데모 호텔"
                required
                value={form.project_name}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-domain">도메인</FieldLabel>
              <Input
                autoComplete="off"
                id="project-domain"
                onChange={(event) => handleProjectInputChange("domain", event.target.value)}
                required
                value={form.domain}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-industry">산업군</FieldLabel>
              <Input
                autoComplete="off"
                id="project-industry"
                onChange={(event) => handleProjectInputChange("industry", event.target.value)}
                required
                value={form.industry}
              />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="project-write-key">쓰기 키</FieldLabel>
              <Input
                autoComplete="off"
                id="project-write-key"
                onChange={(event) => handleProjectInputChange("write_key", event.target.value)}
                placeholder="비워두면 자동 생성"
                value={form.write_key}
              />
            </Field>
          </div>

          {createProjectMutation.isError ? (
            <p className="text-sm text-destructive">
              {toErrorMessage(createProjectMutation.error)}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button disabled={createProjectMutation.isPending} type="submit">
              <Plus />
              {createProjectMutation.isPending ? "생성 중" : "프로젝트 생성"}
            </Button>
          </div>
        </form>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#1d1d1f]">프로젝트 목록</h3>
            {projectsQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">불러오는 중</span>
            ) : null}
          </div>

          <div className="max-h-64 overflow-y-auto rounded-lg border border-black/10">
            {projectsQuery.isError ? (
              <div className="p-3 text-sm text-destructive">
                {toErrorMessage(projectsQuery.error)}
              </div>
            ) : projects.length > 0 ? (
              <div className="divide-y divide-black/10">
                {projects.map((project) => {
                  const isCurrentProject = project.project_id === projectId;
                  const isDeleting =
                    deleteProjectMutation.isPending &&
                    deleteProjectMutation.variables === project.project_id;
                  const isPendingDelete = pendingDeleteProjectId === project.project_id;
                  const deleteDisabled = projects.length <= 1 || isDeleting;

                  return (
                    <div
                      className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      key={project.project_id}
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[#1d1d1f]">
                            {project.project_name}
                          </span>
                          {isCurrentProject ? (
                            <span className="rounded-full bg-[#0066cc]/10 px-2 py-0.5 text-xs font-semibold text-[#0066cc]">
                              현재
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {project.project_id} · {project.domain}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant={isCurrentProject ? "secondary" : "outline"}
                        >
                          <Link
                            params={{ projectId: project.project_id, tabPath: "main" }}
                            to="/dashboard/$projectId/$tabPath"
                          >
                            열기
                          </Link>
                        </Button>
                        <Button
                          aria-label={`${project.project_name} 삭제`}
                          disabled={deleteDisabled}
                          onClick={() => handleDeleteProject(project)}
                          size={isPendingDelete ? "sm" : "icon-sm"}
                          type="button"
                          variant="destructive"
                        >
                          {isPendingDelete ? "삭제 확인" : <Trash2 />}
                        </Button>
                        {isPendingDelete ? (
                          <Button
                            onClick={() => setPendingDeleteProjectId(null)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            취소
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 text-sm text-muted-foreground">등록된 프로젝트가 없습니다.</div>
            )}
          </div>

          {deleteProjectMutation.isError ? (
            <p className="text-sm text-destructive">
              {toErrorMessage(deleteProjectMutation.error)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              닫기
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const BrandBlock = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(
  function BrandBlock({ className, ...props }, ref) {
    return (
      <button
        aria-label="프로젝트 관리 열기"
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc]/40 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0",
          className
        )}
        ref={ref}
        title="프로젝트 관리"
        type="button"
        {...props}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-white">
          <Gauge size={18} />
        </div>
        <div className="grid min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
          <span className="truncate text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
            loop-ad
          </span>
          <span className="truncate text-xs text-muted-foreground">대시보드</span>
        </div>
      </button>
    );
  }
);

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
                search={(current) => current}
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

function CampaignShortcut({
  activeTab,
  projectId
}: {
  activeTab: DashboardTab;
  projectId: string;
}) {
  const isActive = activeTab === "campaigns";

  return (
    <Link
      aria-label="캠페인"
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-2xl border border-black/10 bg-white px-3 text-sm font-semibold text-[#1d1d1f] shadow-sm transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:px-0",
        isActive && "border-[#0066cc] bg-[#0066cc] text-white hover:bg-[#0066cc]"
      )}
      params={{ projectId, tabPath: "campaigns" }}
      search={(current) => current}
      to="/dashboard/$projectId/$tabPath"
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full bg-[#0066cc] text-sm font-bold text-white",
          isActive && "bg-white text-[#0066cc]"
        )}
      >
        C
      </span>
      <span className="truncate group-data-[collapsible=icon]:hidden">캠페인</span>
    </Link>
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
                search={(current) => current}
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

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
}

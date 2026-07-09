import type { DashboardProject } from "@loopad/shared";
import { Avatar, AvatarFallback } from "@loopad/ui/shadcn/avatar";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent } from "@loopad/ui/shadcn/card";
import { Skeleton } from "@loopad/ui/shadcn/skeleton";
import { cn } from "@loopad/ui/shadcn/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gauge, Plus } from "lucide-react";
import { fetchDashboardProjects } from "../../api/dashboard-api.js";
import { dashboardProjectsQueryKey } from "../../model/dashboard-query-keys.js";
import { ProjectManagementDialog } from "./ProjectManagementDialog.js";

const PROJECT_ACCENT_CLASSES = [
  "bg-[#0066cc]",
  "bg-[#34c759]",
  "bg-[#ff9f0a]",
  "bg-[#af52de]",
  "bg-[#ff375f]",
  "bg-[#5e5ce6]"
];

export function ProjectSelectPage() {
  const projectsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjects(signal),
    queryKey: dashboardProjectsQueryKey()
  });
  const projects = projectsQuery.data?.projects ?? [];

  return (
    <main className="min-h-svh bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-[#0066cc] text-white">
            <Gauge size={20} />
          </div>
          <div className="grid leading-tight">
            <span className="text-lg font-semibold tracking-tight">loop-ad</span>
            <span className="text-xs text-muted-foreground">대시보드</span>
          </div>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-9 py-12 text-center">
          <div className="grid gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              프로젝트를 선택하세요.
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              선택한 프로젝트의 캠페인, 세그먼트, 실험 현황으로 이동합니다.
            </p>
          </div>

          <div className="grid w-full max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {projectsQuery.isLoading ? <ProjectCardSkeletons /> : null}
            {projectsQuery.isError ? (
              <div className="col-span-full rounded-lg border border-destructive/30 bg-white p-4 text-sm text-destructive">
                프로젝트 목록을 불러오지 못했습니다.
              </div>
            ) : null}
            {!projectsQuery.isLoading
              ? projects.map((project, index) => (
                  <ProjectCard index={index} key={project.project_id} project={project} />
                ))
              : null}
            <ProjectManagementDialog
              trigger={
                <button
                  className="group flex min-h-44 items-center justify-center rounded-lg border border-dashed border-black/20 bg-white/70 p-4 text-center transition hover:border-[#0066cc]/50 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc]/40"
                  type="button"
                >
                  <span className="flex size-20 items-center justify-center rounded-lg bg-black/5 text-muted-foreground transition group-hover:bg-[#0066cc]/10 group-hover:text-[#0066cc]">
                    <Plus size={34} />
                  </span>
                </button>
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function ProjectCard({ index, project }: { index: number; project: DashboardProject }) {
  const accentClass = PROJECT_ACCENT_CLASSES[index % PROJECT_ACCENT_CLASSES.length];

  return (
    <Link
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066cc]/40"
      params={{ projectId: project.project_id, tabPath: "main" }}
      to="/dashboard/$projectId/$tabPath"
    >
      <Card className="min-h-44 rounded-lg bg-white p-0 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        <CardContent className="grid h-full gap-3 p-4 text-center">
          <Avatar className="mx-auto size-20 rounded-lg" size="lg">
            <AvatarFallback
              className={cn(
                "rounded-lg text-2xl font-semibold uppercase text-white",
                accentClass
              )}
            >
              {project.project_name.trim().charAt(0) || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 gap-1">
            <span className="truncate text-base font-semibold tracking-tight">
              {project.project_name}
            </span>
            <span className="truncate text-xs text-muted-foreground">{project.domain}</span>
          </div>
          <div className="flex justify-center">
            <Badge
              className="bg-[#0066cc]/10 text-[#0066cc] hover:bg-[#0066cc]/10"
              variant="secondary"
            >
              {project.status === "active" ? "활성" : "비활성"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ProjectCardSkeletons() {
  return Array.from({ length: 4 }, (_, index) => (
    <Card className="min-h-44 rounded-lg bg-white p-0" key={index}>
      <CardContent className="grid gap-3 p-4">
        <Skeleton className="mx-auto size-20 rounded-lg" />
        <Skeleton className="mx-auto h-5 w-24" />
        <Skeleton className="mx-auto h-4 w-32" />
      </CardContent>
    </Card>
  ));
}

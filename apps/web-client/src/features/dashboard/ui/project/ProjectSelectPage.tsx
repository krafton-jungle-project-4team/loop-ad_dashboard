import type { DashboardProject } from "@loopad/shared";
import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { Avatar, AvatarFallback } from "@loopad/ui/shadcn/avatar";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Card, CardContent } from "@loopad/ui/shadcn/card";
import { Skeleton } from "@loopad/ui/shadcn/skeleton";
import { cn } from "@loopad/ui/shadcn/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Gauge, Pencil } from "lucide-react";
import { fetchDashboardProjects } from "../../api/dashboard-api.js";
import { dashboardProjectsQueryKey } from "../../model/dashboard-query-keys.js";
import { ProjectManagementDialog } from "./ProjectManagementDialog.js";

const PROJECT_ACCENT_CLASSES = [
  "bg-[#756a7d]",
  "bg-[#61777c]",
  "bg-[#806f68]",
  "bg-[#68786e]",
  "bg-[#6c7087]",
  "bg-[#806b76]"
];

export function ProjectSelectPage() {
  const projectsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjects(signal),
    queryKey: dashboardProjectsQueryKey()
  });
  const projects = projectsQuery.data?.projects ?? [];

  return (
    <main className="min-h-svh bg-[#28242e] text-[#f7f4f8]">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-[#756a7d] text-white ring-1 ring-white/15">
              <Gauge size={20} />
            </div>
            <div className="grid leading-tight">
              <span className="text-base font-semibold tracking-tight">loop-ad</span>
              <span className="text-[11px] text-white/45">PROJECT MONITORING</span>
            </div>
          </div>
          <Badge
            className="border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.04]"
            variant="outline"
          >
            WORKSPACES
          </Badge>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-8 py-12">
          <div className="grid max-w-3xl gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c6b8cd]">
              Projects / Overview
            </span>
            <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
              어떤 프로젝트를 볼까요?
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/50 sm:text-base">
              프로젝트를 선택하면 캠페인과 실험 현황을 볼 수 있어요.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {projectsQuery.isLoading ? <ProjectCardSkeletons /> : null}
            {projectsQuery.isError ? (
              <Alert className="col-span-full text-left" variant="destructive">
                <AlertTitle>프로젝트를 불러오지 못했어요</AlertTitle>
                <AlertDescription>서버 연결을 확인하고 다시 시도해 주세요.</AlertDescription>
              </Alert>
            ) : null}
            {!projectsQuery.isLoading
              ? projects.map((project, index) => (
                  <ProjectCard index={index} key={project.project_id} project={project} />
                ))
              : null}
            <ProjectManagementDialog
              trigger={
                <Button
                  aria-label="프로젝트 관리"
                  className="group min-h-40 rounded-lg border-dashed border-white/15 bg-white/[0.035] p-4 text-white/75 shadow-none hover:border-[#9688a0] hover:bg-white/[0.065] hover:text-white"
                  type="button"
                  variant="outline"
                >
                  <span className="flex size-12 items-center justify-center rounded-md bg-white/[0.07] text-white/50 ring-1 ring-white/10 transition-colors group-hover:bg-[#756a7d] group-hover:text-white">
                    <Pencil size={22} />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider">
                    프로젝트 관리
                  </span>
                </Button>
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
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a998b2]"
      params={{ projectId: project.project_id }}
      to="/dashboard/$projectId"
    >
      <Card className="min-h-40 border-white/[0.08] bg-[#34303b] p-0 text-[#f7f4f8] shadow-none transition-[border-color,transform,box-shadow] group-hover:-translate-y-0.5 group-hover:border-[#9688a0]/60 group-hover:shadow-[0_10px_30px_rgb(10_8_14_/_0.2)]">
        <CardContent className="grid h-full grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-4 text-left">
          <Avatar className="size-14 rounded-md" size="lg">
            <AvatarFallback
              className={cn("rounded-md text-xl font-semibold uppercase text-white", accentClass)}
            >
              {project.project_name.trim().charAt(0) || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 gap-1.5">
            <span className="truncate text-base font-semibold tracking-tight">
              {project.project_name}
            </span>
            <span className="truncate text-xs text-white/40">{project.domain}</span>
            <Badge
              className="mt-1 bg-white/[0.07] text-[#d2c8d7] hover:bg-white/[0.07]"
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
    <Card className="min-h-40 border-white/[0.08] bg-[#34303b] p-0" key={index}>
      <CardContent className="grid grid-cols-[auto_1fr] items-center gap-4 p-4">
        <Skeleton className="size-14 rounded-md bg-white/[0.07]" />
        <div className="grid gap-3">
          <Skeleton className="h-5 w-24 bg-white/[0.07]" />
          <Skeleton className="h-4 w-32 bg-white/[0.07]" />
        </div>
      </CardContent>
    </Card>
  ));
}

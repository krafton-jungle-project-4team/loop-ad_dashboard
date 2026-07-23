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
import { Pencil } from "lucide-react";
import { fetchDashboardProjects } from "../../api/dashboard-api.js";
import { dashboardProjectsQueryKey } from "../../model/dashboard-query-keys.js";
import { ProjectManagementDialog } from "./ProjectManagementDialog.js";

const PROJECT_ACCENT_CLASSES = [
  "bg-[#8c6f9a]",
  "bg-[#5f7f88]",
  "bg-[#8d716c]",
  "bg-[#6e8173]",
  "bg-[#70789b]",
  "bg-[#8e6e82]"
];

export function ProjectSelectPage() {
  const projectsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjects(signal),
    queryKey: dashboardProjectsQueryKey()
  });
  const projects = projectsQuery.data?.projects ?? [];

  return (
    <main className="min-h-svh bg-[#eee8f3] text-[#2f2635]">
      <div className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between border-b border-[#d8cfe0] pb-4">
          <div className="grid gap-0.5 leading-tight">
            <img alt="LoopAd" className="h-7 w-auto" src="/loop-ad-full.svg" />
            <span className="text-[11px] text-[#786f7f]">PROJECT MONITORING</span>
          </div>
          <Badge
            className="border-[#d1c5da] bg-white/55 text-[#5f5367] hover:bg-white/55"
            variant="outline"
          >
            WORKSPACES
          </Badge>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-8 py-12">
          <div className="grid max-w-3xl gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7d638d]">
              Projects / Overview
            </span>
            <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
              어떤 프로젝트를 볼까요?
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-[#6f6575] sm:text-base">
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
                  className="group min-h-40 rounded-lg border-dashed border-[#cfc2d8] bg-[#f8f5fa] p-4 text-[#5e5365] shadow-none hover:border-[#9e84ad] hover:bg-white hover:text-[#3b3041]"
                  type="button"
                  variant="outline"
                >
                  <span className="flex size-12 items-center justify-center rounded-md bg-[#e3d8ea] text-[#705e79] ring-1 ring-[#d2c5db] transition-colors group-hover:bg-[#8c6f9a] group-hover:text-white">
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
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#896f99]"
      params={{ projectId: project.project_id }}
      to="/dashboard/$projectId"
    >
      <Card className="min-h-40 border-[#d8cfe0] bg-[#fbf9fc] p-0 text-[#2f2635] shadow-none transition-[border-color,transform,box-shadow] group-hover:-translate-y-0.5 group-hover:border-[#a98bb8] group-hover:shadow-[0_12px_30px_rgb(67_46_76_/_0.13)]">
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
            <span className="truncate text-xs text-[#796f7e]">{project.domain}</span>
            <Badge
              className="mt-1 bg-[#eee6f2] text-[#6f577c] hover:bg-[#eee6f2]"
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
    <Card className="min-h-40 border-[#d8cfe0] bg-[#fbf9fc] p-0" key={index}>
      <CardContent className="grid grid-cols-[auto_1fr] items-center gap-4 p-4">
        <Skeleton className="size-14 rounded-md bg-[#ded4e5]" />
        <div className="grid gap-3">
          <Skeleton className="h-5 w-24 bg-[#ded4e5]" />
          <Skeleton className="h-4 w-32 bg-[#ded4e5]" />
        </div>
      </CardContent>
    </Card>
  ));
}

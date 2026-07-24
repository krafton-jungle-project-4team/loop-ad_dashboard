import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { fetchDashboardProjects } from "../../api/dashboard-api.js";
import { dashboardProjectsQueryKey } from "../../model/dashboard-query-keys.js";

export function ProjectSidebarBrand({ projectId }: { projectId: string }) {
  const projectsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjects(signal),
    queryKey: dashboardProjectsQueryKey()
  });
  const currentProject = projectsQuery.data?.projects.find(
    (project) => project.project_id === projectId
  );
  const projectName = currentProject?.project_name ?? "프로젝트";

  return (
    <Link
      aria-label="프로젝트 선택으로 돌아가기"
      className="group flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/50"
      title="프로젝트 선택"
      to="/"
    >
      <ProjectMark />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
        {projectName}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-sidebar-foreground/45 transition-transform group-hover:translate-x-0.5 group-hover:text-sidebar-primary"
      />
    </Link>
  );
}

export function ProjectReturnIconLink() {
  return (
    <Link
      aria-label="프로젝트 선택으로 돌아가기"
      className="group flex size-9 shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:hidden"
      title="프로젝트 선택"
      to="/"
    >
      <ProjectMark />
    </Link>
  );
}

function ProjectMark() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-transparent p-0.5">
      <img alt="" aria-hidden="true" className="h-auto w-full" src="/loop-ad-icon.svg" />
    </span>
  );
}

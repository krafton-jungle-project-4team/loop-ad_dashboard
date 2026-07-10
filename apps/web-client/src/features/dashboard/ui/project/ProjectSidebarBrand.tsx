import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
  const projectDescription = currentProject?.domain ?? "프로젝트 선택으로 돌아가기";

  return (
    <Link
      aria-label="프로젝트 선택으로 돌아가기"
      className="flex w-full items-center rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      title="프로젝트 선택"
      to="/"
    >
      <div className="grid min-w-0 leading-tight">
        <span className="truncate text-[17px] font-semibold tracking-tight text-foreground">
          {projectName}
        </span>
        <span className="truncate text-xs text-muted-foreground">{projectDescription}</span>
      </div>
    </Link>
  );
}

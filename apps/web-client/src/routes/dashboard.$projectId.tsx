import { Alert, AlertDescription, AlertTitle } from "@loopad/ui/shadcn/alert";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Navigate,
  Outlet,
  useLocation,
  useParams
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { fetchDashboardProjects } from "../features/dashboard/api/dashboard-api.js";
import { DashboardShell } from "../features/dashboard/layout/DashboardShell.js";
import { getDashboardTabByPath } from "../features/dashboard/model/dashboard-navigation.js";
import { dashboardProjectsQueryKey } from "../features/dashboard/model/dashboard-query-keys.js";
import type { DashboardTab } from "../features/dashboard/model/dashboard-types.js";
import { LoadingState } from "../features/dashboard/ui/LoadingState.js";
import {
  ProjectOnboardingProvider,
  useProjectOnboarding
} from "../features/dashboard/ui/onboarding/ProjectOnboardingProvider.js";

export const Route = createFileRoute("/dashboard/$projectId")({
  component: DashboardProjectLayout
});

function DashboardProjectLayout() {
  const params = useParams({ strict: false }) as { projectId: string; tabPath?: string };
  const pathname = useLocation({ select: (location) => location.pathname });
  const pathSegment = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const tab = getDashboardTabByPath(pathSegment) ?? "campaigns";

  return (
    <DashboardProjectExistenceGate activeTab={tab} projectId={params.projectId}>
      <ProjectOnboardingProvider projectId={params.projectId}>
        <DashboardProjectAccessGate activeTab={tab} projectId={params.projectId}>
          <Outlet />
        </DashboardProjectAccessGate>
      </ProjectOnboardingProvider>
    </DashboardProjectExistenceGate>
  );
}

function DashboardProjectExistenceGate({
  activeTab,
  children,
  projectId
}: {
  activeTab: DashboardTab;
  children: ReactNode;
  projectId: string;
}) {
  const projectsQuery = useQuery({
    queryFn: ({ signal }) => fetchDashboardProjects(signal),
    queryKey: dashboardProjectsQueryKey()
  });

  if (projectsQuery.isPending) {
    return (
      <main className="min-h-svh bg-background p-6">
        <LoadingState tab={activeTab} />
      </main>
    );
  }

  const projectExists = projectsQuery.data?.projects.some(
    (project) => project.project_id === projectId
  );

  if (projectsQuery.isError || !projectExists) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <Alert className="max-w-lg" variant="destructive">
          <AlertTitle>
            {projectsQuery.isError ? "프로젝트를 확인하지 못했어요" : "프로젝트를 찾지 못했어요"}
          </AlertTitle>
          <AlertDescription className="grid gap-3">
            <span>
              {projectsQuery.isError
                ? "프로젝트 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
                : "삭제되었거나 접근할 수 없는 프로젝트예요. 프로젝트 목록에서 다시 선택해 주세요."}
            </span>
            <Link className="w-fit font-medium underline underline-offset-4" to="/">
              프로젝트 선택으로 돌아가기
            </Link>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return children;
}

function DashboardProjectAccessGate({
  activeTab,
  children,
  projectId
}: {
  activeTab: DashboardTab;
  children: ReactNode;
  projectId: string;
}) {
  const { error, isLoading, isTabAllowed, requiredPathSegment } = useProjectOnboarding();

  if (isLoading) {
    return (
      <DashboardShell activeTab={activeTab} projectId={projectId}>
        <LoadingState tab={activeTab} />
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell activeTab={activeTab} projectId={projectId}>
        {children}
      </DashboardShell>
    );
  }

  if (!isTabAllowed(activeTab) && requiredPathSegment) {
    return (
      <Navigate
        params={{ projectId, tabPath: requiredPathSegment }}
        replace
        search={(current) => current}
        to="/dashboard/$projectId/$tabPath"
      />
    );
  }

  return (
    <DashboardShell activeTab={activeTab} projectId={projectId}>
      {children}
    </DashboardShell>
  );
}

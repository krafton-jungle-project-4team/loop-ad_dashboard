import { createFileRoute, Navigate, Outlet, useLocation, useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { DashboardShell } from "../features/dashboard/layout/DashboardShell.js";
import { getDashboardTabByPath } from "../features/dashboard/model/dashboard-navigation.js";
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
    <ProjectOnboardingProvider projectId={params.projectId}>
      <DashboardProjectAccessGate activeTab={tab} projectId={params.projectId}>
        <Outlet />
      </DashboardProjectAccessGate>
    </ProjectOnboardingProvider>
  );
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

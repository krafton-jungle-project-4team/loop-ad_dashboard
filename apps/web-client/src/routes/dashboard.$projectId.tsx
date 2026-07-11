import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { DashboardShell } from "../features/dashboard/layout/DashboardShell.js";
import { getDashboardTabByPath } from "../features/dashboard/model/dashboard-navigation.js";

export const Route = createFileRoute("/dashboard/$projectId")({
  component: DashboardProjectLayout
});

function DashboardProjectLayout() {
  const params = useParams({ strict: false }) as { projectId: string; tabPath?: string };
  const tab = getDashboardTabByPath(params.tabPath ?? "") ?? "campaigns";

  return (
    <DashboardShell activeTab={tab} projectId={params.projectId}>
      <Outlet />
    </DashboardShell>
  );
}

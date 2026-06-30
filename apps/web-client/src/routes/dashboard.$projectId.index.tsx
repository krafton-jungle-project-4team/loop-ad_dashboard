import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/$projectId/")({
  component: DashboardProjectIndexRoute
});

function DashboardProjectIndexRoute() {
  const { projectId } = Route.useParams();

  return (
    <Navigate params={{ projectId, tabPath: "main" }} replace to="/dashboard/$projectId/$tabPath" />
  );
}

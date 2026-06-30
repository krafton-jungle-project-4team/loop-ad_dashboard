import { createFileRoute, Navigate } from "@tanstack/react-router";
import { defaultDashboardProjectId } from "../features/dashboard/model/dashboard-query.js";

export const Route = createFileRoute("/dashboard/")({
  component: () => (
    <Navigate
      params={{ projectId: defaultDashboardProjectId, tabPath: "main" }}
      replace
      to="/dashboard/$projectId/$tabPath"
    />
  )
});

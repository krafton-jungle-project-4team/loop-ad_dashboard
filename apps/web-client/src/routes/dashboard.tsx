import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "../pages/dashboard/DashboardPage.js";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout
});

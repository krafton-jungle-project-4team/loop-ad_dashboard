import { createFileRoute } from "@tanstack/react-router";
import { ProjectSelectPage } from "../features/dashboard/pages/ProjectSelectPage.js";

export const Route = createFileRoute("/")({
  component: ProjectSelectPage
});

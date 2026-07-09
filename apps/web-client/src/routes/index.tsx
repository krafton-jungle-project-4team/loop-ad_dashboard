import { createFileRoute } from "@tanstack/react-router";
import { ProjectSelectPage } from "../features/dashboard/ui/project/ProjectSelectPage.js";

export const Route = createFileRoute("/")({
  component: ProjectSelectPage
});

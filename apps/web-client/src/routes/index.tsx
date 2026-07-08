import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "../features/dashboard/pages/LoginPage.js";

export const Route = createFileRoute("/")({
  component: LoginPage
});

import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => <Navigate params={{ tabPath: "main" }} replace to="/dashboard/$tabPath" />
});

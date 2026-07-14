import { createFileRoute } from "@tanstack/react-router";
import { createRouteBoundaryOptions } from "../app/route-boundary.js";
import { DeveloperPage } from "../features/dashboard/ui/pages/developer/DeveloperPage.js";

export const Route = createFileRoute("/developer/$projectId")({
  component: DeveloperProjectRoute,
  ...createRouteBoundaryOptions({
    pendingComponent: DeveloperRoutePending,
    title: "개발자 페이지를 불러오지 못했어요"
  })
});

function DeveloperProjectRoute() {
  const { projectId } = Route.useParams();
  return <DeveloperPage projectId={projectId} />;
}

function DeveloperRoutePending() {
  return (
    <main className="grid min-h-svh place-items-center bg-muted/20">
      <p className="text-sm text-muted-foreground">개발자 페이지를 불러오고 있어요.</p>
    </main>
  );
}

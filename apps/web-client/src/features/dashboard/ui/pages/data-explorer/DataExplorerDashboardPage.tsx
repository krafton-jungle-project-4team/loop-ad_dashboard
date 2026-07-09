import { DataExplorerPage } from "../../../../data-explorer/pages/DataExplorerPage.js";

export function DataExplorerDashboardPage({ projectId }: { projectId: string }) {
  return <DataExplorerPage projectId={projectId} />;
}

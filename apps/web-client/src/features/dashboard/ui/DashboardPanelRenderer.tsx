import type { DashboardPageResource } from "../model/dashboard-types.js";
import { MainDashboardPanel } from "./MainDashboardPanel.js";

export function DashboardPanelRenderer({
  resource
}: {
  resource: DashboardPageResource;
}) {
  switch (resource.tab) {
    case "main":
      return <MainDashboardPanel data={resource.data} />;
  }
}

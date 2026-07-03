import type { DashboardPageResource, DashboardQuery } from "../model/dashboard-types.js";
import { FunnelDashboardPanel } from "./FunnelDashboardPanel.js";
import { MainDashboardPanel } from "./MainDashboardPanel.js";

export function DashboardPanelRenderer({
  query,
  resource
}: {
  query: DashboardQuery;
  resource: DashboardPageResource;
}) {
  switch (resource.tab) {
    case "main":
      return <MainDashboardPanel data={resource.data} />;
    case "funnels":
      return <FunnelDashboardPanel data={resource.data} query={query} />;
  }
}

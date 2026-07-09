import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";
import { ExperimentSections } from "./ExperimentSections.js";

export function ExperimentManagementPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return <ExperimentSections data={data} query={query} />;
}

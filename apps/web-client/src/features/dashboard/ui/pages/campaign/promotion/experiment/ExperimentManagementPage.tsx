import type { DashboardMain } from "@loopad/shared";
import type { DashboardQuery } from "../../../../../model/dashboard-types.js";
import { ExperimentComponent } from "./ExperimentComponent.js";

export function ExperimentManagementPage({
  data,
  query
}: {
  data: DashboardMain;
  query: DashboardQuery;
}) {
  return <ExperimentComponent data={data} query={query} />;
}

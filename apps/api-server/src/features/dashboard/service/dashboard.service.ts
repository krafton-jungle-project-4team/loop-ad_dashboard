import { Injectable } from "@nestjs/common";
import type { AiJobKind } from "@loopad/shared";
import { conversion, overview } from "../analytics/reports.js";
import { env } from "../../../infra/env/env.js";
import { projectId } from "../../../infra/http/api-response.js";
import { ClickHouseDashboardDataSource } from "../data-sources/clickhouse-dashboard.data-source.js";
import { DecisionServerDataSource } from "../data-sources/decision-server.data-source.js";
import { PostgresDashboardDataSource } from "../data-sources/postgres-dashboard.data-source.js";

@Injectable()
export class DashboardService {
  constructor(
    private readonly clickHouseDataSource: ClickHouseDashboardDataSource,
    private readonly postgresDataSource: PostgresDashboardDataSource,
    private readonly decisionServerDataSource: DecisionServerDataSource
  ) {}

  async overview(project?: string) {
    const events = await this.clickHouseDataSource.readEvents(projectId(project, env.projectId));
    return overview(events);
  }

  async conversion(project?: string) {
    const events = await this.clickHouseDataSource.readEvents(projectId(project, env.projectId));
    return conversion(events);
  }

  createAiJob(input: { kind: AiJobKind; projectId?: string }) {
    return this.decisionServerDataSource.createJob({
      kind: input.kind,
      projectId: projectId(input.projectId, env.projectId)
    });
  }

  getAiResult(resultId: string) {
    return this.postgresDataSource.getAiResult(resultId);
  }
}

import { Injectable } from "@nestjs/common";
import type { AiJobAccepted, AiJobKind, AiJobResult } from "@loopad/shared";
import { conversion, overview } from "../analytics/reports.js";
import { env } from "../../../infra/env/env.js";
import { projectId } from "../../../infra/http/api-response.js";
import { ClickHouseDashboardDataSource } from "../data-sources/clickhouse-dashboard.data-source.js";
import { DecisionServerDataSource } from "../data-sources/decision-server.data-source.js";
import { PostgresDashboardDataSource } from "../data-sources/postgres-dashboard.data-source.js";

type PendingAiJob = {
  kind: AiJobKind;
  createdAt: string;
};

@Injectable()
export class DashboardService {
  private readonly pendingAiJobs = new Map<string, PendingAiJob>();

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

  async createAiJob(input: { kind: AiJobKind; projectId?: string }): Promise<AiJobAccepted> {
    const accepted = await this.decisionServerDataSource.createJob({
      kind: input.kind,
      projectId: projectId(input.projectId, env.projectId)
    });
    this.pendingAiJobs.set(accepted.resultId, {
      kind: input.kind,
      createdAt: new Date().toISOString()
    });
    return accepted;
  }

  async getAiResult(resultId: string): Promise<AiJobResult | undefined> {
    const result = await this.postgresDataSource.getAiResult(resultId);
    if (result) {
      if (result.status === "completed" || result.status === "failed") {
        this.pendingAiJobs.delete(resultId);
      }
      return result;
    }

    const pendingJob = this.pendingAiJobs.get(resultId);
    if (!pendingJob) {
      return undefined;
    }

    return {
      resultId,
      kind: pendingJob.kind,
      status: "pending",
      createdAt: pendingJob.createdAt
    };
  }
}

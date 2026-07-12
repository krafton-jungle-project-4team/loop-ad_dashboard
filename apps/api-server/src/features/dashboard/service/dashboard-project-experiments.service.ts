import type { DashboardProjectExperimentList } from "@loopad/shared";
import { Inject, Injectable } from "@nestjs/common";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import { DashboardProjectExperimentsReader } from "../repository/index.js";

@Injectable()
export class DashboardProjectExperimentsService {
  constructor(
    @Inject(DashboardProjectExperimentsReader)
    private readonly experimentsReader: DashboardProjectExperimentsReader
  ) {}

  @LogContextScope()
  async list(projectId: string): Promise<DashboardProjectExperimentList> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { projectId });
    const response = await this.experimentsReader.list(projectId);

    log.info("completed", { durationMs: durationMs(startedAt), response });
    return response;
  }
}

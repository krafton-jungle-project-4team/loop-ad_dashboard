import { Inject, Injectable } from "@nestjs/common";
import type { DashboardEntitySearchResponse, DashboardEntitySearchType } from "@loopad/shared";
import { LogContextScope, durationMs, log } from "../../../infra/logger/index.js";
import { DashboardEntitySearchReader } from "../repository/index.js";

@Injectable()
export class DashboardEntitySearchService {
  constructor(
    @Inject(DashboardEntitySearchReader)
    private readonly entitySearchReader: DashboardEntitySearchReader
  ) {}

  @LogContextScope()
  async search(
    projectId: string,
    query: string,
    entityType: DashboardEntitySearchType
  ): Promise<DashboardEntitySearchResponse> {
    const startedAt = Date.now();
    log.assignContext({ projectId });
    log.info("started", { entityType, projectId, query });
    const response = await this.entitySearchReader.search(projectId, query, entityType);

    log.info("completed", { durationMs: durationMs(startedAt), response });
    return response;
  }
}

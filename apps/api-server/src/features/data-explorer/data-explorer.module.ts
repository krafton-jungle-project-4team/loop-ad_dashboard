import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../infra/database/index.js";
import { DataExplorerController } from "./controller/data-explorer.controller.js";
import { OpenAiDataExplorerQueryPlannerProvider } from "./provider/openai-query-planner.provider.js";
import { ClickHouseEventsReader } from "./repository/clickhouse-events-reader.js";
import { DataExplorerService } from "./service/data-explorer.service.js";

/**
 * Data Explorer 기능의 의존성을 묶는다.
 *
 * HTTP, 서비스, DB 조회기, OpenAI 제공자만 명시한다.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [DataExplorerController],
  providers: [DataExplorerService, ClickHouseEventsReader, OpenAiDataExplorerQueryPlannerProvider]
})
export class DataExplorerModule {}

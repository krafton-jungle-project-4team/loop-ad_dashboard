import { Body, Controller, Get, Inject, Post, Query, Res } from "@nestjs/common";
import {
  DataExplorerObjectDetailQuerySchema,
  DataExplorerObjectsQuerySchema,
  DataExplorerQueryRunRequestSchema
} from "@loopad/shared";
import { DataExplorerChatKitService } from "../service/data-explorer-chatkit.service.js";
import { DataExplorerService } from "../service/data-explorer.service.js";
import { LogContextScope, log } from "../../../infra/logger/index.js";

type ChatKitHttpResponse = {
  end: () => void;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  status: (statusCode: number) => ChatKitHttpResponse;
  write: (chunk: string) => void;
};

/**
 * Data Explorer HTTP 요청을 받는다.
 *
 * 컨트롤러는 공유 Zod 계약만 파싱하고 실제 처리는 서비스에 맡긴다.
 */
@Controller("dashboard/data-explorer")
export class DataExplorerController {
  constructor(
    @Inject(DataExplorerService)
    private readonly dataExplorer: DataExplorerService,
    @Inject(DataExplorerChatKitService)
    private readonly chatKit: DataExplorerChatKitService
  ) {}

  /** ClickHouse 테이블 목록을 조회한다. */
  @Get("objects")
  async objects(@Query() query: unknown) {
    return this.dataExplorer.listObjects(DataExplorerObjectsQuerySchema.parse(query));
  }

  /** 선택한 ClickHouse 테이블의 컬럼과 정렬/파티션 정보를 조회한다. */
  @Get("objects/detail")
  async objectDetail(@Query() query: unknown) {
    return this.dataExplorer.getObjectDetail(DataExplorerObjectDetailQuerySchema.parse(query));
  }

  /** 사용자가 입력한 SQL을 ClickHouse에서 readonly로 실행한다. */
  @Post("queries/run")
  runQuery(@Body() body: unknown) {
    return this.dataExplorer.runQuery(DataExplorerQueryRunRequestSchema.parse(body));
  }

  /** OpenAI ChatKit SDK 요청을 처리하고, 필요하면 SSE로 답변을 스트리밍한다. */
  @Post("chatkit")
  @LogContextScope()
  async runChatKit(@Body() body: unknown, @Res() response: ChatKitHttpResponse) {
    const startedAt = Date.now();
    log.info("started", { body });
    const result = await this.chatKit.process(body);

    if (result.kind === "json") {
      log.info("chatkit_json_response_sent", { result });
      response.status(result.statusCode ?? 200).json(result.body);
      log.info("completed", { kind: "json", durationMs: Date.now() - startedAt });
      return;
    }

    log.info("chatkit_stream_response_started");
    response.status(200);
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Connection", "keep-alive");

    for await (const event of result.events) {
      response.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    response.end();
    log.info("completed", { kind: "stream", durationMs: Date.now() - startedAt });
  }
}

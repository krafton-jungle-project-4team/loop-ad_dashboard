import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import {
  DataExplorerAiChatRequestSchema,
  DataExplorerObjectDetailQuerySchema,
  DataExplorerObjectsQuerySchema,
  DataExplorerQueryRunRequestSchema
} from "@loopad/shared";
import { DataExplorerService } from "../service/data-explorer.service.js";

/**
 * Data Explorer HTTP 요청을 받는다.
 *
 * 컨트롤러는 공유 Zod 계약만 파싱하고 실제 처리는 서비스에 맡긴다.
 */
@Controller("dashboard/data-explorer")
export class DataExplorerController {
  constructor(
    @Inject(DataExplorerService)
    private readonly dataExplorer: DataExplorerService
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

  /** AI 질의를 SQL 실행 또는 현재 결과 분석으로 처리한다. */
  @Post("ai/chat")
  runAiChat(@Body() body: unknown) {
    return this.dataExplorer.runAiChat(DataExplorerAiChatRequestSchema.parse(body));
  }
}

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

  @Get("objects")
  async objects(@Query() query: unknown) {
    return this.dataExplorer.listObjects(DataExplorerObjectsQuerySchema.parse(query));
  }

  @Get("objects/detail")
  async objectDetail(@Query() query: unknown) {
    return this.dataExplorer.getObjectDetail(DataExplorerObjectDetailQuerySchema.parse(query));
  }

  @Post("queries/run")
  runQuery(@Body() body: unknown) {
    return this.dataExplorer.runQuery(DataExplorerQueryRunRequestSchema.parse(body));
  }

  @Post("ai/chat")
  runAiChat(@Body() body: unknown) {
    return this.dataExplorer.runAiChat(DataExplorerAiChatRequestSchema.parse(body));
  }
}

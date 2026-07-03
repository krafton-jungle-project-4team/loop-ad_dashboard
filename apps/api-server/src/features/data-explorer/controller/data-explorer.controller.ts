import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import {
  DataExplorerAiChatRequestSchema,
  DataExplorerObjectTypeSchema,
  DataExplorerQueryRunRequestSchema,
  type DataExplorerObjectRef,
  type DataExplorerObjectType
} from "@loopad/shared";
import { dataExplorerErrors } from "../errors.js";
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
  async objects(
    @Query("database") databaseName?: string,
    @Query("schema") schemaName?: string,
    @Query("type") objectType?: string,
    @Query("q") q?: string
  ) {
    return this.dataExplorer.listObjects({
      databaseName: optionalString(databaseName),
      schemaName: optionalString(schemaName),
      objectType: parseOptionalObjectType(objectType),
      q: optionalString(q)
    });
  }

  @Get("objects/detail")
  async objectDetail(
    @Query("database") databaseName?: string,
    @Query("schema") schemaName?: string,
    @Query("object_type") objectType?: string,
    @Query("object_name") objectName?: string
  ) {
    return this.dataExplorer.getObjectDetail(
      toObjectRef(databaseName, schemaName, objectType, objectName)
    );
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

function parseOptionalObjectType(
  objectType: string | undefined
): DataExplorerObjectType | undefined {
  return objectType ? DataExplorerObjectTypeSchema.parse(objectType) : undefined;
}

function toObjectRef(
  databaseName: string | undefined,
  schemaName: string | undefined,
  objectType: string | undefined,
  objectName: string | undefined
): DataExplorerObjectRef {
  const normalizedObjectName = optionalString(objectName);
  if (!objectType || !normalizedObjectName) {
    throw dataExplorerErrors.objectRefRequired();
  }

  return {
    database_name: optionalString(databaseName) ?? null,
    schema_name: optionalString(schemaName) ?? null,
    object_type: DataExplorerObjectTypeSchema.parse(objectType),
    object_name: normalizedObjectName
  };
}

function optionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

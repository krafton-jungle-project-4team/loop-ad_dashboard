import { Controller, Get, Inject, Param, Query } from "@nestjs/common";
import {
  DataExplorerObjectTypeSchema,
  DataExplorerSourceIdSchema,
  type DataExplorerObjectRef,
  type DataExplorerObjectType,
  type DataExplorerSourceId
} from "@loopad/shared";
import { dataExplorerErrors } from "../errors.js";
import { DataExplorerService } from "../service/data-explorer.service.js";

/**
 * Handles Data Explorer schema inspection HTTP requests.
 *
 * This controller only parses route/query inputs and delegates schema reads to
 * the service. It intentionally does not expose arbitrary SQL execution.
 */
@Controller("dashboard/v1/data-explorer")
export class DataExplorerController {
  constructor(
    @Inject(DataExplorerService)
    private readonly dataExplorer: DataExplorerService
  ) {}

  @Get("sources")
  sources() {
    return this.dataExplorer.sources();
  }

  @Get("sources/:source_id/objects")
  async objects(
    @Param("source_id") sourceId: string,
    @Query("project_id") projectId?: string,
    @Query("database") databaseName?: string,
    @Query("schema") schemaName?: string,
    @Query("type") objectType?: string,
    @Query("q") q?: string
  ) {
    return this.dataExplorer.listObjects({
      sourceId: parseSourceId(sourceId),
      projectId: requireProjectId(projectId),
      databaseName: optionalString(databaseName),
      schemaName: optionalString(schemaName),
      objectType: parseOptionalObjectType(objectType),
      q: optionalString(q)
    });
  }

  @Get("sources/:source_id/objects/detail")
  async objectDetail(
    @Param("source_id") sourceId: string,
    @Query("database") databaseName?: string,
    @Query("schema") schemaName?: string,
    @Query("object_type") objectType?: string,
    @Query("object_name") objectName?: string,
    @Query("column_name") columnName?: string
  ) {
    return this.dataExplorer.getObjectDetail(
      toObjectRef(sourceId, databaseName, schemaName, objectType, objectName, columnName)
    );
  }

  @Get("sources/:source_id/objects/ddl")
  async objectDdl(
    @Param("source_id") sourceId: string,
    @Query("database") databaseName?: string,
    @Query("schema") schemaName?: string,
    @Query("object_type") objectType?: string,
    @Query("object_name") objectName?: string
  ) {
    return this.dataExplorer.getObjectDdl(
      toObjectRef(sourceId, databaseName, schemaName, objectType, objectName)
    );
  }
}

function parseSourceId(sourceId: string): DataExplorerSourceId {
  return DataExplorerSourceIdSchema.parse(sourceId);
}

function parseOptionalObjectType(
  objectType: string | undefined
): DataExplorerObjectType | undefined {
  return objectType ? DataExplorerObjectTypeSchema.parse(objectType) : undefined;
}

function toObjectRef(
  sourceId: string,
  databaseName: string | undefined,
  schemaName: string | undefined,
  objectType: string | undefined,
  objectName: string | undefined,
  columnName?: string
): DataExplorerObjectRef {
  if (!objectType || !objectName) {
    throw dataExplorerErrors.objectRefRequired();
  }

  return {
    source_id: parseSourceId(sourceId),
    database_name: optionalString(databaseName) ?? null,
    schema_name: optionalString(schemaName) ?? null,
    object_type: DataExplorerObjectTypeSchema.parse(objectType),
    object_name: objectName,
    column_name: optionalString(columnName) ?? null
  };
}

function requireProjectId(projectId: string | undefined): string {
  const normalized = projectId?.trim();
  if (!normalized) {
    throw dataExplorerErrors.projectIdRequired();
  }
  return normalized;
}

function optionalString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

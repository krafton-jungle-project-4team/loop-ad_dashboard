import { Inject, Injectable } from "@nestjs/common";
import {
  DataExplorerObjectDdlSchema,
  DataExplorerObjectDetailSchema,
  DataExplorerObjectsResponseSchema,
  DataExplorerSourcesResponseSchema,
  type DataExplorerObjectRef,
  type DataExplorerSourceId
} from "@loopad/shared";
import { DataExplorerDomain } from "../domain/index.js";
import { dataExplorerErrors } from "../errors.js";
import { ClickHouseEventsReader } from "../repository/clickhouse-events-reader.js";
import type {
  DataExplorerSourceReader,
  ListObjectsInput
} from "../repository/data-explorer-source-reader.js";
import { PostgresContractReader } from "../repository/postgres-contract-reader.js";

/**
 * Coordinates Data Explorer schema inspection use cases.
 *
 * The service chooses a configured source reader and normalizes responses
 * through shared schemas. It does not execute user-provided SQL.
 */
@Injectable()
export class DataExplorerService {
  constructor(
    @Inject(PostgresContractReader)
    private readonly postgresContractReader: PostgresContractReader,
    @Inject(ClickHouseEventsReader)
    private readonly clickHouseEventsReader: ClickHouseEventsReader
  ) {}

  sources() {
    return DataExplorerSourcesResponseSchema.parse({
      sources: DataExplorerDomain.sources()
    });
  }

  async listObjects(input: ListObjectsInput) {
    const reader = this.reader(input.sourceId);

    try {
      return DataExplorerObjectsResponseSchema.parse({
        source_id: reader.sourceId,
        objects: await reader.listObjects(input),
        ...DataExplorerDomain.freshLiveMetadata()
      });
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async getObjectDetail(ref: DataExplorerObjectRef) {
    const reader = this.reader(ref.source_id);

    try {
      return DataExplorerObjectDetailSchema.parse(await reader.getObjectDetail(ref));
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  async getObjectDdl(ref: DataExplorerObjectRef) {
    const reader = this.reader(ref.source_id);

    try {
      return DataExplorerObjectDdlSchema.parse(await reader.getObjectDdl(ref));
    } catch (error) {
      throw dataExplorerErrors.schemaInspectionFailed({ cause: error });
    }
  }

  private reader(sourceId: DataExplorerSourceId): DataExplorerSourceReader {
    if (sourceId === "postgres_contract") {
      return this.postgresContractReader;
    }
    if (sourceId === "clickhouse_events") {
      return this.clickHouseEventsReader;
    }
    throw dataExplorerErrors.sourceNotFound();
  }
}

import type {
  DataExplorerObjectDdl,
  DataExplorerObjectDetail,
  DataExplorerObjectRef,
  DataExplorerObjectSummary,
  DataExplorerObjectType,
  DataExplorerResultColumn,
  DataExplorerSource,
  DataExplorerSourceId
} from "@loopad/shared";

export type ListObjectsInput = {
  sourceId: DataExplorerSourceId;
  databaseName?: string;
  schemaName?: string;
  objectType?: DataExplorerObjectType;
  q?: string;
};

export type ExecuteReadOnlyQueryInput = {
  sqlText: string;
  rowLimit: number;
  timeoutMs: number;
};

export type DataExplorerQueryExecutionResult = {
  columns: DataExplorerResultColumn[];
  rows: Array<Record<string, unknown>>;
  durationMs: number;
  truncated: boolean;
};

export interface DataExplorerSourceReader {
  readonly source: DataExplorerSource;
  readonly sourceId: DataExplorerSourceId;

  listObjects(input: ListObjectsInput): Promise<DataExplorerObjectSummary[]>;
  getObjectDetail(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDetail>;
  getObjectDdl(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDdl>;
  searchObjects(input: ListObjectsInput): Promise<DataExplorerObjectSummary[]>;
  executeReadOnlyQuery(input: ExecuteReadOnlyQueryInput): Promise<DataExplorerQueryExecutionResult>;
}

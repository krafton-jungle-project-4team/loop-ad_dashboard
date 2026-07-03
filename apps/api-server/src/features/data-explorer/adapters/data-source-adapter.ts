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
  projectId: string;
  databaseName?: string;
  schemaName?: string;
  objectType?: DataExplorerObjectType;
  q?: string;
};

export type ExecuteReadOnlyQueryInput = {
  projectId: string;
  sqlText: string;
  params: Record<string, unknown>;
  rowLimit: number;
  timeoutMs: number;
};

export type AdapterQueryExecutionResult = {
  columns: DataExplorerResultColumn[];
  rows: Array<Record<string, unknown>>;
  durationMs: number;
  truncated: boolean;
};

export interface DataSourceAdapter {
  readonly source: DataExplorerSource;
  readonly sourceId: DataExplorerSourceId;

  listObjects(input: ListObjectsInput): Promise<DataExplorerObjectSummary[]>;
  getObjectDetail(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDetail>;
  getObjectDdl(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDdl>;
  searchObjects(input: ListObjectsInput): Promise<DataExplorerObjectSummary[]>;
  executeReadOnlyQuery(input: ExecuteReadOnlyQueryInput): Promise<AdapterQueryExecutionResult>;
}

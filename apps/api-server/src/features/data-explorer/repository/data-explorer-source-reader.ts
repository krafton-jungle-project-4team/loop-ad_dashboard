import type {
  DataExplorerObjectDdl,
  DataExplorerObjectDetail,
  DataExplorerObjectRef,
  DataExplorerObjectSummary,
  DataExplorerObjectType,
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

export interface DataExplorerSourceReader {
  readonly source: DataExplorerSource;
  readonly sourceId: DataExplorerSourceId;

  listObjects(input: ListObjectsInput): Promise<DataExplorerObjectSummary[]>;
  getObjectDetail(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDetail>;
  getObjectDdl(ref: DataExplorerObjectRef): Promise<DataExplorerObjectDdl>;
}

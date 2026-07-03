import { Injectable } from "@nestjs/common";
import type { DataExplorerQueryRunMetadata, DataExplorerSourceId } from "@loopad/shared";

const MAX_QUERY_RUN_METADATA = 100;

@Injectable()
export class DataExplorerQueryRunsRepository {
  private readonly rows: DataExplorerQueryRunMetadata[] = [];

  save(row: DataExplorerQueryRunMetadata) {
    this.rows.unshift(row);
    if (this.rows.length > MAX_QUERY_RUN_METADATA) {
      this.rows.length = MAX_QUERY_RUN_METADATA;
    }
  }

  list(input: { projectId: string; sourceId?: DataExplorerSourceId }) {
    return this.rows.filter((row) => {
      if (row.project_id !== input.projectId) {
        return false;
      }
      return input.sourceId ? row.source_id === input.sourceId : true;
    });
  }
}

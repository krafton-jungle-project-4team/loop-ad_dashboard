import type { DataExplorerAiChatCurrentResult, DataExplorerObjectDetail } from "@loopad/shared";

export function buildChatAgentPayload(input: {
  currentResult?: DataExplorerAiChatCurrentResult;
  detail: DataExplorerObjectDetail;
  message: string;
  projectId: string;
}) {
  return {
    project_id: input.projectId,
    user_message: input.message,
    object: {
      object_name: input.detail.object.object_name,
      object_type: input.detail.object.object_type,
      columns: input.detail.columns.map((column) => ({
        column_name: column.column_name,
        data_type: column.data_type,
        nullable: column.nullable
      })),
      primary_key: input.detail.primary_key,
      partition_key: input.detail.partition_key,
      order_by: input.detail.order_by
    },
    current_result: input.currentResult
      ? {
          query_run_id: input.currentResult.query_run_id,
          row_count: input.currentResult.row_count,
          truncated: input.currentResult.truncated,
          columns: input.currentResult.columns,
          rows: input.currentResult.rows.slice(0, 50)
        }
      : null
  };
}

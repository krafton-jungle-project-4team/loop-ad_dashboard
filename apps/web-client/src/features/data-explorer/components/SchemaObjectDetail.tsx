import type {
  DataExplorerObjectDdl,
  DataExplorerObjectDetail,
  DataExplorerObjectSummary
} from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import { Input } from "@loopad/ui/shadcn/input";
import { RefreshCw } from "lucide-react";
import { EmptyState } from "../../dashboard/ui/EmptyState.js";
import { Section } from "../../dashboard/ui/Section.js";

export function SchemaObjectDetail({
  ddl,
  detail,
  isRefreshing,
  objectSearch,
  objects,
  onObjectSearchChange,
  onRefresh,
  onSelectObject,
  selectedObjectName
}: {
  ddl: DataExplorerObjectDdl | null;
  detail: DataExplorerObjectDetail | null;
  isRefreshing: boolean;
  objectSearch: string;
  objects: DataExplorerObjectSummary[];
  onObjectSearchChange: (value: string) => void;
  onRefresh: () => void;
  onSelectObject: (object: DataExplorerObjectSummary) => void;
  selectedObjectName: string | null;
}) {
  return (
    <Section
      action={
        <Button
          disabled={isRefreshing}
          onClick={onRefresh}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <RefreshCw />
        </Button>
      }
      contentClassName="grid gap-4"
      title="Live schema"
    >
      <div className="grid gap-3">
        <Input
          onChange={(event) => onObjectSearchChange(event.target.value)}
          placeholder="Object search"
          value={objectSearch}
        />
        <div className="max-h-56 overflow-auto rounded-lg border border-black/10">
          {objects.length > 0 ? (
            objects.map((object) => (
              <button
                className={`flex w-full items-center justify-between gap-3 border-b border-black/5 px-3 py-2 text-left text-sm last:border-b-0 ${
                  selectedObjectName === object.object_name ? "bg-[#e8f2ff]" : "hover:bg-muted"
                }`}
                key={`${object.database_name ?? ""}.${object.schema_name ?? ""}.${object.object_name}`}
                onClick={() => onSelectObject(object)}
                type="button"
              >
                <span className="min-w-0 truncate font-medium">{object.object_name}</span>
                <Badge variant="outline">{object.object_type}</Badge>
              </button>
            ))
          ) : (
            <div className="p-4">
              <EmptyState message="조회된 object가 없습니다." />
            </div>
          )}
        </div>
      </div>

      {detail ? (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#0066cc] text-white" variant="default">
                {detail.object.source_id}
              </Badge>
              <Badge variant="outline">{detail.object.object_type}</Badge>
              {detail.object.engine ? (
                <Badge variant="outline">{detail.object.engine}</Badge>
              ) : null}
            </div>
            <h3 className="truncate text-lg font-semibold tracking-tight text-[#1d1d1f]">
              {detail.object.schema_name ? `${detail.object.schema_name}.` : ""}
              {detail.object.object_name}
            </h3>
            <div className="text-xs text-muted-foreground">
              {detail.ddl_source} · {new Date(detail.ddl_fetched_at).toLocaleString("ko-KR")}
            </div>
          </div>

          <div className="max-h-72 overflow-auto rounded-lg border border-black/10">
            {detail.columns.map((column) => (
              <div
                className="grid gap-1 border-b border-black/5 px-3 py-2 last:border-b-0"
                key={column.column_name}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs font-semibold">
                    {column.column_name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{column.data_type}</span>
                </div>
                {column.source_comment ? (
                  <span className="text-xs text-muted-foreground">{column.source_comment}</span>
                ) : null}
              </div>
            ))}
          </div>

          <pre className="max-h-80 overflow-auto rounded-lg border border-black/10 bg-[#f7f7f8] p-3 text-xs leading-relaxed text-[#1d1d1f]">
            {ddl?.ddl ?? "DDL is loading."}
          </pre>
        </div>
      ) : (
        <EmptyState message="Object를 선택해주세요." />
      )}
    </Section>
  );
}

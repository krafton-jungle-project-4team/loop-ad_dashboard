import type {
  DataExplorerObjectSummary,
  DataExplorerSource,
  DataExplorerSourceId
} from "@loopad/shared";
import { Input } from "@loopad/ui/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@loopad/ui/shadcn/select";
import { cn } from "@loopad/ui/shadcn/utils";
import { Database, Search, Table2 } from "lucide-react";

export function SchemaBrowserPanel({
  isLoading,
  objectSearch,
  objects,
  onObjectSearchChange,
  onSelectObject,
  onSourceIdChange,
  selectedObjectName,
  sourceId,
  sources
}: {
  isLoading: boolean;
  objectSearch: string;
  objects: DataExplorerObjectSummary[];
  onObjectSearchChange: (value: string) => void;
  onSelectObject: (object: DataExplorerObjectSummary) => void;
  onSourceIdChange: (sourceId: DataExplorerSourceId) => void;
  selectedObjectName: string | null;
  sourceId: DataExplorerSourceId;
  sources: DataExplorerSource[];
}) {
  return (
    <aside className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden bg-[#fafafc]">
      <div className="border-b border-black/10 px-4 py-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Schema Browser
        </div>
        <Select
          onValueChange={(value) => onSourceIdChange(value as DataExplorerSourceId)}
          value={sourceId}
        >
          <SelectTrigger className="h-9 w-full bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sources.map((source) => (
              <SelectItem key={source.source_id} value={source.source_id}>
                {source.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-b border-black/10 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="h-10 bg-white pl-8"
            onChange={(event) => onObjectSearchChange(event.target.value)}
            placeholder="Search tables..."
            value={objectSearch}
          />
        </div>
      </div>

      <div className="h-full min-h-0 overflow-auto p-2.5">
        <div className="grid min-w-max gap-px pr-3">
          {objects.map((object) => {
            const isSelected = selectedObjectName === object.object_name;

            return (
              <div key={`${object.database_name ?? ""}.${object.object_name}`}>
                <button
                  className={cn(
                    "flex min-w-full items-center gap-1.5 rounded px-1 py-px text-left text-[7px] font-normal leading-3 transition-colors",
                    isSelected ? "bg-[#e8f2ff] text-[#0066cc]" : "hover:bg-white"
                  )}
                  onClick={() => onSelectObject(object)}
                  type="button"
                >
                  {object.object_type === "database" ? (
                    <Database className="size-3 shrink-0" />
                  ) : (
                    <Table2 className="size-3 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{object.object_name}</span>
                </button>
              </div>
            );
          })}

          {isLoading ? (
            <div className="rounded-lg border border-dashed border-black/10 bg-white p-4 text-sm text-muted-foreground">
              스키마를 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoading && !objects.length ? (
            <div className="rounded-lg border border-dashed border-black/10 bg-white p-4 text-sm text-muted-foreground">
              조회된 테이블이 없습니다.
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

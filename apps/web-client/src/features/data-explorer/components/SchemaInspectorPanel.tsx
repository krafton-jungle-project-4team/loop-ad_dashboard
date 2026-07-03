import type { DataExplorerObjectDetail } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { ScrollArea } from "@loopad/ui/shadcn/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { EmptyState } from "../../dashboard/ui/EmptyState.js";

export function SchemaInspectorPanel({
  detail,
  isLoading
}: {
  detail: DataExplorerObjectDetail | null;
  isLoading: boolean;
}) {
  if (isLoading && !detail) {
    return (
      <div className="rounded-[18px] border border-dashed border-black/10 bg-[#fafafc] p-6 text-sm text-muted-foreground">
        스키마 정보를 불러오는 중입니다.
      </div>
    );
  }

  if (!detail) {
    return <EmptyState message="왼쪽 목록에서 object를 선택해주세요." />;
  }

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="grid gap-4 pr-3">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#0066cc] text-white hover:bg-[#0066cc]" variant="default">
              {detail.object.source_id}
            </Badge>
            <Badge variant="outline">{detail.object.object_type}</Badge>
          </div>
          <div className="grid gap-1">
            <h3 className="truncate text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
              {qualifiedObjectName(detail)}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {detail.object.source_comment ?? "등록된 table comment가 없습니다."}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-[18px] border border-black/10 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
            <h3 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">Columns</h3>
            <Badge variant="outline">{detail.columns.length}</Badge>
          </div>
          <div className="overflow-auto">
            <Table className="min-w-[760px]">
              <TableHeader className="bg-[#fafafc]">
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Column</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Nullable</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.columns.map((column) => (
                  <TableRow key={column.column_name}>
                    <TableCell className="text-muted-foreground">
                      {column.ordinal_position}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      {column.column_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{column.data_type}</TableCell>
                    <TableCell>{column.nullable ? "yes" : "no"}</TableCell>
                    <TableCell className="max-w-52 truncate font-mono text-xs text-muted-foreground">
                      {column.default_value ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[360px] whitespace-normal text-sm text-muted-foreground">
                      {column.source_comment ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}

function qualifiedObjectName(detail: DataExplorerObjectDetail) {
  return [
    detail.object.database_name,
    detail.object.schema_name,
    detail.object.object_name
  ].filter(Boolean).join(".");
}

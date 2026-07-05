import type { DataExplorerQueryRunResponse } from "@loopad/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@loopad/ui/shadcn/table";
import { EmptyState } from "../../dashboard/ui/EmptyState.js";

export function QueryResultTable({ result }: { result: DataExplorerQueryRunResponse | null }) {
  if (!result || result.rows.length === 0) {
    return <EmptyState message="표시할 쿼리 결과가 없습니다." />;
  }

  return (
    <div className="h-full min-h-0 overflow-auto rounded-lg border border-black/10">
      <Table>
        <TableHeader className="sticky top-0 bg-[#fafafc]">
          <TableRow>
            {result.columns.map((column) => (
              <TableHead key={column.name}>
                <span className="block max-w-52 truncate">{column.name}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {result.columns.map((column) => (
                <TableCell className="max-w-72 truncate font-mono text-xs" key={column.name}>
                  {formatCell(row[column.name])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

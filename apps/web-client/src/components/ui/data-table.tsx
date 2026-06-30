import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Row
} from "@tanstack/react-table";
import { cn } from "../../lib/utils.js";
import { EmptyState } from "./primitives.js";

export type { ColumnDef } from "@tanstack/react-table";

export function DataTable<TData>({
  columns,
  data,
  emptyMessage,
  getRowClassName,
  onRowClick
}: {
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyMessage: string;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  onRowClick?: (row: TData) => void;
}) {
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel()
  });

  if (data.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-normal text-slate-500">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th className="border-b border-slate-200 px-4 py-3" key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {table.getRowModel().rows.map((row) => (
              <tr
                className={cn(
                  "transition hover:bg-sky-50/70",
                  onRowClick ? "cursor-pointer" : undefined,
                  getRowClassName?.(row)
                )}
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td className="px-4 py-3 align-middle text-slate-700" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

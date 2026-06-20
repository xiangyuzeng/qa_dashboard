"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useT } from "@/src/lib/i18n/locale";

// Multi-select facet: keep row if no selection, else value ∈ selection.
const multiSelect: FilterFn<unknown> = (row, columnId, value) => {
  if (!Array.isArray(value) || value.length === 0) return true;
  return value.includes(row.getValue(columnId));
};

export type FacetCfg = {
  columnId: string;
  label: string;
  /** optional display formatter for option values (e.g. localize a category id). */
  format?: (v: string) => string;
};

function Facet({
  table,
  cfg,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any;
  cfg: FacetCfg;
}) {
  const col = table.getColumn(cfg.columnId);
  if (!col) return null;
  const selected: string[] = (col.getFilterValue() as string[]) ?? [];
  const uniques = Array.from(col.getFacetedUniqueValues().entries() as Iterable<[unknown, number]>)
    .filter(([k]) => k != null && k !== "")
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));

  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    col.setFilterValue(next.length ? next : undefined);
  };

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
        {cfg.label}
        {selected.length > 0 && (
          <span className="ml-1 rounded-full bg-brandnavy px-1.5 text-[10px] text-white">
            {selected.length}
          </span>
        )}
        <span className="text-slate-400">▾</span>
      </summary>
      <div className="absolute z-20 mt-1 max-h-72 w-60 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
        {uniques.map(([v, count]) => {
          const val = String(v);
          return (
            <label key={val} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50">
              <input type="checkbox" aria-label={`${cfg.label}: ${cfg.format ? cfg.format(val) : val}`} checked={selected.includes(val)} onChange={() => toggle(val)} />
              <span className="flex-1 truncate">{cfg.format ? cfg.format(val) : val}</span>
              <span className="text-xs text-slate-400">{count}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}

export function DataTable<T extends object>({
  data,
  columns,
  facets = [],
  searchableText,
  initialQ = "",
  searchPlaceholder,
  getRowHref,
  resultsLabel,
  emptyText,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  facets?: FacetCfg[];
  searchableText: (row: T) => string;
  initialQ?: string;
  searchPlaceholder?: string;
  getRowHref?: (row: T) => string | undefined;
  resultsLabel?: string;
  emptyText?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState(initialQ);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const facetIds = useMemo(() => new Set(facets.map((f) => f.columnId)), [facets]);
  const cols = useMemo(
    () =>
      columns.map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const id = (c as any).accessorKey ?? c.id;
        return facetIds.has(id) ? { ...c, filterFn: multiSelect as FilterFn<T> } : c;
      }),
    [columns, facetIds],
  );

  const table = useReactTable({
    data,
    columns: cols,
    state: { globalFilter, sorting, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _id, value) => {
      const q = String(value ?? "").toLowerCase().trim();
      if (!q) return true;
      return searchableText(row.original as T).toLowerCase().includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const total = table.getPrePaginationRowModel().rows.length;
  const hasFilters = columnFilters.length > 0 || globalFilter;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder ?? t.top.search}
          className="w-64 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brandnavy"
        />
        {facets.map((f) => (
          <Facet key={f.columnId} table={table} cfg={f} />
        ))}
        {hasFilters && (
          <button
            onClick={() => {
              setColumnFilters([]);
              setGlobalFilter("");
            }}
            className="rounded-md px-2.5 py-1.5 text-xs text-slate-500 underline hover:text-slate-700"
          >
            {t.common.clear}
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">
          {total} {resultsLabel ?? t.inspections.results}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                {hg.headers.map((h) => (
                  <th key={h.id} className="whitespace-nowrap px-3 py-2">
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 hover:text-slate-800"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        <span className="text-slate-400">
                          {{ asc: "▲", desc: "▼" }[h.column.getIsSorted() as string] ?? ""}
                        </span>
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="px-3 py-8 text-center text-slate-400">
                  {emptyText ?? t.inspections.noRows}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const href = getRowHref?.(row.original as T);
                const isHigh = (row.original as { riskLevel?: string }).riskLevel === "高风险";
                return (
                  <tr
                    key={row.id}
                    onClick={href ? () => router.push(href) : undefined}
                    className={`border-b border-slate-100 align-top ${isHigh ? "bg-risk-highbg/40" : ""} ${
                      href ? "cursor-pointer hover:bg-slate-50" : ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            ‹
          </button>
          <span>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

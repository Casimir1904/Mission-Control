"use client";

import { type Table } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  exportToCsv,
  exportToJson,
  type ExportColumn,
} from "@/lib/export";

export type DataTableExportProps<TData> = {
  table: Table<TData>;
  filename?: string;
  className?: string;
};

export function DataTableExport<TData>({
  table,
  filename = "export",
  className,
}: DataTableExportProps<TData>) {
  const handleExportCsv = () => {
    const visibleColumns = table.getVisibleLeafColumns();
    const rows = table.getRowModel().rows;

    // Build export columns from visible columns with accessor keys
    const columns: ExportColumn<TData>[] = visibleColumns
      .filter((col) => col.id !== "select" && col.id !== "actions")
      .map((col) => ({
        key: col.id as keyof TData,
        header: typeof col.columnDef.header === "string"
          ? col.columnDef.header
          : col.id,
      }));

    if (columns.length === 0) return;

    // Extract data from rows
    const data = rows.map((row) => {
      const rowData: Record<string, unknown> = {};
      columns.forEach((col) => {
        rowData[col.key as string] = row.original[col.key];
      });
      return rowData as TData & Record<string, unknown>;
    });

    const timestamp = new Date().toISOString().split("T")[0];
    exportToCsv(data, columns, `${filename}-${timestamp}.csv`);
  };

  const handleExportJson = () => {
    const visibleColumns = table.getVisibleLeafColumns();
    const rows = table.getRowModel().rows;

    // Build export columns from visible columns
    const columns: ExportColumn<TData>[] = visibleColumns
      .filter((col) => col.id !== "select" && col.id !== "actions")
      .map((col) => ({
        key: col.id as keyof TData,
        header: typeof col.columnDef.header === "string"
          ? col.columnDef.header
          : col.id,
      }));

    if (columns.length === 0) return;

    // Extract data from rows, filtering to only visible columns
    const data = rows.map((row) => {
      const rowData: Record<string, unknown> = {};
      columns.forEach((col) => {
        rowData[col.key as string] = row.original[col.key];
      });
      return rowData;
    });

    const timestamp = new Date().toISOString().split("T")[0];
    exportToJson(data, `${filename}-${timestamp}.json`, true);
  };

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleExportCsv}
      >
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportJson}
      >
        Export JSON
      </Button>
    </div>
  );
}

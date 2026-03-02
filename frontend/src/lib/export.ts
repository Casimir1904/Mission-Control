export type ExportColumn<TData> = {
  key: keyof TData;
  header: string;
};

export const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Escape values containing special characters
  if (/[",\n\r]/.test(stringValue)) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }

  return stringValue;
};

export const convertToCsv = <TData extends Record<string, unknown>>(
  data: TData[],
  columns: ExportColumn<TData>[],
): string => {
  if (data.length === 0) {
    return columns.map((col) => escapeCsvValue(col.header)).join(",");
  }

  const headers = columns.map((col) => escapeCsvValue(col.header));

  const rows = data.map((row) =>
    columns
      .map((col) => escapeCsvValue(row[col.key as keyof TData]))
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
};

export const convertToJson = <TData>(
  data: TData[],
  pretty = false,
): string => {
  return JSON.stringify(data, null, pretty ? 2 : undefined);
};

export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string,
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const exportToCsv = <TData extends Record<string, unknown>>(
  data: TData[],
  columns: ExportColumn<TData>[],
  filename: string,
): void => {
  const csv = convertToCsv(data, columns);
  downloadFile(csv, filename, "text/csv;charset=utf-8;");
};

export const exportToJson = <TData>(
  data: TData[],
  filename: string,
  pretty = false,
): void => {
  const json = convertToJson(data, pretty);
  downloadFile(json, filename, "application/json");
};

// CX Dashboard Export Utilities

function formatDateForFilename(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildFilename(viewName: string, filters?: Record<string, string>): string {
  const parts = ["cx", viewName];
  if (filters) {
    if (filters.timeframe && filters.timeframe !== "all") {
      parts.push(filters.timeframe);
    }
    if (filters.start_date && filters.end_date) {
      parts.push(`${filters.start_date}-to-${filters.end_date}`);
    }
    if (filters.provider) parts.push(filters.provider.toLowerCase());
    if (filters.status) parts.push(filters.status);
  }
  parts.push(formatDateForFilename());
  return parts.join("-");
}

export function exportToCSV(
  data: Record<string, unknown>[],
  viewName: string,
  filters?: Record<string, string>
): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          const str = typeof val === "object" ? JSON.stringify(val) : String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${buildFilename(viewName, filters)}.csv`);
}

export function exportToJSON(
  data: Record<string, unknown>[],
  viewName: string,
  filters?: Record<string, string>
): void {
  if (!data.length) return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${buildFilename(viewName, filters)}.json`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

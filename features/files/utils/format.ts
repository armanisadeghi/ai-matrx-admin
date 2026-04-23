/**
 * features/files/utils/format.ts
 *
 * Display formatters — file size, relative time, absolute time.
 */

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    SIZE_UNITS.length - 1,
  );
  const value = bytes / Math.pow(1024, exp);
  // Keep a single decimal for KB+, whole numbers for B.
  const formatted = exp === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${SIZE_UNITS[exp]}`;
}

const REL_UNITS: { limit: number; divisor: number; label: string }[] = [
  { limit: 60 * 1000, divisor: 1000, label: "s" },
  { limit: 60 * 60 * 1000, divisor: 60 * 1000, label: "m" },
  { limit: 24 * 60 * 60 * 1000, divisor: 60 * 60 * 1000, label: "h" },
  { limit: 7 * 24 * 60 * 60 * 1000, divisor: 24 * 60 * 60 * 1000, label: "d" },
  { limit: 30 * 24 * 60 * 60 * 1000, divisor: 7 * 24 * 60 * 60 * 1000, label: "w" },
  { limit: 365 * 24 * 60 * 60 * 1000, divisor: 30 * 24 * 60 * 60 * 1000, label: "mo" },
];

/**
 * "2m ago", "3h ago", "5d ago", etc. Falls back to absolute date after 1 year.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  if (ms < 0) return "just now";
  for (const unit of REL_UNITS) {
    if (ms < unit.limit) {
      const n = Math.max(1, Math.floor(ms / unit.divisor));
      return `${n}${unit.label} ago`;
    }
  }
  return new Date(iso).toLocaleDateString();
}

export function formatAbsoluteDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Truncate a filename at its stem while preserving the extension.
 * "a-very-long-report-2026.pdf" → "a-very-long-re….pdf"
 */
export function truncateFilename(
  name: string,
  maxLength = 24,
): string {
  if (name.length <= maxLength) return name;
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx <= 0) return `${name.slice(0, maxLength - 1)}…`;
  const ext = name.slice(dotIdx);
  const stem = name.slice(0, dotIdx);
  const keep = Math.max(1, maxLength - ext.length - 1);
  return `${stem.slice(0, keep)}…${ext}`;
}

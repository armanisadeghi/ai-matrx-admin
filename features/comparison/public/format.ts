/** "Oct 16, 2026" for a fetched-at stamp; empty when the stamp is missing or unreadable. */
export function fetchedOn(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

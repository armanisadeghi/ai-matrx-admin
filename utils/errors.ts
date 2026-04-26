/**
 * Safe string extraction for caught values (Supabase PostgrestError, axios, etc.).
 * Avoids `String(err)` on plain objects, which yields "[object Object]".
 *
 * For Supabase PostgrestError the returned string includes message, details,
 * hint, and error code so logs are immediately actionable.
 */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof e.message === "string" && e.message) parts.push(e.message);
    if (typeof e.details === "string" && e.details) parts.push(e.details);
    if (typeof e.hint === "string" && e.hint) parts.push(`Hint: ${e.hint}`);
    if (typeof e.code === "string" && e.code) parts.push(`Code: ${e.code}`);
    if (parts.length > 0) return parts.join(" · ");
    try {
      const s = JSON.stringify(err);
      if (s && s !== "{}") return s;
    } catch {
      /* ignore */
    }
  }
  return "An unexpected error occurred";
}

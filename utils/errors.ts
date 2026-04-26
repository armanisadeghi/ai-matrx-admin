/**
 * Safe string extraction for caught values (Supabase PostgrestError, axios, etc.).
 * Avoids `String(err)` on plain objects, which yields "[object Object]".
 */
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.details === "string") return obj.details;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

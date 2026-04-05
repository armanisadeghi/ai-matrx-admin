/** Pretty-print hook diagnostics for display and clipboard (already clone-safe JSON). */
export function formatScraperDiagnosticsJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return JSON.stringify(
      {
        note: "JSON.stringify failed",
        hint: String(value),
      },
      null,
      2,
    );
  }
}

/**
 * The legacy-bridge helpers are the package's (@ai-matrx/rich-content kinds/definitions/legacy-bridge-utils),
 * shared with the core kinds; re-exported for this app's kinds. `isRecord` is this app's addition.
 */
export * from "@ai-matrx/rich-content/kinds/definitions/legacy-bridge-utils";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

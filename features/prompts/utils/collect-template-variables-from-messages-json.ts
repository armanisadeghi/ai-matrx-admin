import type { Json } from "@/types/database.types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Scan prompt `messages` JSON (DB shape) for `{{variable}}` placeholders.
 */
export function collectMustacheVariableNamesFromMessagesJson(
  messages: Json | null | undefined,
): string[] {
  const variables = new Set<string>();
  if (!Array.isArray(messages)) return [];
  const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) continue;
    const content = (msg as Record<string, unknown>).content;
    if (typeof content !== "string") continue;
    const re = new RegExp(variableRegex.source, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      variables.add(match[1]);
    }
  }
  return Array.from(variables);
}

export function promptSnapshotHasPlaceholder(
  snapshot: Json | null | undefined,
): boolean {
  if (!isRecord(snapshot)) return false;
  return snapshot.placeholder === true;
}

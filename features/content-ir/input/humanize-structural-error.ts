/**
 * One ajv message, in a person's words. The structural leg reports
 * `/facts/0 must have required property 'field'`; a reader should see
 * "facts, item 1: field is required".
 */

const TYPE_WORDS: Record<string, string> = {
  string: "text",
  number: "a number",
  integer: "a whole number",
  boolean: "yes or no",
  array: "a list",
  object: "a set of fields",
};

function placeOf(path: string): string {
  const parts = path.split("/").filter((p) => p !== "" && p !== "(root)");
  return parts
    .map((part) => (/^\d+$/.test(part) ? `item ${Number(part) + 1}` : part))
    .join(", ");
}

export function humanizeStructuralMessage(message: string): string {
  const trimmed = message.trim();
  const at = trimmed.search(/\s/);
  const hasPath = trimmed.startsWith("/") || trimmed.startsWith("(root)");
  const path = hasPath ? (at === -1 ? trimmed : trimmed.slice(0, at)) : "";
  const rest = hasPath ? (at === -1 ? "" : trimmed.slice(at + 1)) : trimmed;
  const place = placeOf(path);
  const prefix = place ? `${place}: ` : "";

  const required = /^must have required property '([^']+)'$/.exec(rest);
  if (required) return `${prefix}${required[1]} is required`;

  const type = /^must be (\w+)$/.exec(rest);
  if (type && TYPE_WORDS[type[1]]) {
    return `${prefix}must be ${TYPE_WORDS[type[1]]}`;
  }
  if (/^must be equal to one of the allowed values$/.test(rest)) {
    return `${prefix}must be one of the allowed choices`;
  }
  const extra = /^must NOT have additional properties$/.exec(rest);
  if (extra) return `${prefix}has a field this shape does not know`;
  const shorter = /^must NOT have fewer than (\d+) items$/.exec(rest);
  if (shorter) return `${prefix}needs at least ${shorter[1]} items`;
  return `${prefix}${rest}`.trim();
}

/**
 * The messages a form shows under its fields: what no field claimed. When the
 * fields are hidden (JSON view) or nothing was attributed, every message lands
 * here, one per entry — never the joined validator string.
 */
export function unclaimedStructuralMessages(
  detail: string | null | undefined,
  attributed: { byField: Record<string, string[]>; formLevel: string[] },
  fieldsShown: boolean,
): string[] {
  if (!detail) return [];
  if (attributed.formLevel.length > 0) return attributed.formLevel;
  const claimed = Object.values(attributed.byField).flat().length;
  if (fieldsShown && claimed > 0) return [];
  return [
    ...new Set(
      detail
        .replace(/^sample failed schema: /, "")
        .split("; ")
        .map((m) => m.trim())
        .filter((m) => m !== ""),
    ),
  ];
}

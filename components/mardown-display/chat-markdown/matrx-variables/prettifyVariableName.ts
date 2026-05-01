/**
 * Convert a raw variable name (snake_case, camelCase, kebab-case, or mixed)
 * into a human-readable label: "Title Case Words".
 *
 * Examples:
 *   "user_name"          → "User Name"
 *   "totalAmountDue"     → "Total Amount Due"
 *   "api-key"            → "Api Key"
 *   "first_nameLast"     → "First Name Last"
 *
 * This is a render-only helper. The raw name is always preserved on the AST
 * node and on the DOM (`data-name`); nothing persists this prettified form.
 */
export function prettifyVariableName(name: string): string {
  if (!name) return "";

  const normalized = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!normalized) return name;

  return normalized
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
 * Words a provider or agent writes where a name should be when it has none (MKT-107: "UNKNOWN" was offered as a
 * person's name with a Yes button). Twin of aidream `services/brand_intake/placeholder.py`; the server drops these
 * first, the screen drops any that still arrive (an older server, a replayed run).
 */
const PLACEHOLDER_NAMES = new Set([
  "unknown", "unknown user", "unknown name", "n/a", "na", "n.a.", "none", "null", "nil", "undefined",
  "anonymous", "anon", "unnamed", "no name", "not available", "not provided", "not specified", "not found",
  "tbd", "tba",
]);

export function isPlaceholderName(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  const core = t.replace(/^[\s\-_.?!*#/\\|:;,~]+|[\s\-_.?!*#/\\|:;,~]+$/g, "").toLowerCase();
  return !core || PLACEHOLDER_NAMES.has(t.toLowerCase()) || PLACEHOLDER_NAMES.has(core) || !/[\p{L}\p{N}]/u.test(t);
}

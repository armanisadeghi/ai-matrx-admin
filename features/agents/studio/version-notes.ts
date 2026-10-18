/**
 * What the Versions list says about a saved version. A note written for people is shown as written;
 * a note the system wrote (migrations, audits, batches, "undo:" hints, raw ids) is never shown raw.
 * A model swap is said in model names; any other system note is only labeled "System update".
 */

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const SYSTEM_MARKERS = /\(undo:|\baudit\b|\bbatch\b|\bstage [a-z0-9]\b|\bmigration\b|\b[a-z]+\.[a-z_]+\b.*\bstage\b|\b20\d\d-\d\d-\d\d\b|[a-z]+_[a-z_]+/i;

export const SYSTEM_NOTE_LABEL = "System update";

export function describeVersionNote(
  note: string | null | undefined,
  modelName: (id: string) => string | undefined,
): string | undefined {
  const text = note?.trim();
  if (!text) return undefined;
  const ids = text.match(UUID) ?? [];
  if (/model/i.test(text) && /replaced|→|->|changed/i.test(text) && ids.length >= 2) {
    const [fromId = "", toId = ""] = ids;
    const to = modelName(toId.toLowerCase()) ?? modelName(toId);
    const from = modelName(fromId.toLowerCase()) ?? modelName(fromId);
    if (to) return from ? `Model changed from ${from} to ${to}` : `Model changed to ${to}`;
    return "Model changed";
  }
  if (ids.length > 0 || SYSTEM_MARKERS.test(text)) return SYSTEM_NOTE_LABEL;
  return text;
}

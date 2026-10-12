import { createHash } from "node:crypto";

/**
 * The content hash must ignore ids the seed builders mint at random on every
 * run (document ids, paragraph ids): each distinct random id is replaced by
 * its first-seen ordinal, so the hash changes only when the content does.
 */
export function stableContentHash(snapshot: unknown): string {
  const seen = new Map<string, string>();
  const ordinal = (id: string) => {
    if (!seen.has(id)) seen.set(id, `#id${seen.size}`);
    return seen.get(id)!;
  };
  let body = JSON.stringify(snapshot);
  // Table ids are short random hex used both as a value and as a map key.
  for (const [, id] of body.matchAll(/"tableId":"([^"]+)"/g)) body = body.split(`"${id}"`).join(`"${ordinal(id)}"`);
  body = body.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|(?:para|section)_[A-Za-z0-9_-]{8,}/g,
    ordinal,
  );
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}

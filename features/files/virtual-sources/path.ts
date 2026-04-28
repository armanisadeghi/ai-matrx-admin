/**
 * features/files/virtual-sources/path.ts
 *
 * Encode and decode virtual paths.
 *
 * Two forms:
 *  - **Canonical** — `vfs://<sourceId>/<...segments>` — used in tab ids,
 *    Redux state, and as the wire format for `POST /virtual/resolve`.
 *  - **Display** — `/<adapter.label>/<...names>` — what the user sees in
 *    breadcrumbs and the path bar. Built from a `VirtualNode` chain.
 *
 * Path segments are individually URI-encoded so spaces, slashes inside a
 * name, and unicode all round-trip cleanly.
 *
 * Synthetic ids — the format `vfs:<sourceId>:<virtualId>[:<fieldId>]` — are
 * defined here too. They keep the cloud-files Redux `filesById` map a single
 * keyspace so existing components don't need to branch on origin.
 */

const CANONICAL_PREFIX = "vfs://";
const SYNTHETIC_ID_PREFIX = "vfs:";

// ---------------------------------------------------------------------------
// Canonical path
// ---------------------------------------------------------------------------

export function encodeVirtualPath(
  sourceId: string,
  segments: string[] = [],
): string {
  const encoded = segments.map((s) => encodeURIComponent(s)).join("/");
  return encoded
    ? `${CANONICAL_PREFIX}${sourceId}/${encoded}`
    : `${CANONICAL_PREFIX}${sourceId}`;
}

export function decodeVirtualPath(
  path: string,
): { sourceId: string; segments: string[] } | null {
  if (!path.startsWith(CANONICAL_PREFIX)) return null;
  const rest = path.slice(CANONICAL_PREFIX.length);
  if (!rest) return null;
  const slash = rest.indexOf("/");
  if (slash < 0) return { sourceId: rest, segments: [] };
  const sourceId = rest.slice(0, slash);
  const tail = rest.slice(slash + 1);
  if (!sourceId) return null;
  const segments = tail
    .split("/")
    .filter((s) => s.length > 0)
    .map((s) => decodeURIComponent(s));
  return { sourceId, segments };
}

// ---------------------------------------------------------------------------
// Synthetic id (for cloud-files Redux state)
// ---------------------------------------------------------------------------

/** Build a synthetic file id usable as a key in `filesById` / `foldersById`.
 *  Format: `vfs:<sourceId>:<virtualId>` or `vfs:<sourceId>:<virtualId>:<fieldId>`. */
export function makeSyntheticId(
  sourceId: string,
  virtualId: string,
  fieldId?: string,
): string {
  return fieldId
    ? `${SYNTHETIC_ID_PREFIX}${sourceId}:${virtualId}:${fieldId}`
    : `${SYNTHETIC_ID_PREFIX}${sourceId}:${virtualId}`;
}

/** Inverse of `makeSyntheticId`. Returns `null` for ids that aren't virtual
 *  (i.e. real cloud-files UUIDs). */
export function parseSyntheticId(
  syntheticId: string,
): { sourceId: string; virtualId: string; fieldId?: string } | null {
  if (!syntheticId.startsWith(SYNTHETIC_ID_PREFIX)) return null;
  const rest = syntheticId.slice(SYNTHETIC_ID_PREFIX.length);
  const parts = rest.split(":");
  if (parts.length < 2) return null;
  const [sourceId, virtualId, ...fieldParts] = parts;
  if (!sourceId || !virtualId) return null;
  // Field id may itself contain a colon (rare but possible) — rejoin.
  const fieldId = fieldParts.length > 0 ? fieldParts.join(":") : undefined;
  return { sourceId, virtualId, fieldId };
}

/** Convenience: is this id a virtual one? */
export function isSyntheticId(id: string): boolean {
  return id.startsWith(SYNTHETIC_ID_PREFIX);
}

/** Sentinel id for an adapter's root folder. The cloud-files tree mounts one
 *  synthetic folder per adapter using this. */
export const VIRTUAL_ROOT_VID = "__root__";

export function makeRootSyntheticId(sourceId: string): string {
  return makeSyntheticId(sourceId, VIRTUAL_ROOT_VID);
}

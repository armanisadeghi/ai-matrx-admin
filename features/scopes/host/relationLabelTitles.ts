// features/scopes/host/relationLabelTitles.ts
//
// THE ONE PATH THAT NAMES A LINKED THING (lane LINK-PICKER-2). `platform.relation_label` is the platform's
// answer to "what is this linked record called": the kind's own title column, else — for the ~900 kinds the
// registry gives no title column ("Pay period", "Workflow run") — the fallback label the picker lists them
// under ("Pay period · 2026-08-28 · 3698766c"), and a withheld sentence when the reader may not open it.
//
// The titles service of `@ai-matrx/associations` names a row only through the candidate search's title column,
// so a kind with none came back unnamed and every surface drew "Untitled Pay period" — the Linked list, the
// attached-items sheet, the universal search hits. This wraps that ONE service at the one place the host
// constructs it: whatever the candidate search could not title is asked of relation_label (through
// `custom.entity_reference_words`, one batched call per kind) and cached through the service's own `prime`.
// Every consumer — `fetchEntityTitles`, `useEntityTitles`, AttachedItemsSheet — reads this service, so there
// is no second path to keep in step.

import type { TitlesServiceApi } from "@ai-matrx/associations/core";

export interface RelationLabelDoor {
  (organizationId: string, refs: ReadonlyArray<{ token: string; id: string }>): PromiseLike<{
    data?: unknown;
    error?: unknown;
  }>;
}

const STORE_RECORD = "record";

export function withRelationLabels(
  base: TitlesServiceApi,
  door: RelationLabelDoor,
  organizationId: () => string | null,
): TitlesServiceApi {
  return {
    get: (token, id) => base.get(token, id),
    prime: (token, id, title) => base.prime(token, id, title),
    fallback: (token) => base.fallback(token),
    async fetch(token, ids) {
      const out = await base.fetch(token, ids);
      if (token === STORE_RECORD) return out;
      const missing = ids.filter((id) => !out.has(id));
      if (missing.length === 0) return out;
      const org = organizationId();
      if (!org) return out;
      for (let index = 0; index < missing.length; index += 500) {
        const chunk = missing.slice(index, index + 500);
        const { data, error } = await door(org, chunk.map((id) => ({ token, id })));
        if (error || !Array.isArray(data)) continue;
        for (const row of data as Array<{ id?: unknown; label?: unknown }>) {
          const label = typeof row.label === "string" ? row.label.trim() : "";
          if (typeof row.id !== "string" || !label) continue;
          base.prime(token, row.id, label);
          out.set(row.id, label);
        }
      }
      return out;
    },
  };
}

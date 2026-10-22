/**
 * The pure half of the board's CRM item (`crm-items.tsx`): a person or company from the CRM
 * (`crm.party`). Saved form `{ kind: "entity", entity: "party", id }` — a reference, never a copy;
 * `id` is null until the person presses Create Record in the tile's own create form.
 */

import type { NodeSource } from "../board/document";
import type { FoundRecord } from "./types";
import { resolveEntityDoors } from "@ai-matrx/records-ui/entity-doors";

export const PARTY_ITEM_KEY = "party";
export const NEW_PARTY_TITLE = "New person or company";

export function partySource(id: string | null): NodeSource {
  return { kind: "entity", entity: PARTY_ITEM_KEY, id };
}

export function partyIdOf(source: NodeSource): string | null {
  return source.kind === "entity" && source.entity === PARTY_ITEM_KEY ? source.id : null;
}

/** The party's address comes from the entity registry's door (never a hand-built `/crm/…` URL). */
export const partyHref = (id: string): string | null => resolveEntityDoors("party", id).href ?? null;

/** A found party as the agent's door returns it: the person's or company's name, and which it is. */
export function partyFound(row: { id: string; display_name: string; party_kind: string | null }): FoundRecord {
  return {
    type: PARTY_ITEM_KEY,
    id: row.id,
    title: row.display_name,
    updated_at: null,
    snippet: row.party_kind === "person" ? "Person" : row.party_kind ? "Company" : "Person or company",
  };
}

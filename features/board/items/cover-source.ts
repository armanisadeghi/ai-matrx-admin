/**
 * THE COVER TILE'S SOURCE (pure, no UI): `{ kind: "entity", entity: "cover", id: null, meta: { hero, markdown } }`.
 * One home for the agent tools (`home/UserBoard.tsx` agentTile / agentEdit) and the cover body
 * (`items/cover-items.tsx`), so a tile an agent makes and one a person makes are the same source, and
 * the agent tools never import the cover's renderer.
 */

import type { NodeSource } from "../board/document";

export const COVER_ENTITY = "cover";

export interface CoverContent {
  hero: string;
  markdown: string;
}

export function coverOf(source: NodeSource): CoverContent | null {
  if (source.kind !== "entity" || source.entity !== COVER_ENTITY) return null;
  const hero = source.meta?.hero;
  const markdown = source.meta?.markdown;
  return { hero: typeof hero === "string" ? hero : "", markdown: typeof markdown === "string" ? markdown : "" };
}

export function coverSource(content: CoverContent): NodeSource {
  return { kind: "entity", entity: COVER_ENTITY, id: null, meta: { hero: content.hero, markdown: content.markdown } };
}

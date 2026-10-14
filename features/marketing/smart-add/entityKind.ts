/**
 * Smart Add — the header label's default from the entity-kind decision step (aidream mandate
 * `brand_intake.entity_kind_decision`, workflow step `entity_kind`).
 *
 * The step runs only when the fixed person-or-business rules are weak or conflict with the tab, and off the
 * critical path: the label shows the tab's kind until the answer lands, then the answer. Once the person
 * changes the label themselves, their choice wins for good. Pure helpers plus one small hook.
 */

import { useCallback, useState } from "react";

export type EntityKind = "business" | "person" | "both";

const ANSWER: Record<string, EntityKind> = {
  business: "business",
  person: "person",
  person_with_business: "both",
};

function fromObject(raw: unknown): EntityKind | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.entity_kind === "string" && ANSWER[r.entity_kind]) return ANSWER[r.entity_kind];
  return null;
}

/**
 * The step's answer, from its output (`structured_output` object, or a kind instance in `content`) or an
 * emission payload. "Unanswerable" and anything unknown is null: the label keeps the tab's kind.
 */
export function parseEntityKind(raw: unknown): EntityKind | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const direct = fromObject(r) ?? fromObject(r.structured_output);
  if (direct) return direct;
  if (Array.isArray(r.content)) {
    for (const item of r.content) {
      const hit = fromObject(item);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * The label's kind: the person's own change wins; else the step's answer; else the tab's kind.
 * `choose()` records the person's change (call it from the label's change menu); `reset()` starts over.
 */
export function useEntityKindLabel(tabKind: EntityKind) {
  const [suggested, setSuggested] = useState<EntityKind | null>(null);
  const [chosen, setChosen] = useState(false);
  const suggest = useCallback((kind: EntityKind) => setSuggested(kind), []);
  const choose = useCallback(() => setChosen(true), []);
  const reset = useCallback(() => {
    setSuggested(null);
    setChosen(false);
  }, []);
  return { kind: resolveEntityKind(tabKind, suggested, chosen), suggest, choose, reset };
}

export function resolveEntityKind(tabKind: EntityKind, suggested: EntityKind | null, chosen: boolean): EntityKind {
  return chosen || !suggested ? tabKind : suggested;
}

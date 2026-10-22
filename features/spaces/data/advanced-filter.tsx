"use client";

// features/spaces/data/advanced-filter.tsx — N7, Notion's advanced filter: rules joined by And / Or, filter
// groups, saved with the view. ONE panel for every database block: a custom table (DatabaseBlock) and a
// built-in source (EntityDatabase, CD-VIEW-11). The builder is records-ui's one condition builder; the draft
// applies with one press. A source that cannot answer a rule says so in words and keeps Apply off.

import { useState } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import type { RuleExpression } from "@ai-matrx/records";
import type { ConditionField } from "@ai-matrx/records-ui";
import type { Field } from "@ai-matrx/records/react";

import { ConditionGroup } from "@/features/data-tables/records-ui-host/recordsUiLazy";

import type { SpaceDbView } from "./sources";

/** How many rules a nested question holds (the Filter icon is "on" when any is). */
export function conditionCount(expr: unknown): number {
  if (!expr || typeof expr !== "object" || Array.isArray(expr)) return 0;
  const node = expr as { op?: unknown; args?: unknown };
  if ((node.op === "and" || node.op === "or" || node.op === "not") && Array.isArray(node.args)) return node.args.reduce<number>((n, a) => n + conditionCount(a), 0);
  return 1;
}

/** Notion's advanced filter depth: a group, and a group inside it. */
export const ADVANCED_FILTER_DEPTH = 2;

export function AdvancedFilter({
  view,
  fields,
  onSave,
  onClose,
  refusal,
}: {
  view: SpaceDbView;
  fields: Field[];
  onSave?: (where: Record<string, unknown> | null) => void;
  onClose: () => void;
  /** The sentence a source says about a rule it cannot answer (Apply stays off), else null. */
  refusal?: (draft: RuleExpression | null) => string | null;
}) {
  const [draft, setDraft] = useState<RuleExpression | null>((view.where ?? null) as RuleExpression | null);
  const conditionFields: ConditionField[] = fields.map((f) => ({ id: f.id, key: f.key, label: f.label || f.key, field: f }));
  const changed = JSON.stringify(draft) !== JSON.stringify(view.where ?? null);
  const refused = refusal ? refusal(draft) : null;
  return (
    <div className="spaces-db-advanced" data-testid="spaces-advanced-filter">
      <ConditionGroup lead="Where" expr={draft} fields={conditionFields} onChange={setDraft} emptyLabel="every row" maxDepth={ADVANCED_FILTER_DEPTH} />
      {refused ? (
        <span className="type-secondary text-muted-foreground" data-testid="spaces-advanced-filter-refused">
          {refused}
        </span>
      ) : null}
      {onSave ? (
        <div className="spaces-db-advanced-bar">
          <Button
            variant="quiet"
            onClick={() => {
              setDraft(null);
              onSave(null);
              onClose();
            }}
          >
            Delete filter
          </Button>
          <Button variant="primary" disabled={!changed || !!refused} onClick={() => onSave(draft as unknown as Record<string, unknown> | null)}>
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
}

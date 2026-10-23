/**
 * The data-change ("table") event source a trigger is created with, and the
 * advisory checks the form shows. Pure — no React, no network.
 *
 * Shape = aidream `TableEventSource` (matrx-graph `trigger_store.py`). The
 * installed `@ai-matrx/api` (0.1.52) predates `when_from_value` and
 * `organization_scope`, so this type extends the generated one by hand until
 * a published api package carries them; delete the extension then.
 *
 * Validation OFFERS, never blocks (law 6): `eventSourceAdvice` returns notes
 * the form prints; the server stays the only refuser.
 */

import type { TableEventSource } from "@ai-matrx/api/workflows";

export type EventOperation = "insert" | "update";
export type EventOrganizationScope = "own" | "any";

export interface TableEventSourceSpec extends TableEventSource {
  source: "table";
  operation: EventOperation;
  /** Fire only when the column changed FROM this value. */
  when_from_value?: string | null;
  /** "own" (default): only the trigger's organization's rows fire it. */
  organization_scope?: EventOrganizationScope;
}

export interface EventInputMapRow {
  /** Workflow input name. */
  input: string;
  /** Column of the watched row. */
  column: string;
}

export interface EventDraft {
  table: string;
  operation: EventOperation;
  whenColumn: string;
  whenValue: string;
  whenFromValue: string;
  entityKeyColumn: string;
  debounceSeconds: string;
  inputMap: EventInputMapRow[];
  includeEvent: boolean;
  organizationScope: EventOrganizationScope;
}

export const EMPTY_EVENT_DRAFT: EventDraft = {
  table: "",
  operation: "insert",
  whenColumn: "",
  whenValue: "",
  whenFromValue: "",
  entityKeyColumn: "id",
  debounceSeconds: "0",
  inputMap: [],
  includeEvent: false,
  organizationScope: "own",
};

const TABLE_PATTERN = /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/;
const MAX_DEBOUNCE = 86_400;

function debounceOf(draft: EventDraft): number {
  const n = Number.parseInt(draft.debounceSeconds, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), MAX_DEBOUNCE);
}

/** The request's `event_source`. Blank optional parts are omitted. */
export function buildEventSource(draft: EventDraft): TableEventSourceSpec {
  const column = draft.whenColumn.trim();
  const value = draft.whenValue.trim();
  const from = draft.whenFromValue.trim();
  const inputMap: Record<string, string> = {};
  for (const row of draft.inputMap) {
    const input = row.input.trim();
    const col = row.column.trim();
    if (input && col) inputMap[input] = col;
  }
  return {
    source: "table",
    table: draft.table.trim(),
    operation: draft.operation,
    ...(column ? { when_column: column } : {}),
    ...(column && value ? { when_value: value } : {}),
    ...(column && from ? { when_from_value: from } : {}),
    entity_key_column: draft.entityKeyColumn.trim() || "id",
    debounce_seconds: debounceOf(draft),
    input_map: inputMap,
    include_event: draft.includeEvent,
    ...(draft.organizationScope === "any"
      ? { organization_scope: "any" as const }
      : {}),
  };
}

export interface EventAdvice {
  /** Stable key for the note. */
  id: string;
  text: string;
}

/**
 * Notes the form shows beside the pane. None of them blocks saving except
 * that an empty table has nothing to send — the caller decides that.
 */
export function eventSourceAdvice(
  draft: EventDraft,
  workflowInputNames: readonly string[],
  knownColumns: readonly string[] | null,
): EventAdvice[] {
  const notes: EventAdvice[] = [];
  const table = draft.table.trim();
  if (table && !TABLE_PATTERN.test(table)) {
    notes.push({
      id: "table-shape",
      text: "Write the table as schema.table, lowercase.",
    });
  }
  if (draft.whenColumn.trim() && !draft.whenValue.trim()) {
    notes.push({
      id: "value-missing",
      text: "Pick the value the column lands on.",
    });
  }
  if (!draft.whenColumn.trim() && draft.whenFromValue.trim()) {
    notes.push({
      id: "from-needs-column",
      text: "The from-value only applies with a column to watch.",
    });
  }
  const from = draft.whenFromValue.trim();
  if (from && draft.operation === "insert") {
    notes.push({ id: "from-needs-update", text: "From only applies to updates." });
  }
  if (from && from === draft.whenValue.trim()) {
    notes.push({ id: "from-equals-to", text: "From and to are the same value." });
  }
  if (knownColumns && knownColumns.length > 0) {
    const unknown = [
      draft.whenColumn,
      draft.entityKeyColumn,
      ...draft.inputMap.map((r) => r.column),
    ]
      .map((c) => c.trim())
      .filter((c) => c && !knownColumns.includes(c));
    if (unknown.length > 0) {
      notes.push({
        id: "unknown-columns",
        text: `Not in that table's columns: ${[...new Set(unknown)].join(", ")}.`,
      });
    }
  }
  const strayInputs = draft.inputMap
    .map((r) => r.input.trim())
    .filter((n) => n && !workflowInputNames.includes(n));
  if (strayInputs.length > 0) {
    notes.push({
      id: "unknown-inputs",
      text: `Not inputs of this workflow: ${strayInputs.join(", ")}.`,
    });
  }
  return notes;
}

/** True when the draft has the one thing the server cannot do without. */
export function eventDraftIsSendable(draft: EventDraft): boolean {
  return draft.table.trim().length > 0;
}

/** One-line summary pieces for a stored event source (TriggerCard). */
export function describeEventSource(source: Record<string, unknown>): string {
  const parts: string[] = [];
  const table = typeof source.table === "string" ? source.table : null;
  if (table) {
    // A source that omits `operation` IS an insert watch: the capture
    // function reads `coalesce(event_source->>'operation', 'insert')`
    // (workflow.emit_trigger_events), so the summary mirrors the server.
    const op = source.operation === "update" ? "updates" : "inserts";
    parts.push(`${table} ${op}`);
  }
  const column = typeof source.when_column === "string" ? source.when_column : null;
  if (column) {
    const to = typeof source.when_value === "string" ? source.when_value : "";
    const from =
      typeof source.when_from_value === "string" && source.when_from_value
        ? `${source.when_from_value} → `
        : "";
    parts.push(`${column}: ${from}${to}`);
  }
  if (source.organization_scope === "any") parts.push("any organization");
  return parts.join(" · ");
}

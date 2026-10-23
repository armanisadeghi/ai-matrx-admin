"use client";

/**
 * EventTriggerPane — "On a data change": when a row of a watched table
 * changes, start this workflow. Pure form over an `EventDraft`; the parent
 * owns the draft and the save. Advice here OFFERS, never blocks.
 */

import { Plus, X } from "lucide-react";

import {
  Button,
  Field,
  SegmentedControl,
  Select,
  SettingRow,
  Switch,
  RowGroup,
} from "@ai-matrx/design-system/controls";

import {
  eventSourceAdvice,
  type EventDraft,
  type EventOperation,
  type EventOrganizationScope,
} from "../event-source";
import type { PlatformTablesState } from "../usePlatformTables";

const OPERATIONS = [
  { value: "insert", label: "A row is added" },
  { value: "update", label: "A row changes" },
] as const;

const SCOPES = [
  { value: "own", label: "Our organization" },
  { value: "any", label: "Any organization" },
] as const;

export function EventTriggerPane({
  draft,
  onChange,
  catalog,
  workflowInputNames,
  isAdmin,
}: {
  draft: EventDraft;
  onChange: (next: EventDraft) => void;
  catalog: PlatformTablesState;
  workflowInputNames: readonly string[];
  isAdmin: boolean;
}) {
  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) =>
    onChange({ ...draft, [key]: value });

  const known = catalog.tables.find((t) => t.table === draft.table.trim());
  const columns = known?.columns ?? null;
  const advice = eventSourceAdvice(draft, workflowInputNames, columns);
  const listNote = catalog.error;

  const tableOptions = [
    { value: "", label: "Pick a table…" },
    ...catalog.tables.map((t) => ({ value: t.table, label: t.label, meta: t.table })),
  ];

  const setRow = (index: number, patch: Partial<EventDraft["inputMap"][number]>) =>
    set(
      "inputMap",
      draft.inputMap.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );

  return (
    <div className="space-y-3">
      <RowGroup title="What to watch">
        <SettingRow label="Table" htmlFor="event-table" line="schema.table">
          <Field
            id="event-table"
            value={draft.table}
            onChange={(e) => set("table", e.target.value)}
            placeholder="schema.table"
            width="lg"
          />
        </SettingRow>
        {catalog.tables.length > 0 ? (
          <SettingRow label="Or pick one">
            <Select
              aria-label="Pick a table"
              value={known ? known.table : ""}
              options={tableOptions}
              onValueChange={(v) => v && set("table", v)}
            />
          </SettingRow>
        ) : null}
        <SettingRow label="Start when">
          <SegmentedControl<EventOperation>
            aria-label="Which change starts it"
            value={draft.operation}
            data={OPERATIONS}
            onValueChange={(v) => set("operation", v)}
          />
        </SettingRow>
      </RowGroup>

      <RowGroup title="Only when a column changes (optional)">
        <SettingRow label="Column" htmlFor="event-when-column">
          <Field
            id="event-when-column"
            value={draft.whenColumn}
            onChange={(e) => set("whenColumn", e.target.value)}
            placeholder="status"
            width="md"
          />
        </SettingRow>
        <SettingRow label="Changes to" htmlFor="event-when-value">
          <Field
            id="event-when-value"
            value={draft.whenValue}
            onChange={(e) => set("whenValue", e.target.value)}
            placeholder="done"
            width="md"
          />
        </SettingRow>
        <SettingRow label="Changed from" htmlFor="event-when-from">
          <Field
            id="event-when-from"
            value={draft.whenFromValue}
            onChange={(e) => set("whenFromValue", e.target.value)}
            placeholder="Any value"
            width="md"
          />
        </SettingRow>
      </RowGroup>

      <RowGroup title="What to pass in">
        {draft.inputMap.map((row, index) => (
          <SettingRow key={index} label={`Input ${index + 1}`}>
            {workflowInputNames.length > 0 ? (
              <Select
                aria-label="Workflow input"
                value={row.input}
                options={[
                  { value: "", label: "Input…" },
                  ...workflowInputNames.map((n) => ({ value: n, label: n })),
                ]}
                onValueChange={(v) => setRow(index, { input: v })}
              />
            ) : (
              <Field
                aria-label="Workflow input"
                value={row.input}
                onChange={(e) => setRow(index, { input: e.target.value })}
                placeholder="Input name"
                width="md"
              />
            )}
            <Field
              aria-label="Row column"
              value={row.column}
              onChange={(e) => setRow(index, { column: e.target.value })}
              placeholder="Column"
              width="md"
            />
            <Button
              variant="quiet"
              aria-label="Remove this input"
              onClick={() =>
                set(
                  "inputMap",
                  draft.inputMap.filter((_, i) => i !== index),
                )
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </SettingRow>
        ))}
        <SettingRow label="Row to input">
          <Button
            variant="outline"
            onClick={() =>
              set("inputMap", [...draft.inputMap, { input: "", column: "" }])
            }
          >
            <Plus className="h-4 w-4" />
            Add input
          </Button>
        </SettingRow>
        <SettingRow label="Send the whole event">
          <Switch
            aria-label="Send the whole event"
            checked={draft.includeEvent}
            onCheckedChange={(v) => set("includeEvent", v)}
          />
        </SettingRow>
      </RowGroup>

      <RowGroup title="Timing">
        <SettingRow label="Row key column" htmlFor="event-key">
          <Field
            id="event-key"
            value={draft.entityKeyColumn}
            onChange={(e) => set("entityKeyColumn", e.target.value)}
            width="md"
          />
        </SettingRow>
        <SettingRow label="Wait for quiet (seconds)" htmlFor="event-debounce">
          <Field
            id="event-debounce"
            type="number"
            min={0}
            max={86400}
            value={draft.debounceSeconds}
            onChange={(e) => set("debounceSeconds", e.target.value)}
            width="sm"
          />
        </SettingRow>
        {isAdmin ? (
          <SettingRow label="Rows from">
            <SegmentedControl<EventOrganizationScope>
              aria-label="Which organizations' rows start it"
              value={draft.organizationScope}
              data={SCOPES}
              onValueChange={(v) => set("organizationScope", v)}
            />
          </SettingRow>
        ) : null}
      </RowGroup>

      {listNote ? (
        <p className="text-xs text-muted-foreground">{listNote}</p>
      ) : null}
      {advice.map((note) => (
        <p key={note.id} className="text-xs text-muted-foreground">
          {note.text}
        </p>
      ))}
    </div>
  );
}

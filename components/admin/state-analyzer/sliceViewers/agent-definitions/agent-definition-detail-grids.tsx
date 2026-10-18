"use client";

/**
 * The agent-definition slice viewers' record lists (variables, context slots, custom tools) as
 * THE shared detail grid — one per list, used by both viewers. Name is the row label; formatted
 * JSON opens into the JSON viewer; "—" reads as the column's empty mark.
 */
import { MatrxDetailGrid, type DetailGridColumn } from "@ai-matrx/design-system/data-table";
import type {
  AgentDefToolRowData,
  AgentDefVarRowData,
} from "./agent-definition-slice-viewer-model";

const blank = (value: string | null | undefined) =>
  value == null || value === "—" ? null : value;

const col = (key: string, mono = false): DetailGridColumn => ({
  key,
  label: key,
  emptyLabel: "—",
  mono,
});

export function AgentDefVariablesGrid({ rows }: { rows: readonly AgentDefVarRowData[] }) {
  return (
    <MatrxDetailGrid
      labelHeader="name"
      columns={[col("default", true), col("req"), col("help"), col("customComponent", true)]}
      rows={rows.map((v) => ({
        key: v.name,
        label: v.name,
        values: {
          default: blank(v.defaultFormatted),
          req: blank(v.required),
          help: blank(v.helpText),
          customComponent: blank(v.customComponentFormatted),
        },
      }))}
      empty="—"
      recordKind="agent-variable"
      location="State analyzer · agent definitions"
    />
  );
}

const SLOT_COLUMNS = ["type", "label", "desc", "max_inline", "summary_agent"];

export function AgentDefSlotsGrid({ rows }: { rows: readonly string[][] }) {
  return (
    <MatrxDetailGrid
      labelHeader="key"
      columns={SLOT_COLUMNS.map((key) => col(key, key === "summary_agent"))}
      rows={rows.map((cells, index) => ({
        key: `${cells[0] ?? ""}:${index}`,
        label: cells[0] ?? "",
        values: Object.fromEntries(SLOT_COLUMNS.map((key, i) => [key, blank(cells[i + 1])])),
      }))}
      empty="—"
      recordKind="agent-context-slot"
      location="State analyzer · agent definitions"
    />
  );
}

export function AgentDefToolsGrid({ rows }: { rows: readonly AgentDefToolRowData[] }) {
  return (
    <MatrxDetailGrid
      labelHeader="name"
      columns={[col("description"), col("input_schema", true)]}
      rows={rows.map((t) => ({
        key: t.name,
        label: t.name,
        values: { description: blank(t.description), input_schema: blank(t.inputSchemaFormatted) },
      }))}
      empty="—"
      recordKind="agent-custom-tool"
      location="State analyzer · agent definitions"
    />
  );
}

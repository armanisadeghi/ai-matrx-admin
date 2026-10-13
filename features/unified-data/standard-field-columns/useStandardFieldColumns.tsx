"use client";

// features/unified-data/standard-field-columns/useStandardFieldColumns.tsx
//
// THE ONE COLUMN SOURCE FOR CUSTOM FIELDS ON A STANDARD LIST (lane 7, wave 2).
//
//   const custom = useStandardFieldColumns<PartyListRow>("party", ctx?.orgIds);
//   <MatrxDataTable columns={[...PARTY_COLUMNS, ...custom.columns]} grouping={…custom.groupable…} />
//
// A list names its registry token and the organizations it spans; this hands back the
// MatrxDataTable column definitions (hidden until the person picks them in Columns), the merged
// field list the list's service needs for its server predicates, and the group-by words.
// Definitions come through the store's own door (`custom.entity_fields_across`: ONE call for
// every organization the list spans, Fields and choices together, as the person) — never a
// direct read of the field registry — and only fields the
// seat may read become columns (see ./standardFieldColumns.ts § THE FIELD RULE).
//
// 🚨 THE READ LOADS WHEN A LIST ASKS (2026-10-13, "every page drags ~18 MB"). Every table's host
// port (MatrxDataTableHost → useTableCustomFieldColumns) calls this hook, and that host is mounted on
// every route — so the records clients the read needs (@ai-matrx/records, records-ui) live in
// ./loadStandardFields and arrive through ONE `import()` inside the effect, the first time a list
// names a token. The hook itself, its state and its column shapes stay static; the source already
// answers "loading" until the read lands, so nothing a list draws changes.
//
// The organizations are the ones the LIST spans (the person's memberships), never the active
// organization (law: the active organization is never a list filter).

import { useEffect, useMemo, useState } from "react";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  columnIdFor,
  displayCustomValue,
  keyOfColumnId,
  type StandardFieldColumn,
} from "./standardFieldColumns";
import type { LoadedStandardFields } from "./loadStandardFields";

export interface StandardFieldColumnSource<TRow> {
  status: "idle" | "loading" | "ready" | "failed";
  /** Set when no organization's fields could be read; the list says so rather than hiding it. */
  error: string | null;
  /** How many of the list's organizations refused or failed (their fields are absent). */
  unavailable: number;
  fields: StandardFieldColumn[];
  /** Column definitions for the canonical table — hidden until picked in Columns. */
  columns: MatrxColumnDef<TRow>[];
  /** Column ids a person may group by (finite answers: choices, yes/no, words). */
  groupableColumnIds: string[];
  /** The group header's words for one raw value of a custom column. */
  labelOf: (columnId: string, value: unknown) => string | undefined;
  /** The RAW cell of a custom column (a choice key, `true`, a word) — what grouping compares. */
  readCell: (row: TRow, columnId: string) => unknown;
  /** Every custom column id, for the list's column state (they start hidden). */
  columnIds: string[];
}

type RowCustomFields = (row: unknown) => Record<string, unknown> | null | undefined;

const defaultRead: RowCustomFields = (row) => {
  const value = (row as { custom_fields?: unknown } | null)?.custom_fields;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

interface Loaded extends LoadedStandardFields {
  forKey: string;
}

export function useStandardFieldColumns<TRow>(
  token: string,
  organizationIds: readonly string[] | null | undefined,
  options: { readCustomFields?: (row: TRow) => Record<string, unknown> | null | undefined } = {},
): StandardFieldColumnSource<TRow> {
  const userId = useAppSelector(selectUserId);
  const orgKey = organizationIds ? [...organizationIds].sort().join(",") : null;
  const requestKey = orgKey === null ? null : `${token}|${orgKey}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (requestKey === null || orgKey === null) return;
    let cancelled = false;
    const orgs = orgKey ? orgKey.split(",") : [];
    import("./loadStandardFields")
      .then(({ loadFields }) => loadFields(token, orgs, userId ?? null))
      .then((result) => {
        if (!cancelled) setLoaded({ forKey: requestKey, ...result });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoaded({
            forKey: requestKey,
            fields: [],
            unavailable: orgs.length,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, orgKey, requestKey, userId]);

  const current = loaded && loaded.forKey === requestKey ? loaded : null;
  const fields = useMemo(() => current?.fields ?? [], [current]);
  const readCustomFields = (options.readCustomFields ?? defaultRead) as RowCustomFields;

  const columns = useMemo<MatrxColumnDef<TRow>[]>(
    () =>
      fields.map((field) => {
        const read = (row: TRow) => readCustomFields(row)?.[field.key];
        const shown = (row: TRow) => displayCustomValue(field, read(row));
        const base: MatrxColumnDef<TRow> = {
          id: columnIdFor(field.key),
          header: field.label,
          label: field.label,
          accessorFn: read,
          copyValue: shown,
          filterValue: shown,
          cell: (row) => shown(row),
          sortable: true,
          hidden: true,
          hideable: true,
          minWidth: 120,
        };
        if (field.behavior === "boolean") {
          return { ...base, filter: "boolean" };
        }
        if (field.behavior === "list" && field.options.length > 0) {
          return {
            ...base,
            filter: "select",
            filterOptions: field.options.map((o) => ({ value: o.key, label: o.label })),
          };
        }
        if (field.behavior === "range" && !field.isDate) {
          return { ...base, filter: "number", align: "right" };
        }
        return { ...base, filter: "text" };
      }),
    // readCustomFields is config, fixed per list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields],
  );

  const groupableColumnIds = useMemo(
    () => fields.filter((f) => !f.multi && f.behavior !== "range").map((f) => columnIdFor(f.key)),
    [fields],
  );

  const labelOf = useMemo(
    () => (columnId: string, value: unknown) => {
      const key = keyOfColumnId(columnId);
      const field = key ? fields.find((f) => f.key === key) : undefined;
      if (!field) return undefined;
      return displayCustomValue(field, value) || undefined;
    },
    [fields],
  );

  const readCell = (row: TRow, columnId: string) => {
    const key = keyOfColumnId(columnId);
    return key ? readCustomFields(row)?.[key] : undefined;
  };
  const columnIds = fields.map((f) => columnIdFor(f.key));

  return {
    readCell,
    columnIds,
    status: requestKey === null ? "idle" : !current ? "loading" : current.error ? "failed" : "ready",
    error: current?.error ?? null,
    unavailable: current?.unavailable ?? 0,
    fields,
    columns,
    groupableColumnIds,
    labelOf,
  };
}

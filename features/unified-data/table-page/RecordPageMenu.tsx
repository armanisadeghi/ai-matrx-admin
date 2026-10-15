"use client";

// features/unified-data/table-page/RecordPageMenu.tsx — A RECORD PAGE'S RIGHT-CLICK.
//
// The record's own page (/data/<table>/r/<record>) had no app menu: a right-click drew the browser's.
// Now it opens the designed menu with the record's actions as its feature section ("Record") — the
// ONE list records-ui draws on every record card's ⋯ and right-click (`recordActions` through
// `toDropdownEntries`), never a list of our own. Form fields keep the browser's text menu (the
// non-editable wrapper yields to it). The actions are read when the menu opens; until the record is
// read, the menu carries the global design alone.

import { useEffect, useRef, type ReactNode } from "react";
import { recordActions, recordNameIn, toDropdownEntries, useRecordActionHost, useRecordRights } from "@ai-matrx/records-ui";
import { useRecord, useTable, type ReadRow } from "@ai-matrx/records/react";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import type { ContextMenuExtraItem, ContextMenuExtraSection } from "@ai-matrx/context-menu/engine";
import { saveRowPageAsTableTemplate } from "@/features/spaces/embed/RecordBodySpace";
import { toast } from "@/lib/toast";

type Actions = ReturnType<typeof recordActions>;
type Action = Actions[number];

function toItem(action: Action): ContextMenuExtraItem {
  const disabled = action.disabledReason !== undefined;
  return {
    kind: "item",
    id: action.id,
    label: action.label,
    ...(action.shortcut ? { hint: action.shortcut } : {}),
    ...(action.destructive ? { destructive: true } : {}),
    ...(disabled ? { disabled: true, description: action.disabledReason } : {}),
    onSelect: () => {
      if (!disabled) void action.run();
    },
  };
}

/** The record's actions as the menu's section, in the order and groups the ⋯ draws them. */
export function recordPageSection(actions: Actions, name: string): ContextMenuExtraSection {
  const items: ContextMenuExtraItem[] = toDropdownEntries(actions).map((entry) => {
    if (entry.kind === "separator") return { kind: "separator", id: entry.id };
    if (entry.kind === "item") return toItem(entry.action);
    return { kind: "submenu", id: entry.id, label: entry.label, children: entry.actions.map(toItem) };
  });
  return { id: "record-page", label: name || "Record", primary: true, items };
}

/** Reads the record's actions into `into` (a hook host, so it renders nothing). */
function RecordActionsSource({ tableId, row, name, into }: { tableId: string; row: ReadRow; name: string; into: { current: ContextMenuExtraSection | null } }) {
  const host = useRecordActionHost({ tableId, row });
  // The record's own level (the same read RecordPanel makes, so no second request).
  const rights = useRecordRights(row.id);
  const section = recordPageSection(recordActions({ record: { id: row.id, tableId, name }, rights, host }), name);
  useEffect(() => {
    into.current = section;
    return () => {
      into.current = null;
    };
  }, [section, into]);
  return null;
}

export function RecordPageMenu({ tableId, recordId, children }: { tableId: string; recordId: string; children: ReactNode }) {
  const table = useTable(tableId);
  const record = useRecord(recordId);
  const row = record.data ?? null;
  const name = row?.document ? recordNameIn(table.data, row.document) : "";
  const section = useRef<ContextMenuExtraSection | null>(null);
  return (
    <NonEditableContextMenu
      sourceFeature="system"
      contextData={{ content: name || "Record" }}
      menuDesign="global"
      menuFeatureTitle="Record"
      resolveExtraSectionsOnOpen={() => {
        const sections = section.current ? [section.current] : [];
        // EVERY ROW IS A PAGE (lane ROW-PAGE-VIEWS): this row's page — its blocks and "This page's row"
        // views — becomes the table's default template; every new row's page starts from it.
        const organizationId = table.data?.organization_id;
        if (row && organizationId) {
          sections.push({
            id: "row-page",
            label: "Page",
            items: [
              {
                kind: "item",
                id: "row-page-template",
                label: "Use this page as the template",
                onSelect: () => {
                  const tableName = table.data?.name?.trim() || "Row";
                  void saveRowPageAsTableTemplate({ organizationId, tableId, recordId, name: `${tableName} page` }).then(
                    () => toast.success(`New ${tableName} rows now start from this page.`),
                    (err: unknown) => toast.error(err instanceof Error ? err.message : "The template could not be saved."),
                  );
                },
              },
            ],
          });
        }
        return sections.length ? sections : undefined;
      }}
    >
      <div className="contents">
        {row ? <RecordActionsSource tableId={tableId} row={{ id: row.record_id, document: row.document, hidden: row.hidden, level: "" /* rights: useRecordRights */ }} name={name} into={section} /> : null}
        {children}
      </div>
    </NonEditableContextMenu>
  );
}

"use client";

/**
 * Office files on a board: a Workbook (the Univer spreadsheet).
 *
 * - **Workbook** — the tile body IS `WorkbookRecord` (`features/workbooks/components/WorkbookRecord.tsx`),
 *   the very component `/workbooks/[id]` renders: the editor with its menu bar, toolbar and ribbon,
 *   rename, star / move / copy, Share, version history, comments, live collaboration, and the
 *   `matrx-user/workbooks` agent surface for this one workbook (sheets, cell snapshot, name and
 *   description write targets, the sheet-name target), mounted inside it. `embedded` only leaves
 *   the shell alone (no canvas chrome, no navigation button, no link away from the board).
 *   Start new makes a blank workbook when the person presses Create in the tile; Bring in is the
 *   platform's workbook picker.
 *
 * Pure helpers: ./office-items.logic.ts.
 */

import { useCallback } from "react";
import { FilePlus2, Sheet } from "lucide-react";
import { createWorkbook, listAccessibleWorkbooks } from "@ai-matrx/office/sheets";
import type { Workbook } from "@ai-matrx/office/core";
import { isServiceFailure } from "@/features/data-tables/types";
import { WorkbookRecord } from "@/features/workbooks/components/WorkbookRecord";
import { WorkbooksResourcePicker } from "@/features/resource-manager/resource-picker/WorkbooksResourcePicker";
import { entityComments, type BoardItemType, type ItemBodyProps, type PickerProps } from "./types";
import { RecordDraftBody, type CreateRecord } from "./RecordDraftBody";
import { titleToAdopt } from "./feature-items.logic";
import {
  NEW_WORKBOOK_NAME,
  WORKBOOK_ITEM_KEY,
  findOfficeFiles,
  officeIdOf,
  officeSource,
  workbookHref,
} from "./office-items.logic";

const pickedWorkbook = (w: { id: string; workbook_name: string | null }) => ({
  title: w.workbook_name?.trim() || NEW_WORKBOOK_NAME,
  source: officeSource(WORKBOOK_ITEM_KEY, w.id),
});

function WorkbookPicker({ onPick, onCancel }: PickerProps) {
  return (
    <div className="rounded-lg border border-border">
      <WorkbooksResourcePicker onBack={onCancel} onSelect={(w: Workbook) => onPick([pickedWorkbook(w)])} />
    </div>
  );
}

const makeWorkbook: CreateRecord = async (organizationId) => {
  const res = await createWorkbook({ name: NEW_WORKBOOK_NAME, organizationId });
  if (isServiceFailure(res)) throw new Error(res.error);
  return { id: res.data.id, name: res.data.workbook_name };
};

function WorkbookBody({ source, title, onSource }: ItemBodyProps) {
  const id = officeIdOf(WORKBOOK_ITEM_KEY, source);
  // The tile is named after its workbook (renamed here, on its page, by an agent or a collaborator).
  const follow = useCallback(
    (name: string) => {
      const next = titleToAdopt(title, name);
      if (next) onSource(source, next);
    },
    [title, source, onSource],
  );
  if (!id) {
    return (
      <RecordDraftBody
        noun="workbook"
        hint="A new spreadsheet, saved to Workbooks and editable here and at its own page."
        icon={<FilePlus2 />}
        create={makeWorkbook}
        onMade={(made) => onSource(officeSource(WORKBOOK_ITEM_KEY, made.id), made.name)}
      />
    );
  }
  return (
    <div className="h-full min-h-0 bg-card">
      <WorkbookRecord key={id} id={id} embedded onName={follow} />
    </div>
  );
}

export const OFFICE_ITEMS: readonly BoardItemType[] = [
  {
    key: WORKBOOK_ITEM_KEY,
    surface: { name: "matrx-user/workbooks" },
    comments: entityComments("workbook"),
    label: "Workbook",
    kindLabel: "workbook",
    icon: Sheet,
    group: "work",
    section: "notes",
    accent: "emerald",
    status: { none: "Its save status lives in the editor's own bar, not in a store the board can read." },
    // A sheet needs width for its columns and height for the ribbon, formula bar and rows.
    defaultSize: { w: 1100, h: 820 },
    matches: (s) => s.kind === "entity" && s.entity === WORKBOOK_ITEM_KEY,
    Body: WorkbookBody,
    startNew: { label: "New workbook", create: () => ({ title: NEW_WORKBOOK_NAME, source: officeSource(WORKBOOK_ITEM_KEY, null) }) },
    bringIn: { label: "Workbook", Picker: WorkbookPicker },
    record: {
      place: (id, title) => pickedWorkbook({ id, workbook_name: title ?? null }),
      // Not in the search projection: the workbook picker's own list (RLS: every workbook the person can open).
      find: (query, limit) =>
        findOfficeFiles(WORKBOOK_ITEM_KEY, query, limit, async () => {
          const res = await listAccessibleWorkbooks();
          if (isServiceFailure(res)) throw new Error(`Your workbooks could not be listed: ${res.error}`);
          return res.data.map((w) => ({ id: w.id, name: w.workbook_name, description: w.description, updated_at: w.updated_at }));
        }),
    },
    href: (s) => {
      const id = officeIdOf(WORKBOOK_ITEM_KEY, s);
      return id ? workbookHref(id) : null;
    },
  },
];

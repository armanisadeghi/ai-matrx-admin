"use client";

/**
 * Office files on a board: a Workbook (the Univer spreadsheet) and a Presentation (slides).
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
 * - **Presentation** — the tile body IS `PresentationEditor` (`features/presentations/components/
 *   PresentationEditor.tsx`), the very component `/presentations/[id]` renders: the slide rail, the
 *   slide edited in place, speaker notes, layouts, themes, grid view, Slideshow, version history, the
 *   File menu (copy, move, download PowerPoint / PDF), Share — and the `matrx-user/presentation` agent
 *   surface (deck, outline, current slide, name and deck-step write targets) the editor mounts itself.
 *   `embedded` only leaves the shell alone. Start new makes a blank deck when the person presses Create;
 *   Bring in lists the presentations the person can open (every organization).
 *
 * Pure helpers: ./office-items.logic.ts.
 */

import { useCallback } from "react";
import { useEffect, useState } from "react";
import { FilePlus2, Presentation, Sheet } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { createWorkbook, listAccessibleWorkbooks } from "@ai-matrx/office/sheets";
import type { Workbook } from "@ai-matrx/office/core";
import { isServiceFailure } from "@/features/data-tables/types";
import { WorkbookRecord } from "@/features/workbooks/components/WorkbookRecord";
import { PresentationEditor } from "@/features/presentations/components/PresentationEditor";
import { createPresentation, listAccessiblePresentations, type PresentationRow } from "@/features/presentations/presentation-service";
import { WorkbooksResourcePicker } from "@/features/resource-manager/resource-picker/WorkbooksResourcePicker";
import { entityComments, type BoardItemType, type ItemBodyProps, type PickerProps } from "./types";
import { RecordDraftBody, type CreateRecord } from "./RecordDraftBody";
import { PresentationStructure, WorkbookStructure } from "./structures";
import { RecordList } from "./feature-items";
import { titleToAdopt } from "./feature-items.logic";
import {
  NEW_PRESENTATION_NAME,
  NEW_WORKBOOK_NAME,
  PRESENTATION_ITEM_KEY,
  WORKBOOK_ITEM_KEY,
  findOfficeFiles,
  officeIdOf,
  officeSource,
  presentationHref,
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

// ─── Presentation ────────────────────────────────────────────────────────────

type PresentationRead = { phase: "reading" } | { phase: "read"; rows: PresentationRow[] } | { phase: "failed"; why: string };

const pickedPresentation = (p: { id: string; name: string | null }) => ({
  title: p.name?.trim() || NEW_PRESENTATION_NAME,
  source: officeSource(PRESENTATION_ITEM_KEY, p.id),
});

function PresentationPicker({ onPick, onCancel }: PickerProps) {
  const [read, setRead] = useState<PresentationRead>({ phase: "reading" });
  const [again, setAgain] = useState(0);
  useEffect(() => {
    let alive = true;
    setRead({ phase: "reading" });
    listAccessiblePresentations().then((res) => {
      if (!alive) return;
      setRead(isServiceFailure(res) ? { phase: "failed", why: res.error } : { phase: "read", rows: res.data });
    });
    return () => {
      alive = false;
    };
  }, [again]);
  return (
    <div className="max-h-[min(560px,70dvh)] overflow-y-auto">
      <RecordList
        rows={read.phase === "read" ? read.rows : []}
        read={readOf(
          { loading: read.phase === "reading", error: read.phase === "failed" ? new Error(read.why) : null },
          { what: "your presentations", onRetry: () => setAgain((n) => n + 1) },
        )}
        rowKey={(p) => p.id}
        rowText={(p) => `${p.name} ${p.description ?? ""}`}
        onChoose={(p) => onPick([pickedPresentation(p)])}
        onCancel={onCancel}
        emptyState={<>No presentations yet. Make one with New presentation.</>}
        renderRow={(p) => <span className="min-w-0 flex-1 truncate">{p.name}</span>}
      />
    </div>
  );
}

const makePresentation: CreateRecord = async (organizationId) => {
  const res = await createPresentation({ name: NEW_PRESENTATION_NAME, organizationId });
  if (isServiceFailure(res)) throw new Error(res.error);
  return { id: res.data.id, name: res.data.name };
};

function PresentationBody({ source, title, onSource }: ItemBodyProps) {
  const id = officeIdOf(PRESENTATION_ITEM_KEY, source);
  // The tile is named after its presentation (the editor reports the file's name as it changes).
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
        noun="presentation"
        hint="A new deck, saved to Presentations and editable here and at its own page."
        icon={<FilePlus2 />}
        create={makePresentation}
        onMade={(made) => onSource(officeSource(PRESENTATION_ITEM_KEY, made.id), made.name)}
      />
    );
  }
  return (
    <div className="h-full min-h-0 bg-card">
      <PresentationEditor key={id} presentationId={id} embedded onName={follow} />
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
    structure: WorkbookStructure,
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
  {
    key: PRESENTATION_ITEM_KEY,
    surface: { name: "matrx-user/presentation" },
    comments: entityComments("presentation"),
    label: "Presentation",
    kindLabel: "presentation",
    icon: Presentation,
    group: "work",
    section: "notes",
    accent: "amber",
    status: { none: "Its save status lives in the editor's own bar, not in a store the board can read." },
    // Slide rail beside a 16:9 slide, notes under it, ribbon above: wide and tall.
    defaultSize: { w: 1200, h: 820 },
    structure: PresentationStructure,
    matches: (s) => s.kind === "entity" && s.entity === PRESENTATION_ITEM_KEY,
    Body: PresentationBody,
    startNew: { label: "New presentation", create: () => ({ title: NEW_PRESENTATION_NAME, source: officeSource(PRESENTATION_ITEM_KEY, null) }) },
    bringIn: { label: "Presentation", Picker: PresentationPicker },
    record: {
      place: (id, title) => pickedPresentation({ id, name: title ?? null }),
      // Not in the search projection: the presentation picker's own list, matched on the name.
      find: (query, limit) =>
        findOfficeFiles(PRESENTATION_ITEM_KEY, query, limit, async () => {
          const res = await listAccessiblePresentations();
          if (isServiceFailure(res)) throw new Error(`Your presentations could not be listed: ${res.error}`);
          return res.data.map((p) => ({ id: p.id, name: p.name, description: p.description, updated_at: p.updated_at }));
        }),
    },
    href: (s) => {
      const id = officeIdOf(PRESENTATION_ITEM_KEY, s);
      return id ? presentationHref(id) : null;
    },
  },
];

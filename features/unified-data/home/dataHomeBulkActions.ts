// features/unified-data/home/dataHomeBulkActions.ts — THE BULK TWIN RULE for the Data home.
//
// A row's ⋯ here can Archive (a table, a form), Restore (from the Archived filter) and flip its
// favorite star. The same verbs work on a SELECTION: each is declared once in DATA_HOME_VERBS and
// its twin below calls the SAME door the row's menu calls (`archiveTableFromHome`,
// `archiveFormFromHome`, `restoreTableIn`, `restoreFormFromHome`, the marks). A selected row a verb
// does not fit is skipped and NAMED; a refusal from the store is named with the store's own sentence.
// Archives and restores run one after another: a big table archives in passes, and the database
// timed out when several ran at once.

import { Archive, ArchiveRestore, Star, StarOff } from "lucide-react";
import { bulkActionsFromRowVerbs, type BulkTargets, type RegistryTwin } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { DATA_HOME_STAR_CAP } from "./useDataHomeMarks";
import type { DataHomeRow } from "./dataHomeRows";

/** The verbs a Data home row has in its menu that change something. */
export const DATA_HOME_VERBS = [
  { id: "archive", label: "Archive", icon: Archive, danger: true },
  { id: "restore", label: "Restore", icon: ArchiveRestore },
  { id: "favorite", label: "Add to favorites", icon: Star },
  { id: "unfavorite", label: "Remove from favorites", icon: StarOff },
] as const;

export interface DataHomeBulkDeps {
  /** The one archive for a table row; `null` = archived, else the sentence for why not. */
  archiveTable: (row: DataHomeRow) => Promise<string | null>;
  archiveForm: (row: DataHomeRow) => Promise<string | null>;
  restoreTable: (row: DataHomeRow) => Promise<string | null>;
  restoreForm: (row: DataHomeRow) => Promise<string | null>;
  isStarred: (row: DataHomeRow) => boolean;
  /** Sets the stars of every id; returns the ids the cap refused. */
  setStarred: (ids: string[], on: boolean) => string[];
  /** The list reads again once a batch is done. */
  onChanged: () => void;
}

const isTable = (row: DataHomeRow) => row.kind === "table" && Boolean(row.tableId) && Boolean(row.organizationId);
const isForm = (row: DataHomeRow) => (row.kind === "form" || row.kind === "booking") && Boolean(row.organizationId);

/** Why Archive skips this row, or null. */
export function archiveSkip(row: DataHomeRow): string | null {
  if (row.archived) return "Already archived";
  if (row.kind === "form") return null;
  if (isTable(row)) return null;
  return "Only tables and forms archive from here";
}

/** Why Restore skips this row, or null. */
export function restoreSkip(row: DataHomeRow): string | null {
  if (!row.archived) return "Not archived";
  if (row.restoreBlockedReason) return row.restoreBlockedReason;
  if (isTable(row) || isForm(row)) return null;
  return "Restore it from its table";
}

/** Run a door over each target, one after another; names each refusal. */
async function oneByOne(targets: BulkTargets<DataHomeRow>, door: (row: DataHomeRow) => Promise<string | null>) {
  const failed: { id: string; reason: string }[] = [];
  // A ticked id whose row is not loaded cannot run: name it instead of counting it done.
  const loaded = new Set(targets.rows.map((r) => r.id));
  for (const id of targets.ids) if (!loaded.has(id)) failed.push({ id, reason: "Not loaded" });
  for (const row of targets.rows) {
    try {
      const sentence = await door(row);
      if (sentence) failed.push({ id: row.id, reason: sentence });
    } catch (thrown) {
      failed.push({ id: row.id, reason: thrown instanceof Error && thrown.message ? thrown.message : "Didn’t finish" });
    }
  }
  return { failed };
}

export function dataHomeBulkActions(deps: DataHomeBulkDeps): EntityBulkAction<DataHomeRow>[] {
  const twins: { [K in (typeof DATA_HOME_VERBS)[number]["id"]]: RegistryTwin<DataHomeRow> } = {
    archive: {
      done: "Archived",
      removesRows: true,
      skipReason: archiveSkip,
      confirm: (t) => ({
        title: `Archive ${t.ids.length} ${t.ids.length === 1 ? "item" : "items"}?`,
        description: "Each table goes with its records to the Archived filter, where Restore brings it back. A table too big to archive here is skipped and named.",
        confirmLabel: "Archive",
        variant: "destructive",
      }),
      run: async (targets) => {
        const out = await oneByOne(targets, (row) => (row.kind === "form" ? deps.archiveForm(row) : deps.archiveTable(row)));
        deps.onChanged();
        return out;
      },
    },
    restore: {
      done: "Restored",
      removesRows: true,
      skipReason: restoreSkip,
      run: async (targets) => {
        const out = await oneByOne(targets, (row) => (row.kind === "table" ? deps.restoreTable(row) : deps.restoreForm(row)));
        deps.onChanged();
        return out;
      },
    },
    favorite: {
      done: "Added to favorites",
      skipReason: (row) => (row.archived ? "Archived items can’t be starred" : deps.isStarred(row) ? "Already a favorite" : null),
      run: async (targets) => {
        const refused = new Set(deps.setStarred(targets.ids, true));
        return {
          failed: [...refused].map((id) => ({ id, reason: `You can keep up to ${DATA_HOME_STAR_CAP} favorites` })),
        };
      },
    },
    unfavorite: {
      done: "Removed from favorites",
      skipReason: (row) => (deps.isStarred(row) ? null : "Not a favorite"),
      run: async (targets) => {
        deps.setStarred(targets.ids, false);
        return {};
      },
    },
  };
  return bulkActionsFromRowVerbs(DATA_HOME_VERBS, twins, {
    noun: "item",
    getRowId: (row) => row.id,
    getRowName: (row) => row.name,
  });
}

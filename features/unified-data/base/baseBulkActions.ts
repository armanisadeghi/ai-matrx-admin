// features/unified-data/base/baseBulkActions.ts — THE BULK TWIN RULE for the Bases list.
//
// A base's page can Archive it (its tables go through the one table door, then its name row). The list
// offers the same verb on a selection: it calls the same `archiveBase` per base, one after another (each
// base archives its tables in passes), and a base that stops part way is named with the sentence the
// page would show.

import { Archive } from "lucide-react";
import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { archiveBase } from "./archiveBase";
import type { HomeTable } from "./baseStore";

export interface BaseListRow {
  homeId: string;
  name: string;
  /** The tables the base holds (what archives with it). */
  tableList: Array<Pick<HomeTable, "id" | "name">>;
  /** The base's name row, when it was named. */
  identityId: string | null;
}

export const BASE_VERBS = [{ id: "archive", label: "Archive", icon: Archive, danger: true }] as const;

export interface BaseBulkDeps {
  archiveTable: (tableId: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  archiveIdentity: (identityId: string) => Promise<void>;
}

export function baseBulkActions(deps: BaseBulkDeps): EntityBulkAction<BaseListRow>[] {
  return bulkActionsFromRowVerbs(
    BASE_VERBS,
    {
      archive: {
        done: "Archived",
        removesRows: true,
        confirm: (t) => {
          const tables = t.rows.reduce((n, row) => n + row.tableList.length, 0);
          return {
            title: `Archive ${t.ids.length} ${t.ids.length === 1 ? "base" : "bases"}?`,
            description: `Their ${tables} ${tables === 1 ? "table is" : "tables are"} archived with them. Restore the tables from the Archived filter.`,
            confirmLabel: "Archive",
            variant: "destructive",
          };
        },
        runOne: async (_id, row) => {
          if (!row) throw new Error("The base is no longer listed");
          const identityId = row.identityId;
          const result = await archiveBase(row.tableList.map((t) => ({ id: t.id, name: t.name })), {
            archiveTable: deps.archiveTable,
            archiveIdentity: identityId ? () => deps.archiveIdentity(identityId) : null,
          });
          if (!result.ok) throw new Error(result.sentence);
        },
      },
    },
    { noun: "base", getRowId: (row) => row.homeId, getRowName: (row) => row.name },
  );
}

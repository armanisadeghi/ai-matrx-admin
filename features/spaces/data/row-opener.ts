// features/spaces/data/row-opener.ts — WHERE A ROW A BUTTON JUST MADE OPENS ON A SPACES PAGE.
//
// An add-a-row button ("Add task" on a project) makes a row in ANOTHER table and asks the host to open it
// (records-ui `host.openRecord`). On a Spaces page that is the database block's own peek — the way Spaces
// opens any row — never the Data route, which would leave the page. The mount (DataMount) owns one opener;
// the database block inside it registers the function that opens a row in its peek.

import { createContext } from "react";

export type OpenRow = (tableId: string, recordId: string) => void;

export interface RowOpener {
  /** The mounted block says how it opens a row in its peek; the returned function undoes it. */
  register: (open: OpenRow) => () => void;
  /** Opens the row in the mounted block's peek; false when no block is mounted. */
  open: (tableId: string, recordId: string) => boolean;
}

export function createRowOpener(): RowOpener {
  let current: OpenRow | null = null;
  return {
    register: (open) => {
      current = open;
      return () => {
        if (current === open) current = null;
      };
    },
    open: (tableId, recordId) => {
      if (!current) return false;
      current(tableId, recordId);
      return true;
    },
  };
}

export const RowOpenerContext = createContext<RowOpener | null>(null);

/**
 * The host's `openRecord`: the block's peek when a block is mounted, else the stand-in the app's host
 * always had (the record's own page), so a press is never a silent no-op.
 */
export function openRecordPort(opener: RowOpener, elsewhere: (tableId: string, recordId: string) => void): (args: { table: { id: string }; recordId: string }) => void {
  return ({ table, recordId }) => {
    if (!opener.open(table.id, recordId)) elsewhere(table.id, recordId);
  };
}

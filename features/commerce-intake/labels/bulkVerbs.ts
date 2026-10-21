// features/commerce-intake/labels/bulkVerbs.ts
//
// The bulk twins of the label-batch row menu (useLabelBatchRowActions). The row
// menu declares Open / Open in new tab / Print (navigation, single) and Void
// batch; Void is the only mutating verb, so it is the only twin.

import { Ban, ExternalLink, Eye, Printer } from "lucide-react";

import {
  bulkActionsFromRowVerbs,
  type NoBulkReason,
} from "@/lib/entity-list/rowVerbs";

import { loadLabelBatch, voidBatch } from "./service";
import type { LabelBatchListRow } from "./types";

const LABEL_BATCH_VERBS = [
  { id: "open", label: "Open", icon: Eye },
  { id: "open-tab", label: "Open in new tab", icon: ExternalLink },
  { id: "print", label: "Print / preview", icon: Printer },
  { id: "void", label: "Void batch", icon: Ban, danger: true },
] as const;

const NO_BULK: { noBulk: NoBulkReason } = { noBulk: "open" };

export const LABEL_BATCH_BULK_ACTIONS = bulkActionsFromRowVerbs<
  (typeof LABEL_BATCH_VERBS)[number],
  LabelBatchListRow
>(
  LABEL_BATCH_VERBS,
  {
    open: NO_BULK,
    "open-tab": NO_BULK,
    print: NO_BULK,
    void: {
      label: "Void batches",
      done: "Voided",
      confirm: (targets) => ({
        title: `Void ${targets.ids.length} label ${targets.ids.length === 1 ? "batch" : "batches"}?`,
        description:
          "Every remaining unassigned code in each batch is voided — scanning one will be refused. Codes already assigned to items keep working.",
        confirmLabel: "Void batches",
      }),
      runOne: async (id) => {
        const batch = await loadLabelBatch(id);
        if (!batch) throw new Error("This batch no longer exists.");
        await voidBatch(batch, "batch voided from the batches list");
      },
    },
  },
  {
    noun: "label batch",
    getRowId: (row) => row.id,
    getRowName: (row) => row.purpose || "Label batch",
    blocked: (verb, row) =>
      verb.id === "void" && row.state === "void" ? "Already void" : null,
  },
);

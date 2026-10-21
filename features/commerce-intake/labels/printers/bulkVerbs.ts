// features/commerce-intake/labels/printers/bulkVerbs.ts
//
// The bulk twins of the certified-printer row menu (useCertifiedPrinterRowActions).
// Open / Open in new tab are navigation (single); Re-check and Delete
// certification are the mutating verbs.

import { ExternalLink, Eye, RotateCcw, Trash2 } from "lucide-react";

import {
  bulkActionsFromRowVerbs,
  type NoBulkReason,
} from "@/lib/entity-list/rowVerbs";

import { deleteCertifiedPrinter, markNeedsRecheck } from "./service";
import { printerDisplayName, type CertifiedPrinterListRow } from "./types";

const PRINTER_VERBS = [
  { id: "open", label: "Open", icon: Eye },
  { id: "open-tab", label: "Open in new tab", icon: ExternalLink },
  { id: "recheck", label: "Re-check this printer", icon: RotateCcw },
  { id: "delete", label: "Delete certification", icon: Trash2, danger: true },
] as const;

const NO_BULK: { noBulk: NoBulkReason } = { noBulk: "open" };

export const CERTIFIED_PRINTER_BULK_ACTIONS = bulkActionsFromRowVerbs<
  (typeof PRINTER_VERBS)[number],
  CertifiedPrinterListRow
>(
  PRINTER_VERBS,
  {
    open: NO_BULK,
    "open-tab": NO_BULK,
    recheck: {
      label: "Re-check printers",
      done: "Marked for re-check",
      runOne: (id) => markNeedsRecheck(id),
    },
    delete: {
      label: "Delete certifications",
      done: "Deleted",
      removesRows: true,
      confirm: (targets) => ({
        title: `Delete ${targets.ids.length} printer ${targets.ids.length === 1 ? "certification" : "certifications"}?`,
        description:
          "The recorded test results and their answers are removed from this list. Each printer would need the four calibration checks again to be certified.",
        confirmLabel: "Delete certifications",
      }),
      runOne: (id) => deleteCertifiedPrinter(id),
    },
  },
  {
    noun: "certified printer",
    getRowId: (row) => row.id,
    getRowName: (row) => printerDisplayName(row),
    blocked: (verb, row) =>
      verb.id === "recheck" && row.status === "needs_recheck"
        ? "Already needs a re-check"
        : null,
  },
);

// features/rich-document/actions/handlers/transfer.ts
//
// "Save to a table…" — the one table capture for every source. The copy, download and print rows
// that lived here moved into @ai-matrx/chat (registerChatMessageActions, message-actions W1a).

import { Database } from "lucide-react";
import { registerActionIfAbsent } from "./register-if-absent";
import { deriveContentTitle } from "../utils";
import { hasTableShape } from "@ai-matrx/records-ui/table-shape";
import { liveSelectionShapeText } from "@ai-matrx/rich-content/selection-toolbar/selection-shape";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import type { RichDocumentActionContext } from "@ai-matrx/rich-content/rich-document/types";

/**
 * THE ONE "SAVE TO A TABLE" (lane SAVE-AS-TABLE-EVERYWHERE, 2026-09-29). Offered whenever the one
 * shape reader (`hasTableShape`, records-ui) finds rows in what was right-clicked or selected — a
 * table, a list or a few bullets, `Key: value` lines, CSV/TSV, a kind value, JSON rows — and it opens
 * the `saveToTable` overlay: a new table, or rows added to one the person has. No host dialog, no
 * per-surface parse: chat, notes, every RichDocument and the right-click menu reach the same screen.
 */
/**
 * What "Save to a table" saves, in order: a table-shaped selection; the rows the host says the
 * content IS (`callbacks.tableRows` — a transcript's lines, a thread's messages), narrowed to the
 * selection when there is one; the content's own table shape. Null → the action is absent.
 */
const tableSource = (
  ctx: RichDocumentActionContext,
): { text: string } | { rows: ReadonlyArray<Record<string, unknown>> } | null => {
  // BREAKER-3 B3-16: a selection over RENDERED content (a nested list, a table's rows) is read from
  // the selected DOM, which keeps its shape; the flattened words are the fallback.
  const rendered = liveSelectionShapeText();
  if (rendered && hasTableShape(rendered)) return { text: rendered };
  const selected = ctx.applicationScope?.selection;
  if (typeof selected === "string" && hasTableShape(selected)) return { text: selected };
  // A right-click ON a rendered table is about that table — not the first list or table the
  // whole answer holds (a bullet list above it would otherwise win shape 0).
  const clicked = ctx.callbacks?.tableAtTarget?.();
  if (clicked && hasTableShape(clicked)) return { text: clicked };
  const words = typeof selected === "string" && selected.trim() ? selected : null;
  const rows = ctx.callbacks?.tableRows?.(words);
  if (rows && rows.length > 0) return { rows };
  return hasTableShape(ctx.content) ? { text: ctx.content } : null;
};

registerActionIfAbsent({
  id: "save-table-as-data",
  label: "Save to a table…",
  icon: Database,
  iconColor: "text-emerald-500 dark:text-emerald-400",
  category: "save",
  supportedSources: "*",
  renderSlot: "overflow",
  order: 14,
  requiresAuth: true,
  visible: (ctx) => tableSource(ctx) !== null,
  run: (ctx) => {
    const source = tableSource(ctx);
    if (!source) return;
    ctx.onClose();
    ctx.dispatch(
      openOverlay({
        overlayId: "saveToTable",
        instanceId: ctx.instanceKey("save-to-table"),
        data: {
          text: "text" in source ? source.text : null,
          value: "rows" in source ? source.rows : null,
          hasValue: "rows" in source,
          grid: null,
          title: deriveContentTitle(ctx) ?? null,
          shapeIndex: 0,
          organizationId: ctx.organizationId,
          callbackGroupId: null,
        },
      }),
    );
  },
});


// features/html-pages/utils/htmlPageBulkActions.ts
//
// The bulk twins of the published-page row menu (HtmlPageActions): Edit, View
// live, Copy URL and Promote to site act on ONE page (a link, the clipboard, a
// dialog), so they declare no twin; Delete (Move to Trash) is the one mutating
// verb and runs the same door the row uses (`onDeletePage`).

import { Copy, ExternalLink, Pencil, Rocket, Trash2 } from "lucide-react";

import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { HtmlPageSummary } from "@/features/html-pages/types";

const HTML_PAGE_VERBS = [
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "view-live", label: "View live", icon: ExternalLink },
  { id: "copy-url", label: "Copy URL", icon: Copy },
  { id: "promote", label: "Promote to site", icon: Rocket },
  { id: "delete", label: "Move to Trash", icon: Trash2, danger: true },
] as const;

export function buildHtmlPageBulkActions(
  deletePage: (pageId: string) => void | Promise<void>,
) {
  return bulkActionsFromRowVerbs<
    (typeof HTML_PAGE_VERBS)[number],
    HtmlPageSummary
  >(
    HTML_PAGE_VERBS,
    {
      edit: { noBulk: "edit" },
      "view-live": { noBulk: "open" },
      "copy-url": { noBulk: "copy" },
      promote: { noBulk: "single" },
      delete: {
        done: "Moved to Trash",
        removesRows: true,
        confirm: (targets) => ({
          title: `Move ${targets.ids.length} published ${targets.ids.length === 1 ? "page" : "pages"} to Trash?`,
          description:
            "Each live URL stops working until you restore the page.",
          confirmLabel: "Move to Trash",
        }),
        runOne: async (id) => {
          await deletePage(id);
        },
      },
    },
    {
      noun: "page",
      getRowId: (page) => page.id,
      getRowName: (page) => page.meta_title || "Untitled",
    },
  );
}

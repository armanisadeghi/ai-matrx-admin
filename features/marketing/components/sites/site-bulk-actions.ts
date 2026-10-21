import {
  Braces,
  Copy,
  ExternalLink,
  Eye,
  PanelsTopLeft,
  Pencil,
  Trash2,
} from "lucide-react";

import { bulkActionsFromRowVerbs } from "@/lib/entity-list/rowVerbs";
import type { SiteListRow } from "@/features/marketing/types";

// The bulk twins of buildSiteMenu (site-actions.tsx). Every menu id is listed
// here with its bulk decision, so a new menu verb without one is a type error.
// Delete is the one mutating verb; it runs the same door as the row
// (`useDeleteSite` → deleteSite), so a refusal (a governed denial) is skipped
// and named per site.
const SITE_VERBS = [
  { id: "workspace", label: "Open workspace", icon: PanelsTopLeft },
  { id: "quick-view", label: "Quick view", icon: Eye },
  { id: "live-site", label: "Open live site", icon: ExternalLink },
  { id: "copy-summary", label: "Copy summary", icon: Copy },
  { id: "copy-ai", label: "Copy for AI", icon: Braces },
  { id: "edit", label: "Edit site", icon: Pencil },
  { id: "delete", label: "Delete site", icon: Trash2, danger: true },
] as const;

export function buildSiteBulkActions(
  deleteSite: (siteId: string) => Promise<unknown>,
) {
  return bulkActionsFromRowVerbs<(typeof SITE_VERBS)[number], SiteListRow>(
    SITE_VERBS,
    {
      workspace: { noBulk: "open" },
      "quick-view": { noBulk: "view" },
      "live-site": { noBulk: "open" },
      "copy-summary": { noBulk: "copy" },
      "copy-ai": { noBulk: "copy" },
      edit: { noBulk: "edit" },
      delete: {
        label: "Delete sites",
        done: "Deleted",
        removesRows: true,
        confirm: (targets) => ({
          title: `Delete ${targets.ids.length} ${targets.ids.length === 1 ? "site" : "sites"}?`,
          description:
            "Each site leaves every list now; its schedules, presets, crawls and property are removed, and its pages, links and crawl history follow in the background.",
          confirmLabel: "Delete sites",
        }),
        runOne: async (id) => {
          await deleteSite(id);
        },
      },
    },
    {
      noun: "site",
      getRowId: (site) => site.id,
      getRowName: (site) => site.name,
    },
  );
}

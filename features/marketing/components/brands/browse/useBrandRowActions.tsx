"use client";

// features/marketing/components/brands/browse/useBrandRowActions.tsx
//
// The ONE action list for a brand row (ItemMenuConfig) — the kebab, the phone card and the right-click menu
// all read this builder. Every verb the old portfolio had: Open, Edit, Enrich with Smart Add, Archive /
// Restore, Hide for me. Archive goes through BrandArchiveFlow (it names what the archive takes with it).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ExternalLink, EyeOff, Landmark, Pencil, ScanSearch } from "lucide-react";
import type { ItemMenuConfig } from "@ai-matrx/chat/ui/item-types";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import type { EntityListController, EntityRowActionsResult } from "@/lib/entity-list/config";
import { useHideForMe } from "@ai-matrx/sharing/access/react";
import { useRestoreBrand } from "@/features/marketing/data/hooks";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { supabase } from "@/utils/supabase/client";
import { commitChange } from "@ai-matrx/data/db";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { BrandArchiveFlow } from "@/features/marketing/components/brands/BrandArchiveFlow";
import { BrandEditorDialog } from "@/features/marketing/components/brands/BrandEditorDialog";
import { forgetBrandListReads, type BrandBrowseRow } from "./service";

/**
 * THE BULK TWIN RULE: the two mutating verbs, declared once, both with a twin. Archive goes through the
 * same change engine door the row's review window commits (`commitChange` verb "delete"); the confirm
 * names the count and what goes with each brand, and a brand the server refuses is skipped and named.
 * The row's window then offers the SHARED items to archive too; in bulk those stay (named in the confirm).
 * The menu below is the row surface; `BRAND_BULK_ACTIONS` is what the list's selection bar offers.
 */
export const { bulkActions: BRAND_BULK_ACTIONS } = defineRowVerbs<BrandBrowseRow>(
  [
    {
      id: "restore",
      icon: ArchiveRestore,
      label: "Restore brand",
      appliesTo: (row) => row.archived,
      onClick: () => undefined,
      bulk: {
        done: "Restored",
        skipReason: (row) => (row.archived ? null : "Not archived"),
        runOne: async (id) => {
          await commitChange(supabase, { verb: "restore", entityType: "web_brand", ids: [id] }, {}, "");
        },
      },
    },
    {
      id: "archive",
      icon: Archive,
      label: "Archive brand",
      tone: "destructive",
      appliesTo: (row) => !row.archived,
      unavailableTooltip: "Already archived",
      onClick: () => undefined,
      bulk: {
        done: "Archived",
        removesRows: true,
        skipReason: (row) => (row.archived ? "Already archived" : null),
        confirm: (targets) => ({
          title: `Archive ${targets.ids.length} ${targets.ids.length === 1 ? "brand" : "brands"}?`,
          description:
            "Each brand and everything that goes with it leaves your lists. Things shared with other people stay. Restore them from Archived.",
          confirmLabel: "Archive",
          variant: "destructive",
        }),
        runOne: async (id) => {
          await commitChange(supabase, { verb: "delete", entityType: "web_brand", ids: [id] }, {}, "");
        },
      },
    },
  ],
  { noun: "brand", getRowId: (row) => row.id, getRowName: (row) => row.name },
);

export function useBrandRowActions(list: EntityListController<BrandBrowseRow>): EntityRowActionsResult<BrandBrowseRow> {
  const router = useRouter();
  const [editing, setEditing] = useState<BrandBrowseRow | null>(null);
  const [archiving, setArchiving] = useState<BrandBrowseRow | null>(null);
  const restoreMutation = useRestoreBrand();
  const { hide } = useHideForMe("web_brand", () => {
    forgetBrandListReads();
    list.refresh();
  });

  const changed = () => {
    forgetBrandListReads();
    list.refresh();
  };

  const restore = async (row: BrandBrowseRow) => {
    try {
      await restoreMutation.mutateAsync(row.id);
      changed();
      toast.success(`Restored ${row.name}`);
    } catch (error) {
      toast.error("Could not restore brand", { description: extractErrorMessage(error) });
    }
  };

  const hideForMe = async (row: BrandBrowseRow) => {
    try {
      await hide.mutateAsync({ id: row.id, label: row.name });
      toast.success(`Hid ${row.name}. Find it under Hidden.`);
    } catch (error) {
      toast.error("Could not hide brand", { description: extractErrorMessage(error) });
    }
  };

  const menuFor = (row: BrandBrowseRow) => (): ItemMenuConfig => {
    if (row.archived) {
      return {
        header: { title: row.name },
        sections: [
          {
            id: "manage",
            items: [
              { id: "edit", label: "Edit brand…", icon: Pencil, onSelect: () => setEditing(row) },
              { id: "restore", label: "Restore brand", icon: ArchiveRestore, onSelect: () => void restore(row) },
            ],
          },
        ],
      };
    }
    const href = marketingRoutes.brand(row.id);
    return {
      header: { title: row.name },
      sections: [
        {
          id: "open",
          items: [
            { id: "open", label: "Open brand", icon: Landmark, kind: "link", href },
            { id: "open-tab", label: "Open in new tab", icon: ExternalLink, kind: "link", href, target: "_blank" },
          ],
        },
        {
          id: "manage",
          label: "Manage",
          items: [
            { id: "edit", label: "Edit brand…", icon: Pencil, onSelect: () => setEditing(row) },
            {
              id: "enrich",
              label: "Enrich with Smart Add",
              icon: ScanSearch,
              onSelect: () => router.push(marketingRoutes.smartAddEnrich(row.id)),
            },
            { id: "hide", label: "Hide for me", icon: EyeOff, onSelect: () => void hideForMe(row) },
          ],
        },
        {
          id: "danger",
          label: "Danger",
          items: [
            { id: "archive", label: "Archive brand", icon: Archive, tone: "destructive", onSelect: () => setArchiving(row) },
          ],
        },
      ],
    };
  };

  const modals = (
    <>
      <BrandEditorDialog
        open={editing !== null}
        onOpenChange={(next) => {
          if (!next) {
            setEditing(null);
            changed();
          }
        }}
        brand={editing}
      />
      <BrandArchiveFlow
        brand={archiving ? { id: archiving.id, name: archiving.name } : null}
        onCancel={() => setArchiving(null)}
        onDone={() => {
          setArchiving(null);
          changed();
        }}
      />
    </>
  );

  return { actions: { menuFor, onOpenRow: (row) => router.push(marketingRoutes.brand(row.id)) }, modals };
}

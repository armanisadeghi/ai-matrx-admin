"use client";

/**
 * BrandArchiveFlow — THE brand archive, used by the brand page and the brands list (one canonical action).
 *
 * Smart Add fresh start (smart-add-brand VISION Part 11, 2026-10-14): one confirm archives the brand and
 * everything it owns (`web.brand_archive` → platform.soft_delete_edge cascade edges + the brand extras
 * trigger), so the same person or company can run through Smart Add again from zero. The confirm names the
 * consequence first, from live counts. Then a window panel lists the SHARED things the brand was linked to
 * (people, other records) with checkboxes, so the person can archive those too.
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import {
  marketingKeys,
  useArchiveBrand,
  useArchiveBrandAssociatedItems,
  useBrandArchivePreview,
  useBrandAssociatedItems,
} from "@/features/marketing/data/hooks";
import type { BrandArchiveCounts } from "@/features/marketing/data/service";
import { extractErrorMessage } from "@/utils/errors";
import { GovernedActionDialog } from "@/features/access-gate/components/GovernedActionDialog";
import { isGovernedActionDenial } from "@/features/access-gate/lib/governedActionError";
import { useRemovalRights } from "@/features/access-gate/hooks/useHiddenByMe";
import { marketingRoutes } from "@/features/marketing/lib/routes";

const COUNT_LABELS: Array<[keyof BrandArchiveCounts, string, string]> = [
  ["websites", "website", "websites"],
  ["accounts", "account", "accounts"],
  ["posts", "post", "posts"],
  ["findings", "finding", "findings"],
  ["facts", "fact", "facts"],
  ["assets", "image", "images"],
  ["offerings", "offering", "offerings"],
  ["exclusions", "exclusion", "exclusions"],
  ["pages", "crawled page", "crawled pages"],
  ["running_jobs", "running job", "running jobs"],
];

/** "Archives this brand, 3 websites, 5 accounts, 210 posts, 40 findings." */
export function brandArchiveConsequence(counts: BrandArchiveCounts | undefined): string {
  if (!counts) return "Archives this brand and everything it owns.";
  const parts = COUNT_LABELS.flatMap(([key, one, many]) => {
    const n = Number(counts[key] ?? 0);
    return n > 0 ? [`${n.toLocaleString()} ${n === 1 ? one : many}`] : [];
  });
  return parts.length
    ? `Archives this brand, ${parts.join(", ")}. Restore brings it all back.`
    : "Archives this brand. Restore brings it back.";
}

export interface BrandArchiveFlowProps {
  /** The brand to archive; null = closed. */
  brand: { id: string; name: string } | null;
  /** Called when the confirm is dismissed without archiving. */
  onCancel: () => void;
  /** Called once the whole flow is finished (after the shared-items panel closes). */
  onDone?: (brandId: string) => void;
}

export function BrandArchiveFlow({ brand, onCancel, onDone }: BrandArchiveFlowProps) {
  const [archived, setArchived] = useState<{ id: string; name: string } | null>(null);
  const [refusedId, setRefusedId] = useState<string | null>(null);
  // Check first (Arman, 2026-10-14): a person who may not archive this brand sees their options —
  // ask the owner, or hide it for themselves — instead of a confirm that can only fail.
  const rights = useRemovalRights("web_brand", brand && !archived ? brand.id : null);
  const refused = Boolean(brand) && (rights.data?.canRemove === false || refusedId === brand?.id);
  const preview = useBrandArchivePreview(brand && !archived && !refused ? brand.id : null);
  const archive = useArchiveBrand();

  return (
    <>
      {brand ? (
        <GovernedActionDialog
          open={refused}
          onOpenChange={(open) => {
            if (!open) {
              setRefusedId(null);
              onCancel();
            }
          }}
          resourceType="web_brand"
          resourceId={brand.id}
          itemName={brand.name}
          itemLabel="brand"
          action="archive"
          href={marketingRoutes.brand(brand.id)}
          invalidateOnHide={[[...marketingKeys.root, "brands"]]}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(brand) && !archived && !refused}
        onOpenChange={(open) => {
          if (!open && !archive.isPending) onCancel();
        }}
        title={brand ? `Archive ${brand.name}?` : "Archive brand?"}
        description={preview.isLoading ? "Counting what goes with it…" : brandArchiveConsequence(preview.data)}
        variant="destructive"
        confirmLabel="Archive brand"
        busy={archive.isPending || rights.isLoading}
        onConfirm={async () => {
          if (!brand) return;
          try {
            await archive.mutateAsync(brand.id);
            toast.success(`Archived ${brand.name}`);
            setArchived(brand);
          } catch (error) {
            if (isGovernedActionDenial(error)) {
              setRefusedId(brand.id);
              return;
            }
            toast.error("Could not archive brand", { description: extractErrorMessage(error) });
          }
        }}
      />
      {archived ? (
        <BrandSharedItemsWindow
          brand={archived}
          onClose={() => {
            const id = archived.id;
            setArchived(null);
            onDone?.(id);
          }}
        />
      ) : null}
    </>
  );
}

function BrandSharedItemsWindow({
  brand,
  onClose,
}: {
  brand: { id: string; name: string };
  onClose: () => void;
}) {
  const items = useBrandAssociatedItems(brand.id);
  const archiveItems = useArchiveBrandAssociatedItems();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const rows = useMemo(() => items.data ?? [], [items.data]);
  const keyOf = (r: { item_type: string; item_id: string }) => `${r.item_type}:${r.item_id}`;

  // Nothing shared to offer: the flow is complete, close on its own.
  useEffect(() => {
    if (items.isSuccess && rows.length === 0) onClose();
  }, [items.isSuccess, rows.length, onClose]);

  const submit = async () => {
    const chosen = rows.filter((r) => picked.has(keyOf(r)));
    if (!chosen.length) return onClose();
    try {
      const n = await archiveItems.mutateAsync({
        brandId: brand.id,
        items: chosen.map((r) => ({ item_type: r.item_type, item_id: r.item_id })),
      });
      toast.success(`Archived ${n} linked item${n === 1 ? "" : "s"}`);
      onClose();
    } catch (error) {
      toast.error("Could not archive linked items", { description: extractErrorMessage(error) });
    }
  };

  return (
    <WindowPanel
      id={`brand-archive-shared-${brand.id}`}
      title={`Linked to ${brand.name}`}
      onClose={onClose}
      width={460}
      height={420}
      minWidth={340}
      minHeight={260}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
        Kept. Tick any to archive too.
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.isLoading ? (
          <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading
          </div>
        ) : items.isError ? (
          <div role="alert" className="p-3 text-sm text-destructive">
            {extractErrorMessage(items.error)}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const k = keyOf(r);
              return (
                <li key={k} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                  <Checkbox
                    id={`bai-${k}`}
                    checked={picked.has(k)}
                    disabled={!r.selectable}
                    onCheckedChange={(v) =>
                      setPicked((prev) => {
                        const next = new Set(prev);
                        if (v === true) next.add(k);
                        else next.delete(k);
                        return next;
                      })
                    }
                  />
                  <label htmlFor={`bai-${k}`} className="min-w-0 flex-1 truncate">
                    {r.title}
                  </label>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.archived ? "Archived" : r.selectable ? r.type_label : `${r.type_label} · shared`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
        <Button variant="quiet" onClick={onClose} disabled={archiveItems.isPending}>
          Keep all
        </Button>
        <Button
          variant="danger"
          onClick={() => void submit()}
          disabled={picked.size === 0 || archiveItems.isPending}
        >
          {archiveItems.isPending ? "Archiving…" : `Archive selected (${picked.size})`}
        </Button>
      </div>
    </WindowPanel>
  );
}

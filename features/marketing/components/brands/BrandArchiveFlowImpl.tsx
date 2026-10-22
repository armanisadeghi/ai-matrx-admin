"use client";

/**
 * BrandArchiveFlowImpl — THE brand archive (loaded through BrandArchiveFlow.tsx), used by the brand page and the brands list (one canonical action).
 *
 * Smart Add fresh start (smart-add-brand VISION Part 11, 2026-10-14): the archive goes through THE change
 * engine (`platform.change_records`, move-and-archive plan): a review window shows everything that goes with
 * the brand and everything kept because something else uses it, each a door; the toast's Undo restores exactly
 * what that archive took (by its plan). Then a window panel lists the SHARED things the brand was linked to
 * (people, other records) with checkboxes, so the person can archive those too.
 */

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { WindowPanel } from "@ai-matrx/summon/window";
import { restoreChange } from "@ai-matrx/data/db";
import { supabase } from "@/utils/supabase/client";
import { ChangeReviewWindow } from "@/features/trash/review/ChangeReviewWindow";
import {
  marketingKeys,
  useArchiveBrandAssociatedItems,
  useBrandAssociatedItems,
} from "@/features/marketing/data/hooks";
import { extractErrorMessage } from "@/utils/errors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { GovernedActionDialog, useRemovalRights } from "@ai-matrx/sharing/access/react";
import { marketingRoutes } from "@/features/marketing/lib/routes";

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
  const queryClient = useQueryClient();
  // Lists only: the open brand page keeps its loaded record so the shared-items window can finish.
  const refreshBrands = () => void queryClient.invalidateQueries({ queryKey: [...marketingKeys.root, "brands"] });

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
          onHidden={() => void queryClient.invalidateQueries({ queryKey: [...marketingKeys.root, "brands"] })}
        />
      ) : null}
      {brand && !archived && !refused && !rights.isLoading ? (
        <ChangeReviewWindow
          title={`Archive ${brand.name}`}
          target={{ verb: "delete", entityType: "web_brand", ids: [brand.id] }}
          onClose={onCancel}
          onDone={(result) => {
            refreshBrands();
            toast.success(`Archived ${brand.name}`, {
              action: {
                label: "Undo",
                onClick: () => {
                  restoreChange(supabase, result.plan_id)
                    .then(() => {
                      refreshBrands();
                      toast.success(`Restored ${brand.name}`);
                    })
                    .catch((error: unknown) => toast.error("Could not restore", { description: extractErrorMessage(error) }));
                },
              },
            });
            setArchived(brand);
          }}
        />
      ) : null}
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
          <div role="alert" className="flex items-start gap-2 p-3 text-sm text-destructive">
            <span className="min-w-0 flex-1">{extractErrorMessage(items.error)}</span>
            <ErrorAlchemyMenu error={items.error} />
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

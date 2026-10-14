"use client";

/**
 * Enrich finish: "Changes to your brand" (ENRICH.md §4). Additions, replacements (old and new side by side),
 * conflicts ("You said this isn't yours, but it's on your brand now", default Keep it, the removal's real
 * consequence shown) and a one-line unchanged count. Nothing is written until the person confirms; every
 * applied change can be undone from here.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, DisclosureHeader, RowGroup, SegmentedControl } from "@ai-matrx/design-system/controls";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { previewRetraction, type RetractionSummary } from "@/features/marketing/data/retraction";
import { retractionConsequence } from "@/features/marketing/components/brands/RetractionDialog";
import type { BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import { PlatformMark } from "@/features/marketing/social/components/PlatformMark";
import type { EvidenceItem } from "../evidence";
import { applyEnrichChanges, type AppliedChange } from "./apply";
import { diffCounts, type ChangeChoice, type EnrichChange } from "./diff";
import type { BrandSnapshot, KnownFact } from "./known";

function Value({ fact, item }: { fact?: KnownFact | null; item?: EvidenceItem | null }) {
  const image = fact?.imageUrl ?? (item?.field === "logo" ? (item.image_url ?? item.value) : null);
  const platform = fact?.platform ?? (item?.field === "social" ? item.platform : null);
  const text = fact?.value ?? (item?.field === "social" && item.handle ? `@${item.handle}` : (item?.value ?? ""));
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {platform ? <PlatformMark platform={platform} /> : null}
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-10 w-auto max-w-[140px] object-contain" />
      ) : (
        <span className="min-w-0 truncate text-sm">{text}</span>
      )}
    </span>
  );
}

function ConflictRow({ brandId, change, choice, onChoice }: { brandId: string; change: EnrichChange; choice: ChangeChoice; onChoice: (c: ChangeChoice) => void }) {
  const [preview, setPreview] = useState<RetractionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const f = change.current;
  const ref = f?.ref;
  const rootType = ref?.type === "property" ? "property" : ref?.type === "site" ? "site" : ref?.type === "brand" ? "logo" : null;
  // Root `logo` is the brand itself.
  const rootId = ref?.type === "property" || ref?.type === "site" ? ref.id : rootType === "logo" ? brandId : null;
  useEffect(() => {
    if (choice !== "apply" || !rootType) return;
    let live = true;
    if (!rootId) return;
    previewRetraction(rootType, rootId)
      .then((s) => live && setPreview(s))
      .catch((e: unknown) => live && setError(extractErrorMessage(e)));
    return () => {
      live = false;
    };
  }, [choice, rootType, rootId]);
  return (
    <div className="flex flex-col gap-1 px-3 py-2" data-testid="enrich-conflict">
      <div className="flex items-center gap-3">
        <span className="w-28 shrink-0 text-xs text-muted-foreground">{change.label}</span>
        <Value fact={f} />
        <SegmentedControl<ChangeChoice>
          className="ml-auto shrink-0"
          aria-label={`${change.label} choice`}
          value={choice}
          onValueChange={onChoice}
          data={[
            { value: "keep", label: "Keep it" },
            { value: "apply", label: "Remove from brand" },
          ]}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {choice === "apply" ? (error ? `Could not check: ${error}` : `${retractionConsequence(preview)} Adds it to your not-us list.`) : "You said this isn't yours, but it's on your brand now"}
      </p>
    </div>
  );
}

export function ChangesReview({
  snapshot,
  changes,
  kinds,
  onBack,
  onBrand,
}: {
  snapshot: BrandSnapshot;
  changes: EnrichChange[];
  kinds: BrandRelationKind[];
  onBack: () => void;
  onBrand: (brand: MarketingBrand) => void;
}) {
  const [choices, setChoices] = useState<Record<string, ChangeChoice>>({});
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<AppliedChange[] | null>(null);
  const [undone, setUndone] = useState<Set<string>>(new Set());
  const [showSame, setShowSame] = useState(false);
  const counts = diffCounts(changes);
  const choiceOf = (c: EnrichChange) => choices[c.id] ?? c.defaultChoice;
  const set = (id: string, c: ChangeChoice) => setChoices((cur) => ({ ...cur, [id]: c }));
  const pending = changes.filter((c) => c.kind !== "unchanged" && choiceOf(c) === "apply").length;
  const conflicts = changes.filter((c) => c.kind === "conflict");
  const replaces = changes.filter((c) => c.kind === "replace");
  const adds = changes.filter((c) => c.kind === "add");
  const same = changes.filter((c) => c.kind === "unchanged");

  const confirm = async () => {
    setApplying(true);
    try {
      const out = await applyEnrichChanges({ snapshot, changes, choices, kinds, onBrand });
      setApplied(out);
      const failed = out.filter((r) => !r.ok);
      if (failed.length) toast.error(`${failed.length} change${failed.length === 1 ? "" : "s"} could not be saved`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  const undo = async (r: AppliedChange) => {
    if (!r.undo) return;
    try {
      await r.undo();
      setUndone((cur) => new Set(cur).add(r.change.id));
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  };

  if (applied) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-8 pt-[calc(var(--shell-header-h)+1rem)]" data-testid="enrich-applied">
        <div className="flex items-center justify-between gap-2">
          <h1 className="type-title">Your brand is updated</h1>
          <Button asChild variant="primary">
            <Link href={marketingRoutes.brand(snapshot.brand.id)}>Open brand</Link>
          </Button>
        </div>
        <RowGroup title={`${applied.filter((r) => r.ok).length} applied`}>
          {applied.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">No changes chosen</p> : null}
          {applied.map((r) => (
            <div key={r.change.id} className="flex items-center gap-3 px-3 py-2" data-testid="enrich-applied-row">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">
                {r.change.kind === "conflict" ? "Removed" : r.change.kind === "replace" ? "Replaced" : "Added"}
              </span>
              <Value fact={r.change.kind === "conflict" ? r.change.current : null} item={r.change.next} />
              <span className="ml-auto shrink-0">
                {!r.ok ? (
                  <span className="text-xs text-destructive">{r.error}</span>
                ) : undone.has(r.change.id) ? (
                  <span className="text-xs text-muted-foreground">Undone</span>
                ) : (
                  <Button variant="quiet" onClick={() => void undo(r)} data-testid="enrich-undo">
                    Undo
                  </Button>
                )}
              </span>
            </div>
          ))}
        </RowGroup>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-8 pt-[calc(var(--shell-header-h)+1rem)]" data-testid="enrich-changes">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="type-title truncate">Changes to your brand</h1>
          <p className="truncate text-sm text-muted-foreground">{snapshot.brand.name}</p>
        </div>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>

      {conflicts.length ? (
        <RowGroup title={`Conflicts · ${conflicts.length}`} data-testid="enrich-conflicts">
          {conflicts.map((c) => (
            <ConflictRow key={c.id} brandId={snapshot.brand.id} change={c} choice={choiceOf(c)} onChoice={(v) => set(c.id, v)} />
          ))}
        </RowGroup>
      ) : null}

      {replaces.length ? (
        <RowGroup title={`Replacements · ${replaces.length}`} data-testid="enrich-replacements">
          {replaces.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2" data-testid="enrich-replacement">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{c.label}</span>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-3">
                <div className="min-w-0">
                  <span className="block text-[11px] text-muted-foreground">Current</span>
                  <Value fact={c.current} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] text-muted-foreground">New</span>
                  <Value item={c.next} />
                </div>
              </div>
              <SegmentedControl<ChangeChoice>
                className="shrink-0"
                aria-label={`${c.label} choice`}
                value={choiceOf(c)}
                onValueChange={(v) => set(c.id, v)}
                data={[
                  { value: "keep", label: "Keep current" },
                  { value: "apply", label: "Use new" },
                ]}
              />
            </div>
          ))}
        </RowGroup>
      ) : null}

      {adds.length ? (
        <RowGroup title={`Additions · ${adds.length}`} data-testid="enrich-additions">
          {adds.map((c) => (
            <label key={c.id} className="flex items-center gap-3 px-3 py-2" data-testid="enrich-addition">
              <Checkbox checked={choiceOf(c) === "apply"} onCheckedChange={(v) => set(c.id, v === true ? "apply" : "keep")} aria-label={`Add ${c.label}`} />
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{c.label}</span>
              <Value item={c.next} />
            </label>
          ))}
        </RowGroup>
      ) : null}

      {counts.add + counts.replace + counts.conflict === 0 ? <p className="text-sm text-muted-foreground">Nothing new found</p> : null}

      <div>
        <DisclosureHeader open={showSame} onClick={() => setShowSame((v) => !v)} title="Unchanged" meta={String(counts.unchanged)} />
        {showSame ? (
          <RowGroup>
            {same.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-1.5">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{c.label}</span>
                <Value fact={c.current} />
              </div>
            ))}
          </RowGroup>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="primary" onClick={() => void confirm()} disabled={applying || pending === 0} data-testid="enrich-confirm">
          {applying ? "Saving…" : `Apply ${pending} change${pending === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

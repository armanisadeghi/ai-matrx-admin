"use client";

/**
 * Enrich finish: "Changes to your brand" (ENRICH.md §4). Additions, replacements (old and new side by side),
 * conflicts ("You said this isn't yours, but it's on your brand now", default Keep it, the removal's real
 * consequence shown) and a one-line unchanged count. Nothing is written until the person confirms; every
 * applied change can be undone from here.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "@/components/navigation/AppLink";
import { Button, DisclosureHeader, RowGroup, SegmentedControl } from "@ai-matrx/design-system/controls";
import { Checkbox } from "@/components/ui/checkbox";
import { ShadedLogo } from "../ShadedLogo";
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
import { loadNewFindings, type FindingSummary } from "./newFindings";
import type { WebChoice } from "../webKinds";
import { listBrandWebDecisions, webDecisionSummary, type WebSaveStatus } from "../webDecisions";

/** Enrich's "On the web" answers: already saved on the brand as they were given; Apply only makes sure of it. */
export interface EnrichWebReview {
  choices: WebChoice[];
  /** How many results got Ask me later / Ignore on this visit (saved too, but with no relationship). */
  markCount: number;
  statuses: Record<string, WebSaveStatus>;
  flush: () => Promise<{ saved: string[]; failed: { key: string; error: string }[] }>;
}

/** Where the brand shows every web answer, grouped by relationship. */
export const brandOnTheWebHref = (brandId: string) => `${marketingRoutes.brand(brandId)}?tab=on_the_web`;

/** "Websites decided: 40 · 12 Ours · 9 Backlink …", opening the brand's On the web section. */
function WebDecisionsRow({
  brandId,
  web,
  kinds,
  result,
}: {
  brandId: string;
  web: EnrichWebReview;
  kinds: BrandRelationKind[];
  result: { saved: string[]; failed: { key: string; error: string }[] } | null;
}) {
  const states = Object.values(web.statuses);
  const saving = states.filter((s) => s.state === "saving").length;
  // The true saved total comes from the brand's rows (earlier visits count too), read again once saving settles and after Apply.
  const savedQuery = useQuery({
    queryKey: ["marketing", "enrich-web-saved-total", brandId, saving, result ? "applied" : "open"],
    queryFn: () => listBrandWebDecisions(brandId),
    staleTime: 0,
    refetchOnMount: "always",
    enabled: saving === 0,
  });
  const counts = webDecisionSummary(web.choices, savedQuery.data ?? null, kinds, web.markCount);
  if (!counts.total) return null;
  const failed = result ? result.failed.length : states.filter((s) => s.state === "failed").length;
  return (
    <RowGroup title="On the web" data-testid="enrich-web-decisions">
      <Link href={brandOnTheWebHref(brandId)} className="flex flex-col gap-0.5 px-3 py-2 hover:bg-muted/50" data-testid="enrich-web-decisions-link">
        <span className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-muted-foreground">Websites decided</span>
          <span className="shrink-0 text-sm tabular-nums" data-testid="enrich-web-decisions-total">
            {counts.total}
          </span>
          <span className="min-w-0 truncate text-xs text-muted-foreground" data-testid="enrich-web-decisions-tail">
            {counts.tail}
          </span>
          <span className="ml-auto shrink-0 text-xs" data-testid="enrich-web-decisions-state">
            {failed ? (
              <span className="text-destructive">{`${failed} not saved`}</span>
            ) : saving ? (
              <span className="text-muted-foreground">Saving…</span>
            ) : (
              <span className="text-muted-foreground">Saved</span>
            )}
          </span>
        </span>
        <span className="pl-[7.75rem] text-sm text-muted-foreground">{counts.parts.map((p) => `${p.count} ${p.label}`).join(" · ")}</span>
      </Link>
    </RowGroup>
  );
}

function Value({ fact, item }: { fact?: KnownFact | null; item?: EvidenceItem | null }) {
  const image = fact?.imageUrl ?? (item?.field === "logo" ? (item.image_url ?? item.value) : null);
  const platform = fact?.platform ?? (item?.field === "social" ? item.platform : null);
  const text = fact?.value ?? (item?.field === "social" && item.handle ? `@${item.handle}` : (item?.value ?? ""));
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {platform ? <PlatformMark platform={platform} /> : null}
      {image ? (
        <ShadedLogo url={image} imgClassName="h-10 w-auto max-w-[140px] object-contain" />
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

/** Competitors, people, locations, listings, keywords, offerings and credentials the round found, and where they live now. */
function NewFindings({ found }: { found: FindingSummary[] }) {
  if (!found.length) return null;
  return (
    <RowGroup title="Also found" data-testid="enrich-new-findings">
      {found.map((f) => (
        <Link key={f.group} href={f.href} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50" data-testid="enrich-new-finding">
          <span className="w-28 shrink-0 text-xs text-muted-foreground">{f.label}</span>
          <span className="shrink-0 text-sm tabular-nums">{f.count}</span>
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {f.names.join(", ")}
            {f.count > f.names.length ? ` +${f.count - f.names.length}` : ""}
          </span>
        </Link>
      ))}
    </RowGroup>
  );
}

export function ChangesReview({
  snapshot,
  changes,
  kinds,
  onBack,
  onBrand,
  web,
}: {
  snapshot: BrandSnapshot;
  changes: EnrichChange[];
  kinds: BrandRelationKind[];
  onBack: () => void;
  onBrand: (brand: MarketingBrand) => void;
  web?: EnrichWebReview;
}) {
  const [choices, setChoices] = useState<Record<string, ChangeChoice>>({});
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<AppliedChange[] | null>(null);
  const [undone, setUndone] = useState<Set<string>>(new Set());
  const [showSame, setShowSame] = useState(false);
  const [webResult, setWebResult] = useState<{ saved: string[]; failed: { key: string; error: string }[] } | null>(null);
  const foundQuery = useQuery({
    queryKey: ["marketing", "enrich-new-findings", snapshot.brand.id, snapshot.readAt],
    queryFn: () => loadNewFindings(snapshot),
    enabled: Boolean(snapshot.readAt),
    // Late findings keep arriving while the person reviews: every visit to this screen reads again.
    staleTime: 0,
    refetchOnMount: "always",
  });
  const found = foundQuery.data ?? [];
  const counts = diffCounts(changes);
  const choiceOf = (c: EnrichChange) => choices[c.id] ?? c.defaultChoice;
  const set = (id: string, c: ChangeChoice) => setChoices((cur) => ({ ...cur, [id]: c }));
  const pending = changes.filter((c) => c.kind !== "unchanged" && choiceOf(c) === "apply").length;
  const webCount = (web?.choices.length ?? 0) + (web?.markCount ?? 0);
  const conflicts = changes.filter((c) => c.kind === "conflict");
  const replaces = changes.filter((c) => c.kind === "replace");
  const adds = changes.filter((c) => c.kind === "add");
  const same = changes.filter((c) => c.kind === "unchanged");

  const confirm = async () => {
    setApplying(true);
    try {
      // The web answers were saved as they were given; anything still saving, failed or waiting on a name lands now.
      const webSaved = web ? await web.flush() : null;
      setWebResult(webSaved);
      if (webSaved?.failed.length) toast.error(`${webSaved.failed.length} web answer${webSaved.failed.length === 1 ? "" : "s"} could not be saved`);
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
          {applied.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">{webCount ? "No other changes chosen" : "No changes chosen"}</p> : null}
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
        {web ? <WebDecisionsRow brandId={snapshot.brand.id} web={web} kinds={kinds} result={webResult} /> : null}
        <NewFindings found={found} />
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

      {web ? <WebDecisionsRow brandId={snapshot.brand.id} web={web} kinds={kinds} result={null} /> : null}

      <NewFindings found={found} />

      {counts.add + counts.replace + counts.conflict + found.length + webCount === 0 ? <p className="text-sm text-muted-foreground">Nothing new found</p> : null}

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
        <Button variant="primary" onClick={() => void confirm()} disabled={applying || pending + webCount === 0} data-testid="enrich-confirm">
          {applying ? "Saving…" : pending === 0 ? "Finish" : `Apply ${pending} change${pending === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

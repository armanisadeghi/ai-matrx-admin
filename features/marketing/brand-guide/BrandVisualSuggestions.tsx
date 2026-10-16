"use client";

/**
 * Colours and fonts read from the brand's own site (BRAND-GUIDE.md § Visual identity, deterministic core; aidream
 * services/brand_guide/visual.py). Suggestions are `web.brand_asset` rows (kind color / font, source discovered,
 * no `confirmed_at`).
 *
 * NO-PRESSURE RULES (Arman, 2026-10-16: "NO brand guide IS MUCH BETTER than a wrong brand guide"):
 * - ONE value at a time, with its evidence beside it (how often the site uses it, where, under which names).
 * - Yes, No and Skip are the same size and weight — nothing nudges toward Yes, nothing is pre-chosen.
 * - No "accept all".
 * - No is final: the row keeps `metadata.declined_at` and is retired, and a rerun of the site read never files that
 *   value again (visual.py `store_visual_suggestions`). Skip only moves it to the back of this visit's queue.
 * "Read from site" reruns the read (POST /brand-guide/{id}/read-site, no model, 0 points).
 */
import { useState } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { callApi } from "@/lib/api/call-api";
import { useAppDispatch } from "@/lib/redux/hooks";
import { extractErrorMessage } from "@/utils/errors";
import { useBrandAssets, useDeleteBrandAsset, useUpdateBrandAsset } from "@/features/marketing/data/hooks";
import { isJsonRecord, type BrandAsset } from "@/features/marketing/types";

function field(asset: BrandAsset, key: string): string | null {
  const v = isJsonRecord(asset.data) ? asset.data[key] : null;
  return typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null;
}

function list(asset: BrandAsset, key: string): string[] {
  const v = isJsonRecord(asset.data) ? asset.data[key] : null;
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (isJsonRecord(v)) return Object.keys(v);
  return [];
}

function Swatch({ asset }: { asset: BrandAsset }) {
  const hex = field(asset, "hex") ?? asset.title ?? "";
  return (
    <span className="flex min-w-0 items-center gap-2">
      {/* ui-exception: a colour swatch renders the brand's own colour value */}
      <span className="size-5 shrink-0 rounded border border-border" style={{ backgroundColor: hex }} aria-hidden />
      <span className="font-mono text-xs text-foreground">{hex}</span>
    </span>
  );
}

function FontName({ asset }: { asset: BrandAsset }) {
  const family = field(asset, "family") ?? asset.title ?? "";
  return (
    <span className="truncate text-sm text-foreground" style={{ fontFamily: `"${family}", inherit` }}>
      {family}
    </span>
  );
}

/** What the site showed us, in plain words, beside the value. */
function Evidence({ asset }: { asset: BrandAsset }) {
  const uses = field(asset, "uses");
  const role = field(asset, "role_hint");
  const where = list(asset, asset.kind === "color" ? "properties" : "loaded_from").slice(0, 3);
  const names = list(asset, "css_variables").slice(0, 2);
  const parts = [
    uses ? `Used ${uses}×` : null,
    role ? `looks like ${role}` : null,
    where.length ? (asset.kind === "color" ? `in ${where.join(", ")}` : `from ${where.join(", ")}`) : null,
    names.length ? `named ${names.join(", ")}` : null,
  ].filter(Boolean);
  return (
    <div className="min-w-0 text-xs text-muted-foreground" data-testid="brand-visual-evidence">
      <div className="truncate" title={parts.join(" · ")}>{parts.join(" · ") || "Found on your site"}</div>
      {asset.source_url ? (
        <a href={asset.source_url} target="_blank" rel="noreferrer" className="truncate hover:underline">
          {asset.source_url.replace(/^https?:\/\//, "")}
        </a>
      ) : null}
    </div>
  );
}

function Kept({ asset }: { asset: BrandAsset }) {
  return asset.kind === "color" ? <Swatch asset={asset} /> : <FontName asset={asset} />;
}

export function BrandVisualSuggestions({ brandId, organizationId }: { brandId: string; organizationId: string }) {
  const dispatch = useAppDispatch();
  const assets = useBrandAssets(brandId);
  const update = useUpdateBrandAsset();
  const remove = useDeleteBrandAsset();
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Skipped this visit: moved to the back of the queue, never answered for the person.
  const [skipped, setSkipped] = useState<string[]>([]);
  const rows = (assets.data ?? []).filter((a) => a.kind === "color" || a.kind === "font");
  const kept = rows.filter((a) => !(a.source === "discovered" && !a.confirmed_at));
  const open = rows.filter((a) => a.source === "discovered" && !a.confirmed_at);
  const queue = [...open.filter((a) => !skipped.includes(a.id)), ...open.filter((a) => skipped.includes(a.id))];
  const current = queue[0] ?? null;

  const answer = async (a: "yes" | "no" | "skip") => {
    if (!current || busy) return;
    setError(null);
    if (a === "skip") {
      setSkipped((s) => [...s.filter((id) => id !== current.id), current.id]);
      return;
    }
    setBusy(true);
    try {
      if (a === "yes") {
        await update.mutateAsync({
          assetId: current.id,
          expectedVersion: current.version,
          patch: { confirmed_at: new Date().toISOString() },
        });
      } else {
        // A "No" is remembered, so no rerun ever asks again.
        const metadata = isJsonRecord(current.metadata) ? current.metadata : {};
        await update.mutateAsync({
          assetId: current.id,
          expectedVersion: current.version,
          patch: { metadata: { ...metadata, declined_at: new Date().toISOString() } },
        });
        await remove.mutateAsync(current.id);
      }
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const read = async () => {
    setReading(true);
    setError(null);
    const result = await dispatch(
      callApi({
        // New door 2026-10-16 (aidream api/routers/brand_guide.py); not in the published api-types yet.
        path: "/brand-guide/{brand_id}/read-site" as never,
        method: "POST",
        pathParams: { brand_id: brandId } as never,
        scopeOverrides: { organization_id: organizationId },
      }),
    );
    setReading(false);
    if (result.error) setError(result.error.message || "The site could not be read.");
    else void assets.refetch();
  };

  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-3" data-testid="brand-visual-suggestions">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Colours and fonts</h2>
        {open.length > 0 ? <span className="text-xs text-muted-foreground">{open.length} to check</span> : null}
        {/* The wrapper owns the right edge: the button's own margin class is not applied, which left it riding the "N to check" text. */}
        <span className="ml-auto flex">
          <Button variant="outline" onClick={read} disabled={reading}>
            {reading ? "Reading site" : "Read from site"}
          </Button>
        </span>
      </div>
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      {/* Question card + kept swatches (54 + 8 + 24) reserved for every state, so the section never changes height. */}
      <div className="min-h-[86px]">
      {assets.isLoading ? (
        // The question card's exact height (p-2 + a 36px label/value stack + borders), so it never changes when the row arrives.
        <div key="loading" className="h-[54px] animate-pulse rounded-lg bg-muted" />
      ) : current ? (
        <div
          key="question"
          className="flex min-h-[54px] flex-wrap items-center gap-3 rounded-lg border border-border p-2"
          data-testid={`brand-visual-${current.kind}`}
        >
          <div className="w-40 shrink-0">
            <div className="text-xs text-muted-foreground">{current.kind === "color" ? "Is this your colour?" : "Is this your font?"}</div>
            <Kept asset={current} />
          </div>
          <div className="min-w-0 flex-1">
            <Evidence asset={current} />
          </div>
          {/* Three equal answers: none is styled to pull the person toward Yes. */}
          <div className="flex shrink-0 items-center gap-1.5">
            <Button variant="outline" onClick={() => void answer("yes")} disabled={busy}>Yes</Button>
            <Button variant="outline" onClick={() => void answer("no")} disabled={busy}>No</Button>
            <Button variant="outline" onClick={() => void answer("skip")} disabled={busy}>Skip</Button>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">None yet</div>
      ) : null}
      {kept.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1" data-testid="brand-visual-kept">
          {kept.map((a) => (
            <Kept key={a.id} asset={a} />
          ))}
        </div>
      ) : null}
      </div>
    </section>
  );
}

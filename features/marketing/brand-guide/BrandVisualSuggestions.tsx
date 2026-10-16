"use client";

/**
 * Colours and fonts read from the brand's own site (BRAND-GUIDE.md § Visual identity, deterministic core; aidream
 * services/brand_guide/visual.py). Suggestions are `web.brand_asset` rows (kind color / font, source discovered,
 * no `confirmed_at`); the person answers each with the standard DecisionControl: Yes keeps it (confirmed), No
 * removes it. "Read from site" reruns the read (POST /brand-guide/{id}/read-site, no model, 0 points).
 */
import { useState } from "react";
import { Button, DecisionControl, type DecisionAnswer } from "@ai-matrx/design-system/controls";
import { callApi } from "@/lib/api/call-api";
import { useAppDispatch } from "@/lib/redux/hooks";
import { extractErrorMessage } from "@/utils/errors";
import { useBrandAssets, useDeleteBrandAsset, useUpdateBrandAsset } from "@/features/marketing/data/hooks";
import { isJsonRecord, type BrandAsset } from "@/features/marketing/types";

function field(asset: BrandAsset, key: string): string | null {
  const v = isJsonRecord(asset.data) ? asset.data[key] : null;
  return typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null;
}

function Swatch({ asset }: { asset: BrandAsset }) {
  const hex = field(asset, "hex") ?? asset.title ?? "";
  const role = field(asset, "role_hint");
  return (
    <span className="flex min-w-0 items-center gap-2">
      {/* ui-exception: a colour swatch renders the brand's own colour value */}
      <span className="size-5 shrink-0 rounded border border-border" style={{ backgroundColor: hex }} aria-hidden />
      <span className="font-mono text-xs text-foreground">{hex}</span>
      {role ? <span className="truncate text-xs text-muted-foreground">{role}</span> : null}
    </span>
  );
}

function FontName({ asset }: { asset: BrandAsset }) {
  const family = field(asset, "family") ?? asset.title ?? "";
  const role = field(asset, "role_hint");
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate text-sm text-foreground" style={{ fontFamily: `"${family}", inherit` }}>
        {family}
      </span>
      {role ? <span className="text-xs text-muted-foreground">{role}</span> : null}
    </span>
  );
}

function Row({ asset }: { asset: BrandAsset }) {
  const update = useUpdateBrandAsset();
  const remove = useDeleteBrandAsset();
  const [error, setError] = useState<string | null>(null);
  const suggested = asset.source === "discovered" && !asset.confirmed_at;
  const answer = async (a: DecisionAnswer | null) => {
    setError(null);
    try {
      if (a === "yes")
        await update.mutateAsync({
          assetId: asset.id,
          expectedVersion: asset.version,
          patch: { confirmed_at: new Date().toISOString() },
        });
      else if (a === "no") await remove.mutateAsync(asset.id);
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  };
  return (
    <div className="flex h-8 items-center justify-between gap-2" data-testid={`brand-visual-${asset.kind}`}>
      {asset.kind === "color" ? <Swatch asset={asset} /> : <FontName asset={asset} />}
      {error ? <span className="truncate text-xs text-destructive">{error}</span> : null}
      {suggested ? (
        <DecisionControl value={null} onChange={(a) => void answer(a)} onSkip={() => undefined} onClear={() => undefined} />
      ) : (
        <span className="text-xs text-muted-foreground">Kept</span>
      )}
    </div>
  );
}

export function BrandVisualSuggestions({ brandId, organizationId }: { brandId: string; organizationId: string }) {
  const dispatch = useAppDispatch();
  const assets = useBrandAssets(brandId);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = (assets.data ?? []).filter((a) => a.kind === "color" || a.kind === "font");
  const colors = rows.filter((a) => a.kind === "color");
  const fonts = rows.filter((a) => a.kind === "font");
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
        <Button variant="outline" className="ml-auto" onClick={read} disabled={reading}>
          {reading ? "Reading site" : "Read from site"}
        </Button>
      </div>
      {error ? <div className="mb-2 text-xs text-destructive">{error}</div> : null}
      {assets.isLoading ? (
        <div className="h-16 animate-pulse rounded bg-muted" />
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">None yet</div>
      ) : (
        <div className="grid gap-x-6 sm:grid-cols-2">
          <div>{colors.map((a) => <Row key={a.id} asset={a} />)}</div>
          <div>{fonts.map((a) => <Row key={a.id} asset={a} />)}</div>
        </div>
      )}
    </section>
  );
}

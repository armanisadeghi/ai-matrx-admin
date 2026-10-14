"use client";

/**
 * Enrich an existing brand through Smart Add (ENRICH.md): read the brand once, show "What we already know",
 * then run the normal Smart Add flow seeded with the checked facts, ending on "Changes to your brand".
 * Leaving midway writes nothing to the brand; the run's own records stay (resume or discard from its run page).
 */

import { useEffect, useState } from "react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { extractErrorMessage } from "@/utils/errors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import type { MarketingBrand } from "@/features/marketing/types";
import { SmartAddBrand, type SmartAddEnrich } from "../SmartAddBrand";
import { loadBrandSnapshot } from "./brandState";
import { enrichSeed, knownFacts, type BrandSnapshot, type KnownFact } from "./known";
import { KnownFactsWindow } from "./KnownFactsWindow";
import { withCarried } from "./carry";
import type { SmartAddPrefill } from "../smartAddUrl";

export function SmartAddEnrichFlow({
  brandId,
  onChanged,
  carry = {},
}: {
  brandId: string;
  onChanged?: (brand: MarketingBrand) => void;
  /** The website and account a Smart Add session already had (the duplicate-brand notice): joined to the run as answers. */
  carry?: Pick<SmartAddPrefill, "website" | "social" | "platform">;
}) {
  const [snapshot, setSnapshot] = useState<BrandSnapshot | null>(null);
  const [known, setKnown] = useState<KnownFact[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<SmartAddEnrich | null>(null);

  useEffect(() => {
    let live = true;
    loadBrandSnapshot(brandId)
      .then((s) => {
        if (!live) return;
        const facts = knownFacts(s);
        setSnapshot(s);
        setKnown(facts);
        // Default: every fact checked (Select all).
        setChecked(new Set(facts.map((f) => f.id)));
      })
      .catch((e: unknown) => live && setError(extractErrorMessage(e)));
    return () => {
      live = false;
    };
  }, [brandId]);

  if (error) {
    return (
      <p className="mx-auto flex max-w-2xl items-center gap-1 px-4 pt-[calc(var(--shell-header-h)+1rem)] text-sm text-destructive">
        {error}
        <ErrorAlchemyMenu error={error} />
      </p>
    );
  }
  if (!snapshot) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-[calc(var(--shell-header-h)+1rem)]">
        <RegionSkeleton />
      </div>
    );
  }
  if (run) return <SmartAddBrand enrich={run} onCreated={onChanged} />;
  return (
    <KnownFactsWindow
      brandName={snapshot.brand.name}
      facts={known}
      checked={checked}
      onChange={setChecked}
      starting={false}
      onStart={() => setRun({ snapshot, known, checked, seed: withCarried(enrichSeed(known, checked, snapshot.exclusions), carry) })}
    />
  );
}

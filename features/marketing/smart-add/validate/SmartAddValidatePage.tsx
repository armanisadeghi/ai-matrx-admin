"use client";

/**
 * /marketing/brands/smart-add/validate/<brand> — the validation page opened from the brand itself (a reload,
 * a link, a return visit): everything Create saved on it, answered one card at a time. Rendered by the Smart
 * Add layout (smartAddUrl.ts). The live-session page (after Create) is the same container fed the rounds too.
 */

import { useEffect, useState } from "react";
import { extractErrorMessage } from "@/utils/errors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { getBrand, listBrandRelationKinds, type BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { SMART_ADD_SURFACE } from "../builderSurface";
import { suggestContext } from "../relations";
import { SmartAddValidate } from "./SmartAddValidate";
import { ValidateStageSkeleton } from "./ValidateStage";

const NO_DECISIONS = {};
const NO_KEYS: ReadonlySet<string> = new Set();

export function SmartAddValidatePage({ brandId }: { brandId: string }) {
  const builder = useBuilderFeed(SMART_ADD_SURFACE);
  const [brand, setBrand] = useState<MarketingBrand | null>(null);
  const [kinds, setKinds] = useState<BrandRelationKind[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([getBrand(brandId), listBrandRelationKinds()])
      .then(([b, k]) => {
        if (!live) return;
        setBrand(b);
        setKinds(k);
      })
      .catch((e: unknown) => live && setError(extractErrorMessage(e)));
    return () => {
      live = false;
    };
  }, [brandId]);
  if (error) {
    return (
      <p className="flex items-center justify-center gap-2 p-10 text-sm text-destructive" data-testid="validate-load-error">
        {error}
        <ErrorAlchemyMenu error={error} />
      </p>
    );
  }
  if (!brand) return <ValidateStageSkeleton />;
  return (
    <SmartAddValidate
      brand={brand}
      organizationId={brand.organization_id}
      items={[]}
      facts={[]}
      decisions={NO_DECISIONS}
      webChoices={NO_DECISIONS}
      kinds={kinds}
      ctx={suggestContext([brand.website_url], [], brand.name)}
      broken={NO_KEYS}
      working={false}
      onDecide={() => undefined}
      publish={builder.publish}
    />
  );
}

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
import { useBrandBySegment } from "@/features/marketing/data/keys-hooks";
import { useBuilderFeed } from "@/hooks/useBuilderFeed";
import { SMART_ADD_SURFACE } from "../builderSurface";
import { suggestContext } from "../relations";
import { SmartAddValidate } from "./SmartAddValidate";
import { ValidateStageSkeleton } from "./ValidateStage";

const NO_DECISIONS = {};
const NO_KEYS: ReadonlySet<string> = new Set();

function ValidateLoadError({ message }: { message: string }) {
  return (
    <p className="flex items-center justify-center gap-2 p-10 text-sm text-destructive" data-testid="validate-load-error">
      {message}
      <ErrorAlchemyMenu error={message} />
    </p>
  );
}

export function SmartAddValidatePage({ brandId }: { brandId: string }) {
  const builder = useBuilderFeed(SMART_ADD_SURFACE);
  const [brand, setBrand] = useState<MarketingBrand | null>(null);
  const [kinds, setKinds] = useState<BrandRelationKind[]>([]);
  const [error, setError] = useState<string | null>(null);
  // The address carries the brand's slug or id, like every brand page (lib/keys.ts).
  const segment = useBrandBySegment(brandId);
  const resolvedId = segment.data?.id ?? null;
  useEffect(() => {
    if (!resolvedId) return;
    let live = true;
    Promise.all([getBrand(resolvedId), listBrandRelationKinds()])
      .then(([b, k]) => {
        if (!live) return;
        setBrand(b);
        setKinds(k);
      })
      .catch((e: unknown) => live && setError(extractErrorMessage(e)));
    return () => {
      live = false;
    };
  }, [resolvedId]);
  if (segment.isError) return <ValidateLoadError message={extractErrorMessage(segment.error)} />;
  if (segment.isSuccess && !segment.data) return <ValidateLoadError message="This brand was not found." />;
  if (error) {
    return <ValidateLoadError message={error} />;
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

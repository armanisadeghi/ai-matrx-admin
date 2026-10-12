// app/(core)/marketing/[brandId]/intelligence/ai-visibility/page.tsx
//
// What AI says about this BRAND. The owner is the brand, not a website, so a social-first or
// person brand (no site) has the same page. Per-site answer-engine evidence stays in the site's
// own workspace; this is the brand-level check.

import { Suspense } from "react";

import { MarketingAddressUnavailable } from "@/features/marketing/components/shared/MarketingAddressUnavailable";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";
import { resolveBrandParam } from "@/features/marketing/lib/keys-server";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { BrandAiVisibilityView } from "@/features/marketing/seo/ai-visibility/brand/BrandAiVisibilityView";

export default async function BrandAiVisibilityPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const brand = await resolveBrandParam(brandId);
  if (!brand) return <MarketingAddressUnavailable token="web_brand" address={brandId} />;
  return (
    <>
      <RecordPageHeader record={{ name: "What AI says about you" }} />
      <Suspense fallback={<LoadingSurface label="Loading…" />}>
        <div className="p-4">
          <BrandAiVisibilityView brandId={brand.id} />
        </div>
      </Suspense>
    </>
  );
}

// record-view: web_brand
import { MarketingAddressUnavailable } from "@/features/marketing/components/shared/MarketingAddressUnavailable";
import { Suspense } from "react";

import { BrandWorkspace } from "@/features/marketing/components/brands/BrandWorkspace";
import { BrandHomeSkeleton } from "@/features/marketing/components/brands/BrandOverview";
import { resolveBrandParam } from "@/features/marketing/lib/keys-server";

export default async function MarketingBrandPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  // Cache hit — the layout already resolved this address.
  const brand = await resolveBrandParam(brandId);
  if (!brand) return <MarketingAddressUnavailable token="web_brand" address={brandId} />;
  return (
    <Suspense fallback={<BrandHomeSkeleton />}>
      <BrandWorkspace brandId={brand.id} />
    </Suspense>
  );
}

// record-view: none — a sub-view (the owner's story sitting) inside a brand, not the record page; the brand's own page carries the section
import { MarketingAddressUnavailable } from "@/features/marketing/components/shared/MarketingAddressUnavailable";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { resolveBrandParam } from "@/features/marketing/lib/keys-server";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { OwnerSittingClient } from "@/features/marketing/owner-sitting/OwnerSittingClient";

/**
 * The owner's story: a few questions, one per screen, answered by voice or by
 * typing on the Question Desk's shared answer bar. The words are testimony in
 * the owner room, never facts or brand choices (brand discovery, wave 2).
 */
export default async function BrandOwnerStoryPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const brand = await resolveBrandParam(brandId);
  if (!brand) return <MarketingAddressUnavailable token="web_brand" address={brandId} />;
  return (
    <div className="h-full overflow-y-auto bg-textured pt-[var(--shell-header-h)]">
      <OwnerSittingClient
        brandId={brand.id}
        brandName={brand.name}
        organizationId={brand.organization_id}
        backHref={marketingRoutes.brandIdentity(marketingSeg(brand))}
      />
    </div>
  );
}

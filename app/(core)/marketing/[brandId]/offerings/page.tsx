// record-view: none — a sub-view (offerings) inside a record or scope, not the record page; the record's own page carries the section
import { MarketingAddressUnavailable } from "@/features/marketing/components/shared/MarketingAddressUnavailable";
import { BrandOfferingsWorkspace } from "@/features/marketing/offerings/BrandOfferingsWorkspace";
import { resolveBrandParam } from "@/features/marketing/lib/keys-server";

export const metadata = { title: "Products & services" };

/** /marketing/<brand>/offerings — the brand's products and services, filling live while its run goes. */
export default async function BrandOfferingsPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brand = await resolveBrandParam(brandId);
  if (!brand) return <MarketingAddressUnavailable token="web_brand" address={brandId} />;
  return <BrandOfferingsWorkspace brand={{ id: brand.id, name: brand.name, organizationId: brand.organization_id }} />;
}

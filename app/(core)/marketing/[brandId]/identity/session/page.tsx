// record-view: none — a sub-view (the brand session) inside a record, not the record page; the brand page links to it
import { MarketingAddressUnavailable } from "@/features/marketing/components/shared/MarketingAddressUnavailable";
import { resolveBrandParam } from "@/features/marketing/lib/keys-server";
import { BrandSessionPage } from "@/features/marketing/brand-session/BrandSessionPage";

/** The brand session: one card at a time, the person decides where each brand candidate belongs. */
export default async function BrandSessionRoute({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const brand = await resolveBrandParam(brandId);
  if (!brand) return <MarketingAddressUnavailable token="web_brand" address={brandId} />;
  return <BrandSessionPage brandId={brand.id} />;
}

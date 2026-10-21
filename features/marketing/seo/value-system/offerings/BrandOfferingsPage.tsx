"use client";

/**
 * The catalog view of Identity › Products & services: the brand-level editor with no website, the site
 * view once one exists. Its host (`ProductsAndServicesPage`) clears the shell header and draws the tab row.
 */

import { BrandIdentitySiteSurface } from "@/features/marketing/components/brand/BrandIdentitySiteSurface";
import {
  LoadingSurface,
  QueryError,
} from "@/features/marketing/components/shared/MarketingUi";
import { useBrandSites } from "@/features/marketing/data/hooks";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { BrandOfferingsSurface } from "./BrandOfferingsSurface";
import { BrandOfferingsEditor } from "./BrandOfferingsEditor";
import { OfferingsWorkbench } from "./OfferingsWorkbench";

export function BrandOfferingsPage() {
  const brand = useMarketingBrand();
  const sites = useBrandSites(brand.id);
  if (sites.isPending) return <LoadingSurface label="Loading this brand's offerings…" />;
  if (sites.isError) {
    return <QueryError error={sites.error} onRetry={() => void sites.refetch()} />;
  }
  if ((sites.data ?? []).length === 0) return (
      <BrandOfferingsSurface>
        <BrandOfferingsEditor />
      </BrandOfferingsSurface>
    );
  return (
    <BrandIdentitySiteSurface headerOffset={false}>
      <BrandOfferingsSurface>
        <OfferingsWorkbench />
      </BrandOfferingsSurface>
    </BrandIdentitySiteSurface>
  );
}

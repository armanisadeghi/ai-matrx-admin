// record-view: none — a sub-view (offerings) inside a record or scope, not the record page; the record's own page carries the section
import { Suspense } from "react";

import { ProductsAndServicesPage } from "@/features/marketing/offerings/ProductsAndServicesPage";
import { LoadingSurface } from "@/features/marketing/components/shared/MarketingUi";

export const metadata = { title: "Products & services" };

/**
 * Identity › Products & services — the one home: the tree Smart Add found, and the catalog with prices
 * (or the site workbench once a website exists). `/marketing/brands/<brand>/offerings` forwards here.
 */
export default function BrandOfferingsRoute() {
  return (
    <Suspense fallback={<LoadingSurface label="Loading this brand's products and services…" />}>
      <ProductsAndServicesPage />
    </Suspense>
  );
}

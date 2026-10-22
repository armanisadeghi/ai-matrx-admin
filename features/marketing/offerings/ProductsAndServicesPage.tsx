"use client";

/**
 * Identity › Products & services — the ONE home of what a brand sells (Arman, 2026-10-21: the product tree moves
 * into Identity; `/marketing/brands/<brand>/offerings` forwards here).
 *
 * Two views of the same subject under one tab row:
 * - Found (default): the offering tree Smart Add found — Yes / No / Other per row, quotes, Refresh, the live run
 *   (`BrandOfferingsPanel`).
 * - Catalog & prices: the brand's kept offerings and their prices, or the site workbench once a website exists
 *   (`BrandOfferingsPage`, which carries the `matrx-user/marketing-brand-offerings` surface and its write targets).
 *
 * Both views stay mounted (the hidden one is `hidden`), so the live run keeps streaming and the catalog surface's
 * agent write targets stay registered whichever tab is showing. The view rides `?view=catalog` so a link can land
 * on either one.
 */

import { usePathname, useSearchParams } from "next/navigation";
import { Tabs } from "@ai-matrx/design-system/controls";

import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { BrandOfferingsPage } from "@/features/marketing/seo/value-system/offerings/BrandOfferingsPage";
import { pushAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { BrandOfferingsPanel } from "./BrandOfferingsPanel";

export type ProductsAndServicesView = "found" | "catalog";

const VIEWS = [
  { value: "found", label: "Found" },
  { value: "catalog", label: "Catalog & prices" },
] as const satisfies readonly { value: ProductsAndServicesView; label: string }[];

export function readProductsAndServicesView(param: string | null | undefined): ProductsAndServicesView {
  return param === "catalog" ? "catalog" : "found";
}

export function ProductsAndServicesPage() {
  const brand = useMarketingBrand();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const view = readProductsAndServicesView(searchParams.get("view"));

  const selectView = (next: ProductsAndServicesView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "found") params.delete("view");
    else params.set("view", next);
    const query = params.toString();
    pushAddressWithoutNavigating(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pt-[var(--shell-header-h)]">
      <h1 className="sr-only">
        {brand.name} · Products &amp; services
      </h1>
      <div className="mx-auto w-full max-w-6xl shrink-0 px-3 pt-2 sm:px-4">
        <Tabs aria-label="Products and services views" value={view} onValueChange={selectView} data={VIEWS} />
      </div>
      <div
        hidden={view !== "found"}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        data-matrx-page-scroll=""
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:px-4">
          <BrandOfferingsPanel brand={{ id: brand.id, name: brand.name, organizationId: brand.organizationId }} />
        </div>
      </div>
      <div hidden={view !== "catalog"} className="min-h-0 flex-1 overflow-hidden">
        <BrandOfferingsPage />
      </div>
    </div>
  );
}

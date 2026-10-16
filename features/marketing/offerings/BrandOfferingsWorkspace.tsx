"use client";

/** The full-page home of one brand's Products & services (`/marketing/<brand>/offerings`). */

import { BrandOfferingsPanel } from "./BrandOfferingsPanel";

export function BrandOfferingsWorkspace({ brand }: { brand: { id: string; name: string; organizationId: string } }) {
  return (
    <div className="h-full min-h-0 overflow-y-auto" data-matrx-page-scroll="">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4 pt-[calc(var(--shell-header-h)+0.75rem)]">
        <h1 className="type-title">Products &amp; services</h1>
        <BrandOfferingsPanel brand={brand} />
      </div>
    </div>
  );
}

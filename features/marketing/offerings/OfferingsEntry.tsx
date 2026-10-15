"use client";

/**
 * Products & services entry: pick any brand you can see and watch its products and services, or add a new brand
 * through Smart Add (its crawl's end starts the same run).
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { BrandPicker } from "@/features/marketing/components/brands/BrandPicker";
import { marketingRoutes } from "@/features/marketing/lib/routes";

export function OfferingsEntry() {
  const router = useRouter();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="h-full min-h-0 overflow-y-auto" data-matrx-page-scroll="">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
        <h1 className="type-title">Products &amp; services</h1>
        <BrandPicker
          organizationId={null}
          value={brandId}
          onChange={(id) => {
            setBrandId(id);
            if (id) startTransition(() => router.push(marketingRoutes.brandOfferings(id)));
          }}
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={pending} onClick={() => startTransition(() => router.push(marketingRoutes.smartAddBrand()))}>
            Add a new brand
          </Button>
        </div>
      </div>
    </div>
  );
}

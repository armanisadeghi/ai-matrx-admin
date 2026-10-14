"use client";

import { useRouter } from "next/navigation";
import { EntityModeHeader } from "@/features/shell/components/header/templates/EntityModeHeader";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { SmartAddBrand } from "./SmartAddBrand";
import { StageBackdrop } from "./stage/StageBackdrop";
import { SmartAddEnrichFlow } from "./enrich/SmartAddEnrichFlow";
import { useSmartAddAddress } from "./useSmartAddAddress";

/** Smart Add on the main site, rendered by the /marketing/brands/smart-add layout: /company, /person,
 *  or /enrich/<brand id> (enrich that existing brand; enrich/ENRICH.md in common-docs). URLs: smartAddUrl.ts. */
export function SmartAddBrandPage() {
  const router = useRouter();
  const url = useSmartAddAddress();
  const enrichBrandId = url.address.enrichBrandId;
  return (
    <>
      <EntityModeHeader backHref={marketingRoutes.brands()} entityLabel={enrichBrandId ? "Enrich with Smart Add" : "Smart Add brand"} actions={[]} />
      {/* The living stage sits behind the scroll owner; it dims once the structured page is up. */}
      <div className="group relative h-full overflow-hidden bg-background">
        <StageBackdrop />
        <main className="relative h-full overflow-y-auto">
          {enrichBrandId ? (
            <SmartAddEnrichFlow key={enrichBrandId} brandId={enrichBrandId} onChanged={() => router.refresh()} />
          ) : url.address.mode ? (
            <SmartAddBrand onCreated={() => router.refresh()} url={url} />
          ) : null}
        </main>
      </div>
    </>
  );
}

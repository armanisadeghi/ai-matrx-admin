"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { EntityModeHeader } from "@/features/shell/components/header/templates/EntityModeHeader";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { SmartAddBrand } from "./SmartAddBrand";
import { StageBackdrop } from "./stage/StageBackdrop";
import { SmartAddEnrichFlow } from "./enrich/SmartAddEnrichFlow";

/** Smart Add on the main site: /marketing/brands/smart-add (the brands list's "Add brand" offers it first).
 *  `?enrich=<brand id>`: enrich that existing brand (enrich/ENRICH.md in common-docs). */
export function SmartAddBrandPage() {
  const router = useRouter();
  const enrichBrandId = useSearchParams().get("enrich");
  return (
    <>
      <EntityModeHeader backHref={marketingRoutes.brands()} entityLabel={enrichBrandId ? "Enrich with Smart Add" : "Smart Add brand"} actions={[]} />
      {/* The living stage sits behind the scroll owner; it dims once the structured page is up. */}
      <div className="group relative h-full overflow-hidden bg-background">
        <StageBackdrop />
        <main className="relative h-full overflow-y-auto">
          {enrichBrandId ? (
            <SmartAddEnrichFlow key={enrichBrandId} brandId={enrichBrandId} onChanged={() => router.refresh()} />
          ) : (
            <SmartAddBrand onCreated={() => router.refresh()} />
          )}
        </main>
      </div>
    </>
  );
}
